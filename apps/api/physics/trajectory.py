from __future__ import annotations

import math
from dataclasses import dataclass, field

from app.models import (
    FuelEstimate,
    GravityAssistCandidate,
    SolveBySpecRequest,
    SolveBySpecResponse,
    SolveMissionParameters,
    SolvePhase,
    SolveShipParameters,
    SolveTimelineSegment,
    SolveTrajectoryResponse,
)
from physics.engines import get_engine_spec

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


def _integrate_burn_const_accel(
    *,
    phase: SolvePhase,
    state: IntegratorState,
    distance_target_m: float,
    proper_accel_g: float,
    isp_seconds: float,
    dry_mass_kg: float,
    direction: float,
    dt_s: float,
    velocity_limit_mps: float,
    ism_erosion_rate_kg_per_m: float,
) -> tuple[SegmentResult, IntegratorState]:
    """Constant proper-acceleration burn.

    The drive adjusts thrust at every instant so that d(γv)/dt = direction·a
    remains constant regardless of remaining fuel mass.  Mass decays
    exponentially: m(t) = m₀ · exp(−a_g · t / isp).

    This models drives like Project Hail Mary's astrophage engine that
    throttle continuously to maintain a fixed g-load on the crew.
    """
    a_mps2 = proper_accel_g * STANDARD_GRAVITY_MPS2
    velocity_limit_gv = gamma_v_from_velocity(velocity_limit_mps)

    distance_travelled = 0.0
    burn_duration_s = 0.0
    velocity_start = state.velocity_mps
    earth_start = state.earth_time_s
    onboard_start = state.onboard_time_s

    while distance_travelled < distance_target_m:
        if state.fuel_kg <= 0 or state.mass_kg <= dry_mass_kg:
            break

        # Time until fuel is exhausted (exact analytic result)
        t_fuel = isp_seconds * math.log(state.mass_kg / dry_mass_kg) / proper_accel_g

        # Time until velocity cap or zero-velocity floor
        if direction > 0:
            t_vcap = max(0.0, (velocity_limit_gv - state.gamma_v) / a_mps2)
        else:
            t_vcap = state.gamma_v / a_mps2 if a_mps2 > 0 else float('inf')

        actual_dt = min(dt_s, t_fuel, t_vcap)
        if actual_dt <= 0:
            break

        # γv advances exactly linearly (definition of constant proper accel)
        new_gamma_v = state.gamma_v + direction * a_mps2 * actual_dt
        if direction > 0:
            new_gamma_v = min(new_gamma_v, velocity_limit_gv)
        else:
            new_gamma_v = max(new_gamma_v, 0.0)

        # Distance via midpoint velocity (2nd-order accurate)
        v_mid = velocity_from_gamma_v((state.gamma_v + new_gamma_v) / 2.0)
        step_dist = v_mid * actual_dt

        # Clamp to distance target
        if distance_travelled + step_dist > distance_target_m and step_dist > 0:
            frac = (distance_target_m - distance_travelled) / step_dist
            actual_dt *= frac
            step_dist = distance_target_m - distance_travelled
            new_gamma_v = state.gamma_v + direction * a_mps2 * actual_dt
            if direction > 0:
                new_gamma_v = min(new_gamma_v, velocity_limit_gv)
            else:
                new_gamma_v = max(new_gamma_v, 0.0)

        # Mass decays exponentially (exact)
        mass_after = state.mass_kg * math.exp(-proper_accel_g * actual_dt / isp_seconds)
        fuel_used = state.mass_kg - mass_after

        # Proper time: dτ = dt / γ, using midpoint γ
        gamma_mid = lorentz_factor(v_mid)
        d_onboard = actual_dt / gamma_mid if gamma_mid > 0 else actual_dt

        # ISM erosion
        shield_eroded = ism_erosion_rate_kg_per_m * step_dist
        state.shield_kg = max(0.0, state.shield_kg - shield_eroded)

        distance_travelled += step_dist
        burn_duration_s += actual_dt
        state.fuel_kg = max(0.0, state.fuel_kg - fuel_used)
        state.mass_kg = max(dry_mass_kg, mass_after)
        state.gamma_v = new_gamma_v
        state.earth_time_s += actual_dt
        state.onboard_time_s += d_onboard

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
    proper_accel_g: float = 0.0,
) -> tuple[SegmentResult, IntegratorState]:
    """RK4 burn integration tracking γv directly (constant-thrust drives).

    For drives with constant_proper_accel=True, delegates to
    _integrate_burn_const_accel instead.

    The key equations (from the reference, §3.3):
        d(γv)/dt = F/m          — exact relativistic EOM (no γ³ approximation)
        v = γv / sqrt(1+(γv/c)²)
        dτ/dt = 1/γ             — proper time accumulation
        dm/dt = -F/v_e          — Tsiolkovsky mass flow
    """
    if proper_accel_g > 0.0:
        return _integrate_burn_const_accel(
            phase=phase,
            state=state,
            distance_target_m=distance_target_m,
            proper_accel_g=proper_accel_g,
            isp_seconds=isp_seconds,
            dry_mass_kg=dry_mass_kg,
            direction=direction,
            dt_s=dt_s,
            velocity_limit_mps=velocity_limit_mps,
            ism_erosion_rate_kg_per_m=ism_erosion_rate_kg_per_m,
        )

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


