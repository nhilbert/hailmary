"""Engine class specifications.

Each entry defines the physics constants and operational limits for a drive type.
These are the server-side source of truth; the frontend maps engine class names
to these parameters via the /routes/solve-by-spec endpoint.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EngineSpec:
    isp_s: float
    """Specific impulse in seconds (ve = isp * g)."""

    max_accel_g: float
    """Maximum achievable initial acceleration in g. Requests above this are infeasible."""

    mass_ratio_limit: float
    """Maximum wet/dry mass ratio the drive can practically carry (structural + tank limits)."""

    fuel_unit: str
    """Human-readable fuel unit label shown in the UI."""

    fuel_unit_scale: float
    """Multiply kg by this to get the display amount (e.g. 0.001 → tonnes)."""

    fuel_unit_suffix: str
    """Display suffix after the number (e.g. 't', 'kg')."""

    shield_mass_fraction: float = 0.0
    """Shield mass as a fraction of dry mass (ISM erosion protection)."""

    constant_proper_accel: bool = False
    """If True, the drive maintains constant proper acceleration by varying thrust with
    current mass (F(t) = a·m(t)).  If False, thrust is constant (classical rocket)."""


ENGINE_SPECS: dict[str, EngineSpec] = {
    # ── Near-future / physically plausible ──────────────────────────────────
    # Ion: Very high Isp, extremely low thrust. Realistic (Dawn, Hayabusa2).
    "ion": EngineSpec(
        isp_s=10_000,
        max_accel_g=0.002,
        mass_ratio_limit=100,
        fuel_unit="propellant",
        fuel_unit_scale=0.001,
        fuel_unit_suffix="t",
    ),
    # Fusion: D-³He ICF, Project Daedalus / Icarus class. vₑ ≈ 0.04c (10,600 km/s).
    # Daedalus measured ve = 10,600 km/s → Isp ≈ 1.08 × 10⁶ s.
    "fusion": EngineSpec(
        isp_s=1_200_000,
        max_accel_g=0.05,
        mass_ratio_limit=400,
        fuel_unit="D-He3 pellets",
        fuel_unit_scale=0.001,
        fuel_unit_suffix="t",
    ),
    # Nuclear pulse (Orion): fission/fusion bombs detonated against a pusher plate.
    # Based on Dyson (1968) interstellar Orion design and Project Icarus estimates.
    # vₑ ≈ 6,500–30,000 km/s; we use the fission-fusion midpoint at ~6,500 km/s.
    # Isp 200,000 s; high thrust allows heavy ships at 1g. TRL 4 (studied 1958–1963).
    "orion": EngineSpec(
        isp_s=200_000,
        max_accel_g=1.0,
        mass_ratio_limit=500,
        fuel_unit="pulse units",
        fuel_unit_scale=0.001,
        fuel_unit_suffix="t",
    ),
    # Antimatter (pion beam core): proton-antiproton annihilation → charged pions directed
    # by magnetic nozzle. vₑ ≈ 0.33c, Isp ≈ 10⁷ s. Most powerful physically plausible drive.
    # Throttleable — modulates thrust to hold constant proper acceleration.
    # ~5% gamma-ray shield fraction needed (remaining radiation absorbed by structure).
    "antimatter": EngineSpec(
        isp_s=10_000_000,
        max_accel_g=0.5,
        mass_ratio_limit=1_000,
        fuel_unit="antiprotons",
        fuel_unit_scale=0.001,
        fuel_unit_suffix="t",
        shield_mass_fraction=0.05,
        constant_proper_accel=True,
    ),
    # ── Sci-fi drives ────────────────────────────────────────────────────────
    # Astrophage (Project Hail Mary): near-c exhaust, enormous mass ratio.
    # The drive throttles continuously to hold constant proper acceleration
    # (thrust ∝ current mass), matching the novel's physics.
    "astrophage": EngineSpec(
        isp_s=25_000_000,
        max_accel_g=2.0,
        mass_ratio_limit=100_000,
        fuel_unit="astrophage",
        fuel_unit_scale=0.001,
        fuel_unit_suffix="t",
        shield_mass_fraction=0.25,
        constant_proper_accel=True,
    ),
    # Warp drive: fictional FTL-capable, moderate Isp by sci-fi convention.
    "warp": EngineSpec(
        isp_s=1_000_000,
        max_accel_g=10.0,
        mass_ratio_limit=500,
        fuel_unit="deuterium",
        fuel_unit_scale=0.001,
        fuel_unit_suffix="t",
    ),
    # Quantum drive: fictional high-Isp, high-thrust drive.
    "quantum": EngineSpec(
        isp_s=5_000_000,
        max_accel_g=5.0,
        mass_ratio_limit=1_000,
        fuel_unit="quantum fuel",
        fuel_unit_scale=0.001,
        fuel_unit_suffix="t",
    ),
    # Hyperdrive: Star Wars / Star Trek fictional drive, extreme parameters.
    "hyperdrive": EngineSpec(
        isp_s=2_000_000,
        max_accel_g=100.0,
        mass_ratio_limit=2_000,
        fuel_unit="hyperfuel",
        fuel_unit_scale=0.001,
        fuel_unit_suffix="t",
    ),
}


def get_engine_spec(engine_class: str) -> EngineSpec:
    """Return the spec for an engine class; raise ValueError for unknown classes."""
    spec = ENGINE_SPECS.get(engine_class)
    if spec is None:
        known = ", ".join(sorted(ENGINE_SPECS))
        raise ValueError(f"Unknown engine class '{engine_class}'. Known: {known}")
    return spec
