from __future__ import annotations

import math
from dataclasses import dataclass

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
MAX_RELATIVE_SPEED = SPEED_OF_LIGHT_MPS * 0.999999


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
    start_earth_time_s: float
    end_earth_time_s: float
    start_onboard_time_s: float
    end_onboard_time_s: float
    relativistic_kinetic_energy_j: float
    lorentz_factor: float
    gravity_assist_used: str | None = None


@dataclass(slots=True)
class IntegratorState:
    velocity_mps: float
    mass_kg: float
    fuel_kg: float
    earth_time_s: float
    onboard_time_s: float


def lorentz_factor(velocity_mps: float) -> float:
    ratio = min(abs(velocity_mps) / SPEED_OF_LIGHT_MPS, 0.999999999999)
    return 1.0 / math.sqrt(1.0 - ratio * ratio)


def relativistic_kinetic_energy_j(mass_kg: float, velocity_mps: float) -> float:
    gamma = lorentz_factor(velocity_mps)
    return (gamma - 1.0) * mass_kg * SPEED_OF_LIGHT_MPS**2


def select_gravity_assist(
    candidates: list[GravityAssistCandidate],
) -> GravityAssistCandidate | None:
    viable = [candidate for candidate in candidates if candidate.deltaVBonusMps > 0]
    if not viable:
        return None
    return max(viable, key=lambda candidate: candidate.deltaVBonusMps)


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
) -> tuple[SegmentResult, IntegratorState]:
    distance_travelled = 0.0
    burn_duration_s = 0.0
    velocity_start = state.velocity_mps
    earth_start = state.earth_time_s
    onboard_start = state.onboard_time_s

    while distance_travelled < distance_target_m:
        if state.fuel_kg <= 0:
            break

        mdot = thrust_newtons / (isp_seconds * STANDARD_GRAVITY_MPS2)
        max_fuel_for_step = mdot * dt_s
        if max_fuel_for_step <= 0:
            break

        fuel_used = min(state.fuel_kg, max_fuel_for_step)
        step_duration = fuel_used / mdot

        gamma = lorentz_factor(state.velocity_mps)
        accel_mps2 = (thrust_newtons / state.mass_kg) / (gamma**3)
        velocity_next = state.velocity_mps + (direction * accel_mps2 * step_duration)

        if direction > 0:
            velocity_next = min(velocity_next, velocity_limit_mps)
        else:
            velocity_next = max(velocity_next, 0.0)

        avg_velocity = (state.velocity_mps + velocity_next) / 2.0
        step_distance = avg_velocity * step_duration

        if distance_travelled + step_distance > distance_target_m and avg_velocity > 0:
            remaining_distance = distance_target_m - distance_travelled
            scale = remaining_distance / step_distance
            step_duration *= scale
            fuel_used *= scale
            velocity_next = state.velocity_mps + (direction * accel_mps2 * step_duration)
            if direction > 0:
                velocity_next = min(velocity_next, velocity_limit_mps)
            else:
                velocity_next = max(velocity_next, 0.0)
            step_distance = remaining_distance

        distance_travelled += max(step_distance, 0.0)
        burn_duration_s += step_duration

        state.fuel_kg -= fuel_used
        state.mass_kg = max(dry_mass_kg, state.mass_kg - fuel_used)
        state.velocity_mps = velocity_next
        state.earth_time_s += step_duration
        state.onboard_time_s += step_duration / lorentz_factor(state.velocity_mps)

        if state.mass_kg <= dry_mass_kg and state.fuel_kg <= 0:
            break

    gamma_end = lorentz_factor(state.velocity_mps)
    segment = SegmentResult(
        phase=phase,
        distance_m=distance_travelled,
        start_velocity_mps=velocity_start,
        end_velocity_mps=state.velocity_mps,
        delta_v_mps=abs(state.velocity_mps - velocity_start),
        burn_duration_s=burn_duration_s,
        earth_time_s=state.earth_time_s - earth_start,
        onboard_time_s=state.onboard_time_s - onboard_start,
        fuel_remaining_kg=state.fuel_kg,
        start_earth_time_s=earth_start,
        end_earth_time_s=state.earth_time_s,
        start_onboard_time_s=onboard_start,
        end_onboard_time_s=state.onboard_time_s,
        relativistic_kinetic_energy_j=relativistic_kinetic_energy_j(
            state.mass_kg, state.velocity_mps
        ),
        lorentz_factor=gamma_end,
    )
    return segment, state


