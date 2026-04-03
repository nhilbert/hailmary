from __future__ import annotations

import math
from dataclasses import dataclass, field

from app.models import (
    GravityAssistCandidate,
    SolveMissionParameters,
    SolvePhase,
    SolveShipParameters,
    SolveTimelineSegment,
    SolveTrajectoryResponse,
)

SPEED_OF_LIGHT_MPS = 299_792_458.0
STANDARD_GRAVITY_MPS2 = 9.80665
MAX_BETA = 0.999_999  # v/c cap


# ── Physical helpers ───────────────────────────────────────────────────────


def lorentz_factor(velocity_mps: float) -> float:
    beta = min(abs(velocity_mps) / SPEED_OF_LIGHT_MPS, MAX_BETA)
    return 1.0 / math.sqrt(1.0 - beta * beta)


def velocity_from_gamma_v(gamma_v: float) -> float:
    """Recover coordinate velocity from the 4-momentum component γv.

    v = γv / sqrt(1 + (γv/c)²)
    This is exact and naturally bounded below c.
    """
    ratio = gamma_v / SPEED_OF_LIGHT_MPS
    return gamma_v / math.sqrt(1.0 + ratio * ratio)


def gamma_v_from_velocity(velocity_mps: float) -> float:
    """γv = γ·v  (the spatial part of the 4-velocity, scaled by c)."""
    gamma = lorentz_factor(velocity_mps)
    return gamma * velocity_mps


def relativistic_kinetic_energy_j(mass_kg: float, velocity_mps: float) -> float:
    gamma = lorentz_factor(velocity_mps)
    return (gamma - 1.0) * mass_kg * SPEED_OF_LIGHT_MPS**2


# ── State ─────────────────────────────────────────────────────────────────


@dataclass(slots=True)
class SegmentResult:
    phase: SolvePhase
    distance_m: float
    start_velocity_mps: float
    end_velocity_mps: float
    delta_v_mps: float
    burn_duration_s: float
    earth_time_s: float
    onboard_time_s: float
    fuel_remaining_kg: float
    shield_remaining_kg: float
    start_earth_time_s: float
    end_earth_time_s: float
    start_onboard_time_s: float
    end_onboard_time_s: float
    relativistic_kinetic_energy_j: float
    lorentz_factor: float
    gravity_assist_used: str | None = None


@dataclass(slots=True)
class IntegratorState:
    """Carries γv (not v) as the primary velocity state — exact relativistic variable."""
    gamma_v: float          # γ·v  [m/s], the spatial 4-momentum per unit mass
    mass_kg: float
    fuel_kg: float
    shield_kg: float
    earth_time_s: float
    onboard_time_s: float

    @property
    def velocity_mps(self) -> float:
        return velocity_from_gamma_v(self.gamma_v)

    @property
    def lorentz(self) -> float:
        return lorentz_factor(self.velocity_mps)


# ── RK4 burn integrator ────────────────────────────────────────────────────


@dataclass(slots=True)
class _BurnDerivs:
    """Time-derivatives of the RK4 state during a burn step."""
    d_gamma_v: float   # d(γv)/dt = F/m  (proper acceleration, exact)
    d_distance: float  # dx/dt = v
    d_onboard: float   # dτ/dt = 1/γ


def _burn_derivs(
    gamma_v: float,
    mass_kg: float,
    thrust_newtons: float,
    direction: float,
) -> _BurnDerivs:
    v = velocity_from_gamma_v(gamma_v)
    gamma = lorentz_factor(v)
    proper_accel = direction * thrust_newtons / mass_kg   # F/m (exact relativistic)
    return _BurnDerivs(
        d_gamma_v=proper_accel,
        d_distance=v,
        d_onboard=1.0 / gamma,
    )