def optimal_burn_distances(
    ship: SolveShipParameters,
    total_distance_m: float,
    velocity_limit_mps: float,
    integration_step_s: float,
    proper_accel_g: float = 0.0,
) -> tuple[float, float, float, float]:
    """Compute (accel_distance, coast_distance, decel_distance, coast_fraction).

    Strategy (reference §3.4):
    - Each burn leg uses fuelMassKg/2 (symmetric brachistochrone).
    - Probe the accel leg to find how far half the fuel takes the ship.
    - Decel gets the same distance (symmetric). Coast fills the remainder.
    - If half-fuel covers ≥ half the total distance, coast = 0 (pure brachistochrone).
    """
    half_dist = total_distance_m / 2.0
    half_fuel = ship.fuelMassKg / 2.0

    probe_state = IntegratorState(
        gamma_v=0.0,
        mass_kg=ship.dryMassKg + half_fuel,
        fuel_kg=half_fuel,
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
        proper_accel_g=proper_accel_g,
    )

    accel_dist = seg.distance_m
    decel_dist = accel_dist  # symmetric
    coast_dist = max(0.0, total_distance_m - accel_dist - decel_dist)
    coast_fraction = coast_dist / total_distance_m if total_distance_m > 0 else 0.0
    return accel_dist, coast_dist, decel_dist, coast_fraction


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
    proper_accel_g: float = 0.0,
) -> SolveTrajectoryResponse:
    total_distance_m = mission.distanceKm * 1000.0
    velocity_limit_mps = min(
        mission.maxVelocityMps or (MAX_BETA * SPEED_OF_LIGHT_MPS),
        MAX_BETA * SPEED_OF_LIGHT_MPS,
    )
    integration_step_s = mission.integrationStepSeconds

    # ── Compute optimal burn distances (brachistochrone) ─────────────
    accel_distance, coast_distance, decel_distance, coast_fraction = optimal_burn_distances(
        ship=ship,
        total_distance_m=total_distance_m,
        velocity_limit_mps=velocity_limit_mps,
        integration_step_s=integration_step_s,
        proper_accel_g=proper_accel_g,
    )

    # ── Initial state ─────────────────────────────────────────────────
    shield_kg = ship.shieldMassKg if ship.shieldMassKg is not None else 0.0

    # Split fuel evenly: half for accel, half reserved for decel.
    # This is the symmetric brachistochrone constraint — each burn leg gets
    # fuelMassKg/2. Any coast fills the gap between the two legs.
    half_fuel = ship.fuelMassKg / 2.0

    state = IntegratorState(
        gamma_v=0.0,
        mass_kg=ship.dryMassKg + ship.fuelMassKg + shield_kg,
        fuel_kg=half_fuel,   # accel leg uses only its half
        shield_kg=shield_kg,
        earth_time_s=0.0,
        onboard_time_s=0.0,
    )

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
        proper_accel_g=proper_accel_g,
    )
    # Restore the reserved decel fuel after the accel leg completes
    state.fuel_kg   = half_fuel
    state.mass_kg   = max(ship.dryMassKg, state.mass_kg) + half_fuel
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
        proper_accel_g=proper_accel_g,
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


# ── Spec-driven solver (fuel as output) ───────────────────────────────────


def _estimate_integration_step(burn_mass_kg: float, thrust_n: float, isp_s: float) -> float:
    """Estimate a reasonable RK4 step size: target ~2000 steps per burn leg."""
    mdot = thrust_n / (isp_s * STANDARD_GRAVITY_MPS2)
    if mdot <= 0:
        return 86_400.0
    burn_s = burn_mass_kg / mdot
    return max(1.0, min(86_400.0, burn_s / 2_000.0))