def compute_trajectory(
    ship: SolveShipParameters,
    mission: SolveMissionParameters,
    gravity_assists: list[GravityAssistCandidate] | None,
) -> SolveTrajectoryResponse:
    total_distance_m = mission.distanceKm * 1000.0
    accel_distance = total_distance_m * (1.0 - mission.coastFraction) / 2.0
    coast_distance = total_distance_m * mission.coastFraction
    decel_distance = total_distance_m - accel_distance - coast_distance

    chosen_assist = None
    boost_dv_mps = 0.0
    if mission.enableGravityAssist and gravity_assists:
        chosen_assist = select_gravity_assist(gravity_assists)
        boost_dv_mps = chosen_assist.deltaVBonusMps if chosen_assist else 0.0

    state = IntegratorState(
        velocity_mps=0.0,
        mass_kg=ship.dryMassKg + ship.fuelMassKg,
        fuel_kg=ship.fuelMassKg,
        earth_time_s=0.0,
        onboard_time_s=0.0,
    )

    velocity_limit_mps = min(mission.maxVelocityMps or MAX_RELATIVE_SPEED, MAX_RELATIVE_SPEED)
    integration_step_s = mission.integrationStepSeconds

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
    )

    segments: list[SegmentResult] = [accel_segment]

    if boost_dv_mps > 0:
        start_earth = state.earth_time_s
        start_onboard = state.onboard_time_s
        state.velocity_mps = min(state.velocity_mps + boost_dv_mps, velocity_limit_mps)
        gamma = lorentz_factor(state.velocity_mps)
        segments.append(
            SegmentResult(
                phase=SolvePhase.gravity_assist,
                distance_m=0.0,
                start_velocity_mps=max(0.0, state.velocity_mps - boost_dv_mps),
                end_velocity_mps=state.velocity_mps,
                delta_v_mps=boost_dv_mps,
                burn_duration_s=0.0,
                earth_time_s=0.0,
                onboard_time_s=0.0,
                fuel_remaining_kg=state.fuel_kg,
                start_earth_time_s=start_earth,
                end_earth_time_s=start_earth,
                start_onboard_time_s=start_onboard,
                end_onboard_time_s=start_onboard,
                relativistic_kinetic_energy_j=relativistic_kinetic_energy_j(
                    state.mass_kg, state.velocity_mps
                ),
                lorentz_factor=gamma,
                gravity_assist_used=chosen_assist.name if chosen_assist else None,
            )
        )

    coast_start_earth = state.earth_time_s
    coast_start_onboard = state.onboard_time_s
    coast_speed = max(state.velocity_mps, 1e-9)
    coast_earth_s = coast_distance / coast_speed
    coast_onboard_s = coast_earth_s / lorentz_factor(coast_speed)

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
            start_earth_time_s=coast_start_earth,
            end_earth_time_s=state.earth_time_s,
            start_onboard_time_s=coast_start_onboard,
            end_onboard_time_s=state.onboard_time_s,
            relativistic_kinetic_energy_j=relativistic_kinetic_energy_j(state.mass_kg, coast_speed),
            lorentz_factor=lorentz_factor(coast_speed),
        )
    )

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
    )
    segments.append(decel_segment)

    response_segments = [
        SolveTimelineSegment(
            phase=segment.phase,
            distanceKm=segment.distance_m / 1000.0,
            startVelocityMps=segment.start_velocity_mps,
            endVelocityMps=segment.end_velocity_mps,
            deltaVMps=segment.delta_v_mps,
            burnDurationSeconds=segment.burn_duration_s,
            earthFrameDurationSeconds=segment.earth_time_s,
            onboardDurationSeconds=segment.onboard_time_s,
            startEarthTimeSeconds=segment.start_earth_time_s,
            endEarthTimeSeconds=segment.end_earth_time_s,
            startOnboardTimeSeconds=segment.start_onboard_time_s,
            endOnboardTimeSeconds=segment.end_onboard_time_s,
            fuelRemainingKg=segment.fuel_remaining_kg,
            relativisticKineticEnergyJoules=segment.relativistic_kinetic_energy_j,
            lorentzFactor=segment.lorentz_factor,
            gravityAssistUsed=segment.gravity_assist_used,
        )
        for segment in segments
    ]

    total_delta_v = sum(segment.delta_v_mps for segment in segments)
    return SolveTrajectoryResponse(
        totalDistanceKm=total_distance_m / 1000.0,
        totalEarthFrameSeconds=state.earth_time_s,
        totalOnboardSeconds=state.onboard_time_s,
        totalDeltaVMps=total_delta_v,
        finalVelocityMps=state.velocity_mps,
        fuelRemainingKg=state.fuel_kg,
        segments=response_segments,
        gravityAssistChosen=chosen_assist.name if chosen_assist else None,
    )