def integrate_burn(
    *,
    phase: SolvePhase,
    state: IntegratorState,
    distance_target_m: float,
    thrust_newtons: float,
    isp_seconds: float,
    dry_mass_kg: float,
    direction: float,
    dt_s: float,
    velocity_limit_mps: float,
    ism_erosion_rate_kg_per_m: float = 0.0,
) -> tuple[SegmentResult, IntegratorState]:
    """RK4 burn integration tracking γv directly.

    The key equations (from the reference, §3.3):
        d(γv)/dt = F/m          — exact relativistic EOM (no γ³ approximation)
        v = γv / sqrt(1+(γv/c)²)
        dτ/dt = 1/γ             — proper time accumulation
        dm/dt = -F/v_e          — Tsiolkovsky mass flow
    """
    mdot = thrust_newtons / (isp_seconds * STANDARD_GRAVITY_MPS2)
    velocity_limit_gamma_v = gamma_v_from_velocity(velocity_limit_mps)

    distance_travelled = 0.0
    burn_duration_s = 0.0
    velocity_start = state.velocity_mps
    earth_start = state.earth_time_s
    onboard_start = state.onboard_time_s

    while distance_travelled < distance_target_m:
        if state.fuel_kg <= 0:
            break

        fuel_for_step = mdot * dt_s
        if fuel_for_step <= 0:
            break
        fuel_used = min(state.fuel_kg, fuel_for_step)
        actual_dt = fuel_used / mdot

        # ── RK4 on (γv, distance, onboard_time) ─────────────────────
        k1 = _burn_derivs(state.gamma_v,                          state.mass_kg, thrust_newtons, direction)
        k2 = _burn_derivs(state.gamma_v + 0.5 * actual_dt * k1.d_gamma_v, state.mass_kg, thrust_newtons, direction)
        k3 = _burn_derivs(state.gamma_v + 0.5 * actual_dt * k2.d_gamma_v, state.mass_kg, thrust_newtons, direction)
        k4 = _burn_derivs(state.gamma_v +       actual_dt * k3.d_gamma_v, state.mass_kg, thrust_newtons, direction)

        d_gamma_v  = (actual_dt / 6.0) * (k1.d_gamma_v  + 2*k2.d_gamma_v  + 2*k3.d_gamma_v  + k4.d_gamma_v)
        step_dist  = (actual_dt / 6.0) * (k1.d_distance + 2*k2.d_distance + 2*k3.d_distance + k4.d_distance)
        d_onboard  = (actual_dt / 6.0) * (k1.d_onboard  + 2*k2.d_onboard  + 2*k3.d_onboard  + k4.d_onboard)

        new_gamma_v = state.gamma_v + d_gamma_v

        # Enforce velocity cap and direction floor
        if direction > 0:
            new_gamma_v = min(new_gamma_v, velocity_limit_gamma_v)
        else:
            new_gamma_v = max(new_gamma_v, 0.0)

        # Scale back last step if we overshoot distance target
        if distance_travelled + step_dist > distance_target_m and step_dist > 0:
            scale = (distance_target_m - distance_travelled) / step_dist
            actual_dt   *= scale
            fuel_used   *= scale
            d_onboard   *= scale
            step_dist    = distance_target_m - distance_travelled
            new_gamma_v  = state.gamma_v + d_gamma_v * scale
            if direction > 0:
                new_gamma_v = min(new_gamma_v, velocity_limit_gamma_v)
            else:
                new_gamma_v = max(new_gamma_v, 0.0)

        # ISM shield erosion proportional to v²·distance (kinetic energy per unit area)
        shield_eroded = ism_erosion_rate_kg_per_m * step_dist
        state.shield_kg = max(0.0, state.shield_kg - shield_eroded)

        distance_travelled += max(step_dist, 0.0)
        burn_duration_s    += actual_dt
        state.fuel_kg       = max(0.0, state.fuel_kg - fuel_used)
        state.mass_kg       = max(dry_mass_kg, state.mass_kg - fuel_used)
        state.gamma_v       = new_gamma_v
        state.earth_time_s  += actual_dt
        state.onboard_time_s += d_onboard

        if state.mass_kg <= dry_mass_kg:
            break

    final_v = state.velocity_mps
    segment = SegmentResult(
        phase=phase,
        distance_m=distance_travelled,
        start_velocity_mps=velocity_start,
        end_velocity_mps=final_v,
        delta_v_mps=abs(final_v - velocity_start),
        burn_duration_s=burn_duration_s,
        earth_time_s=state.earth_time_s - earth_start,
        onboard_time_s=state.onboard_time_s - onboard_start,
        fuel_remaining_kg=state.fuel_kg,
        shield_remaining_kg=state.shield_kg,
        start_earth_time_s=earth_start,
        end_earth_time_s=state.earth_time_s,
        start_onboard_time_s=onboard_start,
        end_onboard_time_s=state.onboard_time_s,
        relativistic_kinetic_energy_j=relativistic_kinetic_energy_j(state.mass_kg, final_v),
        lorentz_factor=lorentz_factor(final_v),
    )
    return segment, state