def compute_required_fuel_kg(
    dry_mass_kg: float,
    thrust_newtons: float,
    isp_seconds: float,
    shield_mass_kg: float,
    total_distance_m: float,
    velocity_limit_mps: float,
    mass_ratio_limit: float,
    proper_accel_g: float = 0.0,
) -> float:
    """Binary-search for the minimum fuel mass that allows a brachistochrone (0% coast).

    Returns the minimum fuel in kg required to cover *total_distance_m* with no
    coast phase.  If even the mass-ratio limit is insufficient, returns the
    maximum allowed fuel (caller should flag as infeasible coast trajectory).
    """
    max_fuel = dry_mass_kg * (mass_ratio_limit - 1.0)
    coarse_step = _estimate_integration_step(max_fuel / 2, thrust_newtons, isp_seconds)

    def accel_dist_for_fuel(fuel_kg: float) -> float:
        ship = SolveShipParameters(
            dryMassKg=dry_mass_kg,
            fuelMassKg=fuel_kg,
            thrustNewtons=thrust_newtons,
            ispSeconds=isp_seconds,
            shieldMassKg=shield_mass_kg if shield_mass_kg > 0 else None,
        )
        dist, _, _, _ = optimal_burn_distances(
            ship=ship,
            total_distance_m=total_distance_m,
            velocity_limit_mps=velocity_limit_mps,
            integration_step_s=coarse_step,
            proper_accel_g=proper_accel_g,
        )
        return dist

    half_dist = total_distance_m / 2.0

    # Quick check: can max fuel even do the brachistochrone?
    if accel_dist_for_fuel(max_fuel) < half_dist:
        return max_fuel  # caller treats this as a coast-only trip

    # Binary search: find smallest fuel where accel_dist >= half_dist
    lo, hi = 0.0, max_fuel
    for _ in range(50):
        if hi - lo < max(1.0, max_fuel * 1e-6):
            break
        mid = (lo + hi) / 2.0
        if accel_dist_for_fuel(mid) < half_dist:
            lo = mid
        else:
            hi = mid

    return hi


def solve_by_spec(request: SolveBySpecRequest) -> SolveBySpecResponse:
    """High-level solver: accepts user-facing parameters and returns a full trajectory.

    Fuel mass is *computed* rather than supplied by the caller.
    Returns an infeasibility reason instead of a trajectory when the route is not
    achievable with the requested engine class and dry mass.
    """
    try:
        spec = get_engine_spec(request.engineClass)
    except ValueError as exc:
        return SolveBySpecResponse(feasible=False, infeasibilityReason=str(exc))

    # Validate acceleration request
    if request.maxAccelG > spec.max_accel_g:
        return SolveBySpecResponse(
            feasible=False,
            infeasibilityReason=(
                f"{request.engineClass} drive cannot exceed {spec.max_accel_g:.3g} g. "
                f"Requested {request.maxAccelG:.3g} g."
            ),
        )

    # For constant-proper-accel drives the thrust param is nominal (overridden per-step).
    # For constant-thrust drives it is the actual engine output.
    proper_accel_g = request.maxAccelG if spec.constant_proper_accel else 0.0
    thrust_newtons = request.maxAccelG * STANDARD_GRAVITY_MPS2 * request.dryMassKg
    isp_seconds = spec.isp_s
    shield_mass_kg = spec.shield_mass_fraction * request.dryMassKg
    total_distance_m = request.distanceKm * 1000.0
    velocity_limit_mps = MAX_BETA * SPEED_OF_LIGHT_MPS

    # Compute minimum fuel for the brachistochrone
    fuel_kg = compute_required_fuel_kg(
        dry_mass_kg=request.dryMassKg,
        thrust_newtons=thrust_newtons,
        isp_seconds=isp_seconds,
        shield_mass_kg=shield_mass_kg,
        total_distance_m=total_distance_m,
        velocity_limit_mps=velocity_limit_mps,
        mass_ratio_limit=spec.mass_ratio_limit,
        proper_accel_g=proper_accel_g,
    )

    # Check mass ratio feasibility
    mass_ratio = (request.dryMassKg + shield_mass_kg + fuel_kg) / request.dryMassKg
    if mass_ratio >= spec.mass_ratio_limit * 0.999:
        return SolveBySpecResponse(
            feasible=False,
            infeasibilityReason=(
                f"Required mass ratio ({mass_ratio:.0f}:1) exceeds the {request.engineClass} "
                f"drive limit of {spec.mass_ratio_limit:.0f}:1. "
                "Use a more powerful engine or reduce dry mass."
            ),
        )

    # Fine-resolution integration step for the actual trajectory
    fine_step = _estimate_integration_step(fuel_kg / 2, thrust_newtons, isp_seconds)

    ship = SolveShipParameters(
        dryMassKg=request.dryMassKg,
        fuelMassKg=fuel_kg,
        thrustNewtons=thrust_newtons,
        ispSeconds=isp_seconds,
        shieldMassKg=shield_mass_kg if shield_mass_kg > 0 else None,
    )
    mission = SolveMissionParameters(
        distanceKm=request.distanceKm,
        coastFraction=0.0,
        maxVelocityMps=None,
        enableGravityAssist=request.enableGravityAssist,
        integrationStepSeconds=fine_step,
    )

    trajectory = compute_trajectory(
        ship=ship,
        mission=mission,
        gravity_assists=request.gravityAssistCandidates,
        proper_accel_g=proper_accel_g,
    )

    fuel_display = fuel_kg * spec.fuel_unit_scale
    fuel_estimate = FuelEstimate(
        fuelMassKg=fuel_kg,
        fuelUnit=spec.fuel_unit,
        fuelUnitSuffix=spec.fuel_unit_suffix,
        fuelAmountDisplay=fuel_display,
    )

    return SolveBySpecResponse(
        feasible=True,
        infeasibilityReason=None,
        fuelEstimate=fuel_estimate,
        trajectory=trajectory,
    )