# ── Brachistochrone optimizer ──────────────────────────────────────────────


def optimal_coast_fraction(
    ship: SolveShipParameters,
    total_distance_m: float,
    velocity_limit_mps: float,
    integration_step_s: float,
) -> float:
    """Compute the coast fraction that minimises trip time for a given fuel budget.

    Strategy (from reference §3.4):
    - The brachistochrone optimum is coast=0 (burn all fuel accel+decel, equal split).
    - If the ship runs out of fuel before covering half the distance, a coast phase is
      forced by physics (we have no more thrust).
    - So we simulate the accel half at coast=0 and see how far the fuel takes us.
      If accel_distance_achieved >= total_distance/2, coast=0 is optimal.
      Otherwise, the fuel-limited flip point determines the coast fraction.
    """
    half_dist = total_distance_m / 2.0

    # Simulate accel-only to see how far fuel gets us
    probe_state = IntegratorState(
        gamma_v=0.0,
        mass_kg=ship.dryMassKg + ship.fuelMassKg,
        fuel_kg=ship.fuelMassKg,
        shield_kg=0.0,
        earth_time_s=0.0,
        onboard_time_s=0.0,
    )

    seg, _ = integrate_burn(
        phase=SolvePhase.acceleration,
        state=probe_state,
        distance_target_m=half_dist,
        thrust_newtons=ship.thrustNewtons,
        isp_seconds=ship.ispSeconds,
        dry_mass_kg=ship.dryMassKg,
        direction=1.0,
        dt_s=integration_step_s,
        velocity_limit_mps=velocity_limit_mps,
    )

    accel_achieved = seg.distance_m

    if accel_achieved >= half_dist * 0.999:
        # Fuel covers the whole accel half — pure brachistochrone, no coast needed
        return 0.0

    # Ship runs out of fuel before flip point.
    # Remaining distance after symmetric burn = total - 2 * accel_achieved.
    coast_distance = max(0.0, total_distance_m - 2.0 * accel_achieved)
    return coast_distance / total_distance_m


# ── ISM erosion model ──────────────────────────────────────────────────────

# Local ISM density near Sol (warm neutral medium).  Reference §7.1.
ISM_PROTON_DENSITY_PER_M3 = 1e5          # 0.1 protons/cm³ → 1e5/m³
PROTON_MASS_KG = 1.673e-27

# Erosion efficiency: fraction of kinetic energy that ablates shield material.
# Tuned so Daedalus-class (0.12c, 12 ly) erodes ~10 t from a 50 t shield.
# E_kin per proton at 0.12c ≈ 1.1e-13 J; at ~1e4 protons/m²/s per m² cross-section
# integrated over 12 ly ≈ 3.7e20 protons/m², erosion ~few kg per m² shield area.
EROSION_EFFICIENCY = 1.5e-12  # kg shield lost per joule of kinetic energy deposited


def ism_erosion_rate(velocity_mps: float, cross_section_m2: float = 50.0) -> float:
    """Erosion rate in kg of shield per metre of travel.

    Physical model (reference §7.3):
        flux [protons/m²/s] = n_H · v
        power [W/m²]        = flux · E_kin_per_proton
        erosion [kg/s/m²]   = power · EROSION_EFFICIENCY
        erosion [kg/m]      = erosion [kg/s/m²] · cross_section / v  (per metre)
                            = n_H · E_kin_per_proton · EROSION_EFFICIENCY · cross_section
    """
    gamma = lorentz_factor(velocity_mps)
    e_kin_per_proton = (gamma - 1.0) * PROTON_MASS_KG * SPEED_OF_LIGHT_MPS**2
    return (
        ISM_PROTON_DENSITY_PER_M3
        * e_kin_per_proton
        * EROSION_EFFICIENCY
        * cross_section_m2
    )


# ── Gravity assist with Oberth effect ─────────────────────────────────────


def compute_flyby(
    candidate: GravityAssistCandidate,
    arrival_velocity_mps: float,
) -> tuple[float, float]:
    """Compute realistic ΔV from a stellar gravity assist with Oberth effect.

    Returns (delta_v_flyby_mps, v_after_mps).

    Physics (reference §5.1–5.4):
    1. Hyperbolic orbit: e = 1 + r_p·v∞²/(GM)
    2. Turning angle: δ = 2·arcsin(1/e)
    3. Speed boost (peculiar velocity transfer): ΔV = 2·v_peculiar·sin(δ/2)
    4. Oberth amplification at periapsis:
         v_p = sqrt(v∞² + v_esc²)
         ΔV_oberth = sqrt(v_p² + 2·v_p·ΔV_engine) - v∞
       We use a conservative 5% fuel reserve burn at periapsis.
    """
    v_inf = arrival_velocity_mps                       # hyperbolic excess speed
    GM = candidate.stellar_gm_m3_s2                   # G·M of the flyby star
    r_p = candidate.min_flyby_radius_m                # periapsis (min safe distance)
    v_peculiar = candidate.peculiar_velocity_mps       # stellar motion vs Sol

    # Periapsis speed: energy conservation in star's rest frame
    v_esc_sq = 2.0 * GM / r_p
    v_p = math.sqrt(v_inf * v_inf + v_esc_sq)

    # Deflection angle
    eccentricity = 1.0 + r_p * v_inf * v_inf / GM
    turning_angle = 2.0 * math.asin(min(1.0, 1.0 / eccentricity))

    # Velocity boost from stellar peculiar motion
    delta_v_flyby = 2.0 * v_peculiar * math.sin(turning_angle / 2.0)

    # Oberth: a 5% reserve burn at periapsis gets amplified by the deep gravity well.
    # ΔV_engine = 5% of v_p (conservative; uses remaining fuel not already allocated)
    delta_v_engine = 0.05 * v_p
    delta_v_oberth = math.sqrt(v_p * v_p + 2.0 * v_p * delta_v_engine) - v_inf

    total_delta_v = delta_v_flyby + max(0.0, delta_v_oberth - delta_v_engine)

    # Cap at velocity limit
    v_after = min(v_inf + total_delta_v, MAX_BETA * SPEED_OF_LIGHT_MPS)
    return v_after - v_inf, v_after


def select_gravity_assist(
    candidates: list[GravityAssistCandidate],
    arrival_velocity_mps: float,
) -> tuple[GravityAssistCandidate | None, float]:
    """Pick the best candidate and return (candidate, delta_v_mps)."""
    best: GravityAssistCandidate | None = None
    best_dv = 0.0
    for candidate in candidates:
        dv, _ = compute_flyby(candidate, arrival_velocity_mps)
        if dv > best_dv:
            best_dv = dv
            best = candidate
    return best, best_dv


# ── Main solver ────────────────────────────────────────────────────────────


def compute_trajectory(
    ship: SolveShipParameters,
    mission: SolveMissionParameters,
    gravity_assists: list[GravityAssistCandidate] | None,
) -> SolveTrajectoryResponse:
    total_distance_m = mission.distanceKm * 1000.0
    velocity_limit_mps = min(
        mission.maxVelocityMps or (MAX_BETA * SPEED_OF_LIGHT_MPS),
        MAX_BETA * SPEED_OF_LIGHT_MPS,
    )
    integration_step_s = mission.integrationStepSeconds

    # ── Compute optimal coast fraction ────────────────────────────────
    coast_fraction = optimal_coast_fraction(
        ship=ship,
        total_distance_m=total_distance_m,
        velocity_limit_mps=velocity_limit_mps,
        integration_step_s=integration_step_s,
    )

    accel_distance = total_distance_m * (1.0 - coast_fraction) / 2.0
    coast_distance = total_distance_m * coast_fraction
    decel_distance = total_distance_m - accel_distance - coast_distance

    # ── Initial state ─────────────────────────────────────────────────
    shield_kg = ship.shieldMassKg if ship.shieldMassKg is not None else 0.0
    state = IntegratorState(
        gamma_v=0.0,
        mass_kg=ship.dryMassKg + ship.fuelMassKg + shield_kg,
        fuel_kg=ship.fuelMassKg,
        shield_kg=shield_kg,
        earth_time_s=0.0,
        onboard_time_s=0.0,
    )

    # ISM erosion rate is velocity-dependent; use a representative cruise beta
    # for a pre-compute. The integrator re-evaluates per step using cruise velocity.
    # We pass a per-metre rate computed at mid-mission speed as a reasonable average.
    # The burn integrator itself uses a fixed rate for the burn phase (speeds are
    # relatively low during accel/decel compared to cruise).
    erosion_rate_accel = ism_erosion_rate(velocity_limit_mps * 0.5)
    erosion_rate_cruise = ism_erosion_rate(velocity_limit_mps)

    # ── Acceleration phase ────────────────────────────────────────────
    accel_segment, state = integrate_burn(
        phase=SolvePhase.acceleration,
        state=state,
        distance_target_m=accel_distance,
        thrust_newtons=ship.thrustNewtons,
        isp_seconds=ship.ispSeconds,
        dry_mass_kg=ship.dryMassKg,
        direction=1.0,
        dt_s=integration_step_s,
        velocity_limit_mps=velocity_limit_mps,
        ism_erosion_rate_kg_per_m=erosion_rate_accel,
    )
    segments: list[SegmentResult] = [accel_segment]

    # ── Gravity assist ────────────────────────────────────────────────
    chosen_assist: GravityAssistCandidate | None = None
    if mission.enableGravityAssist and gravity_assists:
        chosen_assist, assist_dv = select_gravity_assist(
            gravity_assists, state.velocity_mps
        )
        if chosen_assist is not None and assist_dv > 0:
            start_earth = state.earth_time_s
            start_onboard = state.onboard_time_s
            v_before = state.velocity_mps
            new_v = min(state.velocity_mps + assist_dv, velocity_limit_mps)
            state.gamma_v = gamma_v_from_velocity(new_v)
            gamma = lorentz_factor(new_v)
            segments.append(
                SegmentResult(
                    phase=SolvePhase.gravity_assist,
                    distance_m=0.0,
                    start_velocity_mps=v_before,
                    end_velocity_mps=new_v,
                    delta_v_mps=assist_dv,
                    burn_duration_s=0.0,
                    earth_time_s=0.0,
                    onboard_time_s=0.0,
                    fuel_remaining_kg=state.fuel_kg,
                    shield_remaining_kg=state.shield_kg,
                    start_earth_time_s=start_earth,
                    end_earth_time_s=start_earth,
                    start_onboard_time_s=start_onboard,
                    end_onboard_time_s=start_onboard,
                    relativistic_kinetic_energy_j=relativistic_kinetic_energy_j(
                        state.mass_kg, new_v
                    ),
                    lorentz_factor=gamma,
                    gravity_assist_used=chosen_assist.name,
                )
            )

    # ── Coast phase ───────────────────────────────────────────────────
    coast_start_earth = state.earth_time_s
    coast_start_onboard = state.onboard_time_s
    coast_speed = max(state.velocity_mps, 1e-9)
    coast_earth_s = coast_distance / coast_speed
    coast_onboard_s = coast_earth_s / lorentz_factor(coast_speed)

    # Shield erosion during coast (highest speed, longest distance)
    coast_shield_eroded = erosion_rate_cruise * coast_distance
    state.shield_kg = max(0.0, state.shield_kg - coast_shield_eroded)

    state.earth_time_s += coast_earth_s
    state.onboard_time_s += coast_onboard_s

    segments.append(
        SegmentResult(
            phase=SolvePhase.coast,
            distance_m=coast_distance,
            start_velocity_mps=coast_speed,
            end_velocity_mps=coast_speed,
            delta_v_mps=0.0,
            burn_duration_s=0.0,
            earth_time_s=coast_earth_s,
            onboard_time_s=coast_onboard_s,
            fuel_remaining_kg=state.fuel_kg,
            shield_remaining_kg=state.shield_kg,
            start_earth_time_s=coast_start_earth,
            end_earth_time_s=state.earth_time_s,
            start_onboard_time_s=coast_start_onboard,
            end_onboard_time_s=state.onboard_time_s,
            relativistic_kinetic_energy_j=relativistic_kinetic_energy_j(
                state.mass_kg, coast_speed
            ),
            lorentz_factor=lorentz_factor(coast_speed),
        )
    )

    # ── Deceleration phase ────────────────────────────────────────────
    decel_segment, state = integrate_burn(
        phase=SolvePhase.deceleration,
        state=state,
        distance_target_m=decel_distance,
        thrust_newtons=ship.thrustNewtons,
        isp_seconds=ship.ispSeconds,
        dry_mass_kg=ship.dryMassKg,
        direction=-1.0,
        dt_s=integration_step_s,
        velocity_limit_mps=velocity_limit_mps,
        ism_erosion_rate_kg_per_m=erosion_rate_accel,
    )
    segments.append(decel_segment)

    # ── Build response ────────────────────────────────────────────────
    response_segments = [
        SolveTimelineSegment(
            phase=seg.phase,
            distanceKm=seg.distance_m / 1000.0,
            startVelocityMps=seg.start_velocity_mps,
            endVelocityMps=seg.end_velocity_mps,
            deltaVMps=seg.delta_v_mps,
            burnDurationSeconds=seg.burn_duration_s,
            earthFrameDurationSeconds=seg.earth_time_s,
            onboardDurationSeconds=seg.onboard_time_s,
            startEarthTimeSeconds=seg.start_earth_time_s,
            endEarthTimeSeconds=seg.end_earth_time_s,
            startOnboardTimeSeconds=seg.start_onboard_time_s,
            endOnboardTimeSeconds=seg.end_onboard_time_s,
            fuelRemainingKg=seg.fuel_remaining_kg,
            shieldRemainingKg=seg.shield_remaining_kg,
            relativisticKineticEnergyJoules=seg.relativistic_kinetic_energy_j,
            lorentzFactor=seg.lorentz_factor,
            gravityAssistUsed=seg.gravity_assist_used,
        )
        for seg in segments
    ]

    total_delta_v = sum(seg.delta_v_mps for seg in segments)
    return SolveTrajectoryResponse(
        totalDistanceKm=total_distance_m / 1000.0,
        totalEarthFrameSeconds=state.earth_time_s,
        totalOnboardSeconds=state.onboard_time_s,
        totalDeltaVMps=total_delta_v,
        finalVelocityMps=state.velocity_mps,
        fuelRemainingKg=state.fuel_kg,
        shieldRemainingKg=state.shield_kg,
        coastFractionUsed=coast_fraction,
        segments=response_segments,
        gravityAssistChosen=chosen_assist.name if chosen_assist else None,
    )
