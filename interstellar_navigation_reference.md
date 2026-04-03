# Interstellar Navigation & Trajectory Planning
## Physics Reference for Simulation — nhilbert/hailmary

---

## Table of Contents

1. [Propulsion Systems & Parameters](#1-propulsion-systems--parameters)
2. [Relativistic Mechanics — Full Math](#2-relativistic-mechanics--full-math)
3. [Trajectory Types & Optimization](#3-trajectory-types--optimization)
4. [Stellar Coordinates & Navigation](#4-stellar-coordinates--navigation)
5. [Gravity Assists — Interstellar Scale](#5-gravity-assists--interstellar-scale)
6. [Nearby Star Catalog](#6-nearby-star-catalog)
7. [Interstellar Medium Effects](#7-interstellar-medium-effects)
8. [Simulation Architecture](#8-simulation-architecture)

---

## 1. Propulsion Systems & Parameters

### 1.1 Master Formula — Tsiolkovsky Rocket Equation

**Newtonian (v << c):**

```
Δv = vₑ · ln(m₀ / mf)
```

Where:
- `vₑ` = exhaust velocity [m/s]
- `m₀` = initial (wet) mass [kg]
- `mf` = final (dry) mass [kg]
- Mass ratio `R = m₀ / mf`

The exponential penalty is brutal. To reach `Δv = 3 · vₑ`, you need mass ratio `e³ ≈ 20`. Every doubling of `Δv/vₑ` squares the mass ratio.

**Key derived quantities:**

```
Isp = vₑ / g₀          [seconds], g₀ = 9.81 m/s²
Thrust F = ṁ · vₑ      [N], ṁ = propellant mass flow rate
Jet power Pj = F·vₑ/2  [W]
```

---

### 1.2 Propulsion Systems Comparison

| System | vₑ [km/s] | Isp [s] | Max Δv | Notes |
|--------|-----------|---------|---------|-------|
| Chemical (H₂/O₂) | 4.4 | 450 | ~9 km/s practical | Earth launch only |
| Nuclear thermal (NERVA) | 8–9 | 800–900 | ~15 km/s | Fission-heated H₂ |
| Nuclear pulse (Orion) | 10,000 | ~1,000,000 | ~0.03c | Fission/fusion bombs on pusher plate |
| ICF Fusion (Daedalus) | 10,600 | ~1,000,000 | ~0.12c | D/³He pellets, magnetic nozzle |
| ICF Fusion (Icarus/Firefly) | 12,000 | ~1,200,000 | ~0.09c | Z-pinch; 21,000 t fuel, 2,200 t dry |
| Antimatter (pion beam core) | 0.6c | ~60,000,000 | >0.5c | Frozen antihydrogen; containment unsolved |
| Laser sail (Starshot) | N/A | N/A | ~0.2c | No onboard fuel; laser array at launch |

#### Project Daedalus (1978 BIS) — Canonical Numbers

```
Stage 1:  fuel = 46,000 t D/³He, burn 2.05 yr, Δv = 21,900 km/s, vₑ = 10,600 km/s
Stage 2:  fuel = 4,000 t D/³He, burn 1.76 yr, Δv = 14,700 km/s, vₑ = 9,210 km/s
Cruise:   v = 36,600 km/s = 0.122c
Target:   Barnard's Star (5.9 ly), flyby after ~50 yr
Pulse freq: 250 Hz, magnetic nozzle
```

#### Project Icarus / Firefly (2012 BIS/Icarus Interstellar) — Updated Numbers

```
Drive:     Z-pinch fusion
vₑ =       12,000 km/s = 0.04c
Isp =      1,200,000 s
Wet mass = 23,550 t, Dry = 2,200 t, Fuel = 21,000 t
Mass ratio R = 23,550 / 2,200 ≈ 10.7
Δv (Tsiolkovsky) = 12,000 · ln(10.7) ≈ 28,800 km/s ≈ 0.096c
Jet power ≈ 344 TW, specific power ≈ 11.5 MW/kg
```

**Mass ratio check for any drive:**

```
R = exp(Δv / vₑ)
```

For a rendezvous mission (accelerate + decelerate): need `Δv_total = 2 · v_cruise`, so `R = exp(2·v/vₑ)`. This is why deceleration is crippling.

---

## 2. Relativistic Mechanics — Full Math

### 2.1 Lorentz Factor

```
γ = 1 / √(1 - β²)     where β = v/c
```

Thresholds:

| v/c | γ | effect |
|-----|---|--------|
| 0.10 | 1.005 | <1% — Newtonian OK |
| 0.30 | 1.048 | ~5% mass increase |
| 0.50 | 1.155 | significant |
| 0.70 | 1.400 | very significant |
| 0.90 | 2.294 | strong time dilation |
| 0.99 | 7.089 | extreme |

Rule of thumb: use relativistic equations when `v > 0.1c`.

---

### 2.2 Relativistic Rocket Equation

**Result (exact):**

```
vf = c · tanh(vₑ/c · ln(m₀/mf))
```

Equivalently, using **rapidity** `φ = arctanh(v/c)`:

```
φ_total = (vₑ/c) · ln(m₀/mf)
```

Rapidity adds linearly across boosts, making multi-stage analysis clean:

```
φ_total = φ₁ + φ₂ + ... + φₙ
```

Then recover velocity: `v = c · tanh(φ_total)`

**Derivation sketch** (momentum-energy conservation in rocket rest frame):

In the instantaneous rest frame, momentum conservation gives:
```
M dv + (v - vₑ) dM = 0   [Newtonian]
```
Relativistically, replacing velocities with rapidity and using 4-momentum conservation yields the tanh result. Full derivation: see Misner, Thorne & Wheeler §6.2, or canmom.art/physics/relativistic-rocket-part-1.

**For antimatter photon rocket** (`vₑ → c`):

```
vf = c · (R² - 1) / (R² + 1)    where R = m₀/mf
```

---

### 2.3 Constant Acceleration Trajectory (Brachistochrone)

For constant proper acceleration `a` (felt by crew):

**Observer-frame time** to travel distance `d` at max speed (flyby):

```
t = √[(d/c)² + 2d/a]
```

**Proper time** (crew clock) for the same:

```
T = (c/a) · arcsinh(a·t/c)
    = (c/a) · ln[at/c + √(1 + (at/c)²)]
```

**For deceleration-to-stop** (flip-and-burn), distance splits in half:

```
T_total = 4·(c/a) · arcsinh[a·d / (2c²)]   [approx, for d >> c²/a]
```

**Position as function of proper time:**

```
x(T) = (c²/a) · [cosh(aT/c) - 1]
```

**Velocity as function of proper time:**

```
v(T) = c · tanh(aT/c)
```

**Reference numbers at 1g (a = 9.81 m/s²):**

```
c²/a = (3×10⁸)² / 9.81 ≈ 9.17×10¹⁵ m ≈ 0.97 ly
```

This means 1g reaches 0.5c in ~0.6 years proper time, 0.9c in ~1.3 years, 0.99c in ~2.1 years.

---

### 2.4 Time Dilation

**Velocity time dilation** (special relativity):

```
dτ/dt = 1/γ = √(1 - v²/c²)
```

For a brachistochrone trip at acceleration `a`, proper time `T` vs coordinate time `t`:

```
T = (c/a) · arcsinh(at/c)
```

**Gravitational time dilation** (general relativity, near a star of mass M):

```
dτ/dt = √(1 - 2GM/rc²)     [Schwarzschild metric]
```

For passage near a star at closest approach `r_min`, this is negligible unless `r_min` is within a few stellar radii of a neutron star or black hole.

---

### 2.5 Relativistic Doppler & Stellar Aberration

**Doppler shift** (source approaching):

```
f_obs / f_emit = √[(1+β)/(1-β)]     [longitudinal]
```

**Stellar aberration** — the angle `θ'` to a star (measured by moving ship) vs rest-frame angle `θ`:

```
cos θ' = (cos θ + β) / (1 + β·cos θ)
```

At high `β`, forward stars bunch together (relativistic beaming). At `v = 0.9c`, a star 90° off axis appears at `θ' ≈ 26°`. At `v = 0.99c`, the entire forward hemisphere compresses to `θ' < 8°`.

**For navigation:** at `v > 0.1c` the star catalog positions are systematically shifted. Correct observed angles before comparing to catalog.

---

## 3. Trajectory Types & Optimization

### 3.1 Trajectory Taxonomy

| Type | Description | Best for |
|------|-------------|---------|
| Direct ballistic | Coasting after initial burn | Uncrewed probes, no fuel constraint on time |
| Brachistochrone | Constant accel/decel flip | Crewed; artificial gravity; fuel-intensive |
| Staged burn + coast | Burn phase + unpowered cruise | Most realistic |
| Flyby-augmented | Uses stellar gravity | Low-fuel missions, time flexible |

---

### 3.2 State Vector

The simulation state for a spacecraft at time `t`:

```
S = (x, y, z, vx, vy, vz, m)
```

Where mass `m` decreases as:

```
dm/dt = -F / vₑ = -|thrust| / vₑ
```

At relativistic speeds, work in terms of **4-velocity** `u^μ = γ(c, v)` and **proper time** `τ`:

```
d(γv)/dτ = F/m₀   [coordinate acceleration in lab frame]
```

Or equivalently, track **rapidity vector** `φ̂ = φ · v̂` where `φ = arctanh(v/c)`.

---

### 3.3 Equations of Motion for Simulation

**Non-relativistic** (v << c):

```python
# Newtonian with thrust and gravity
ax = Fx/m + sum(G*M_i*(x_i - x)/|r_i|³)
ay, az = analogous
dm/dt = -|F| / v_e
```

**Relativistic** (v > 0.1c): use proper acceleration `α = F/m` (constant in engine frame), then:

```
d(γv)/dt = α · v̂     [in coordinate time]
```

Integrating:

```
γv(t+dt) = γv(t) + α·dt
v(t+dt) = γv(t+dt) / √(1 + |γv|²/c²)
```

**Recommended integrator:** 4th-order Runge-Kutta (RK4) or symplectic integrator (Verlet/leapfrog) for long timescales. Adaptive step size: keep `|Δv/v| < 10⁻⁶` per step.

**Time step guideline:**
- Boost phase: `dt ≤ 0.01 · c/a` (≈ 3.5 days at 1g)
- Cruise phase: `dt ≈ 0.01 · d/v` (1% of total cruise time)
- Flyby: adaptive, shrink to `dt ≤ r_min / (100·v)`

---

### 3.4 Minimum Energy vs Minimum Time

**Minimum energy** = coast all the way (no decel burn). You arrive fast but can't stop. Good for probes.

**Minimum time with fixed fuel**: brachistochrone. Burn all fuel accelerating, then flip and burn decelerating. Maximizes average speed.

**Optimal control formulation** (Pontryagin maximum principle):

Minimize `T = ∫dt` subject to equations of motion, `|F| ≤ F_max`, `m ≥ m_dry`.

For unconstrained thrust, optimal = bang-bang: full thrust on, then off. Intermediate thrust is never optimal for minimum-time. For minimum-fuel at fixed time: continuous low thrust (relevant for ion drive legs).

---

## 4. Stellar Coordinates & Navigation

### 4.1 Coordinate Systems

**Heliocentric ecliptic** (for solar system departure):
- Origin: Sun
- x-axis: Vernal equinox
- xy-plane: Earth's orbital plane

**Galactic coordinates `(l, b, d)`:**
- `l` = galactic longitude [deg], 0° = Galactic Center direction
- `b` = galactic latitude [deg], 0° = galactic plane
- `d` = distance [parsecs or ly]

**Conversion from equatorial (RA, Dec) to galactic:**

```
sin b = sin δ · sin δ_G + cos δ · cos δ_G · cos(α - α_G)

tan(l_NCP - l) = sin(α_G - α) / [cos δ · tan δ_G - sin δ · cos(α_G - α)]
```

Where the galactic pole is at: `α_G = 192.8595°, δ_G = +27.1284°, l_NCP = 122.9320°`

**3D Cartesian position** of a star at `(RA=α, Dec=δ, distance=d)`:

```
x = d · cos δ · cos α
y = d · cos δ · sin α
z = d · sin δ
```

---

### 4.2 Proper Motion — Predicting Future Positions

Stars have proper motions `(μ_α, μ_δ)` [arcsec/yr] and radial velocity `v_r` [km/s].

**Angular motion:**

```
α(t) = α₀ + μ_α · Δt / cos δ    [corrected for declination]
δ(t) = δ₀ + μ_δ · Δt
```

**Distance evolution** (radial velocity):

```
d(t) = d₀ + v_r · Δt · (1/3.086×10¹³ km/pc)    [in parsecs]
```

**Full space velocity** from proper motion `μ` [arcsec/yr], distance `d` [pc], radial velocity `v_r` [km/s]:

```
v_transverse = 4.74 · μ · d   [km/s]    (where μ = √(μ_α² + μ_δ²))
v_total = √(v_r² + v_transverse²)
```

For a 50-year mission to Proxima Centauri, proper motion shifts its position by:

```
μ_α = -3.78 arcsec/yr, μ_δ = -0.77 arcsec/yr
Δposition after 50 yr ≈ 192 arcsec ≈ 0.05° = measurable, must be corrected
```

---

### 4.3 Navigation Methods

#### XNAV (X-ray Pulsar Navigation)

Millisecond pulsars act as galactic atomic clocks. The pulse Time of Arrival (TOA) at the spacecraft satisfies:

```
t_arrive = t_emit + d/c + corrections(Shapiro, Doppler, ISM dispersion)
```

Position is determined by comparing TOA from ≥3 pulsars against an ephemeris. Accuracy: **±5 km** demonstrated on ISS (NICER/SEXTANT, 2018). Advantages: unjammable, works galaxy-wide, no external infrastructure.

**Phase accumulation model:**

```
φ(t) = φ₀ + f₀·t + (ḟ₀/2)·t²  + ...
```

Where `f₀` is pulse frequency and `ḟ₀` is its spin-down rate. Comparing predicted vs received phase gives the light travel time residual → position offset.

#### StarNAV (Stellar Aberration)

At high velocity, inter-star angles shift due to aberration. By measuring many inter-star angles and comparing to catalog, the spacecraft velocity vector can be recovered.

```
cos θ'_12 = (cos θ_12 + β·...) / (normalization)   [full tensor expression, see Christian 2019]
```

Accuracy: ~1 mas inter-star angle measurement → velocity accuracy ~10 km/s at v = 0.1c. Advantages: works at any speed, uses visible stars, no dedicated emitter needed.

---

## 5. Gravity Assists — Interstellar Scale

### 5.1 Classical Gravity Assist Physics

In the **planet's rest frame**, the spacecraft enters on a hyperbolic trajectory and exits with the same speed but different direction. In the **Sun's frame**, the planet's orbital velocity is exchanged.

**Maximum delta-v from a flyby** (planet frame, elastic scatter):

```
Δv_max = 2·v_planet · sin(δ/2)
```

Where the **deflection angle** `δ` satisfies:

```
sin(δ/2) = 1 / (1 + r_p · v_∞² / GM)
```

And `r_p` = periapsis radius, `v_∞` = hyperbolic excess velocity, `M` = flyby body mass.

**Maximum deflection** (grazing flyby at surface):

```
δ_max = 2·arcsin(1 / (1 + v_esc²/v_∞²))    where v_esc = √(2GM/R)
```

The closer you can fly, and the slower you arrive, the more you can be deflected.

---

### 5.2 Hyperbolic Orbit Geometry

The flyby trajectory around a star of mass `M`:

**Energy:** `E = v_∞²/2 > 0` (unbound)

**Angular momentum:** `L = r_p · v_p` where `v_p = √(v_∞² + v_esc²)` at periapsis

**Semi-major axis:**

```
a = -GM / v_∞²    [negative for hyperbola]
```

**Eccentricity:**

```
e = 1 + r_p · v_∞² / GM  =  1 + r_p / |a|
```

**Turning angle:**

```
δ = 2·arcsin(1/e) = 2·arctan(GM / (r_p · v_∞²))
```

---

### 5.3 Can Stars Provide Meaningful Gravity Assists?

**Comparison: Jupiter vs Alpha Centauri A**

```
                    Jupiter         Alpha Cen A
Mass               1.9×10²⁷ kg     2.0×10³⁰ kg   [×1050]
v_orbital          13.1 km/s       ~220 km/s (galactic), ~0 (local)
v_esc (surface)    59.5 km/s       617 km/s
```

**Key problem:** Stars have no significant velocity relative to each other locally (~10–50 km/s peculiar velocities). A star flyby gives you stellar peculiar velocity ≈ 10–50 km/s, compared to Voyager/Jupiter which gained ~10–20 km/s. The mass is 1000× more, but so is your typical arrival velocity (tens of thousands of km/s for an interstellar ship).

For a ship arriving at `v_∞ = 3,000 km/s = 0.01c`:

```
r_p = R_star (grazing)
e ≈ 1 + R_sun · (3000)² / (GM_sun) ≈ 1 + (7×10⁸ · 9×10⁶) / (1.33×10²⁰) ≈ 1.048
δ = 2·arcsin(1/1.048) ≈ 2·arcsin(0.954) ≈ 144°  [substantial deflection!]
```

But the **energy gain** from a stellar flyby is:

```
Δv = 2 · v_star_peculiar · sin(δ/2) ≈ 2 · 20 km/s · sin(72°) ≈ 38 km/s
```

vs your cruise speed of 3,000 km/s — barely 1%. So stellar flybys **change direction cheaply** but give negligible speed boost for a fast ship. They become important for:

1. **Course correction** without fuel expenditure
2. **Deceleration assist** (fly through ahead of the star — you lose velocity to the star)
3. **Slow probes** (~0.001c) where 50 km/s is a real fraction of cruise speed

---

### 5.4 The Oberth Effect at a Star

If you fire your engine at periapsis of a stellar flyby, the Oberth effect massively amplifies the Δv:

```
v_final = √(v_p² + 2·Δv·v_p + Δv²)   [approximate, for small Δv burn]
```

More precisely: engine burn `Δv_engine` at periapsis velocity `v_p` yields effective:

```
Δv_effective = √(v_p² + 2·v_p·Δv_engine) - v_∞
```

For a deceleration scenario: the ship arrives at `v_∞`, swings around a star, and fires engines at periapsis. The star's gravity well amplifies the engine burn. For `v_p >> v_∞`, you get:

```
Δv_effective ≈ √(2·v_p·Δv_engine)  >> Δv_engine
```

This is the key mechanism that makes a **focal point stellar flyby** (like in Project Hail Mary) physically justified: a tiny burn deep in the gravity well has enormous effect.

---

### 5.5 Is a Detour Worth It?

**Detour cost:** extra distance `d_extra = d_A→star + d_star→B - d_A→B`

**Time penalty** (at cruise speed `v`):

```
Δt_detour = d_extra / v
```

**When the flyby pays off:**

If the star is close to the direct path (within angle `θ ≤ 5°`), the detour cost is small. A star at 1 ly off a 4 ly route adds at most ~0.03 ly extra path — negligible.

**Decision rule for routing algorithm:**
1. Compute Δv_available from each candidate star (peculiar velocity × 2 × sin(max deflection))
2. Compute time cost of detour
3. If Δv_available is significant vs remaining mission Δv budget, OR if star is near direct path (angle < 10°), include in routing

For a **fuel-limited slow probe** (~0.001c): stellar flyby chains can be worth planning. For a high-speed crewed ship (~0.1c): flybys are primarily useful for course correction and Oberth maneuvers at destination.

---

## 6. Nearby Star Catalog

### Key Targets within 15 ly

| Star | Distance [ly] | Mass [M☉] | Luminosity [L☉] | Proper motion [arcsec/yr] | Radial v [km/s] | Notes |
|------|---------------|-----------|-----------------|--------------------------|-----------------|-------|
| Proxima Centauri | 4.243 | 0.122 | 0.0017 | 3.85 | +22.2 | M-dwarf; closest; Proxima b (habitable zone) |
| α Cen A | 4.365 | 1.100 | 1.519 | 3.71 | +22.4 | G-type; binary with α Cen B |
| α Cen B | 4.365 | 0.907 | 0.500 | 3.71 | +22.4 | K-type; binary with α Cen A |
| Barnard's Star | 5.963 | 0.144 | 0.0035 | 10.36 | -110.8 | Fastest proper motion; no planets confirmed |
| Wolf 359 | 7.78 | 0.09 | 0.001 | 4.7 | +19 | M-dwarf; very dim |
| Lalande 21185 | 8.31 | 0.46 | 0.026 | 4.8 | -84.7 | K-dwarf |
| Sirius A/B | 8.60 | 2.02 / 1.02 | 25.4 / 0.056 | 1.34 | -5.5 | Brightest star; binary; no known planets |
| Epsilon Eridani | 10.47 | 0.82 | 0.34 | 0.98 | +15.5 | K-dwarf; debris disk; candidate planet |
| Tau Ceti | 11.91 | 0.78 | 0.52 | 1.92 | -16.4 | G-dwarf; 5 planet candidates |
| Epsilon Indi | 11.87 | 0.77 | 0.22 | 4.70 | -40.4 | K-dwarf; brown dwarf companions |

**For flyby utility**: Stars with high mass × low flyby speed (i.e., a star near the path where you arrive slowly) are best. Sirius (2 M☉) is attractive but requires a 0.6 ly detour from a Sol→α Cen route.

**Predicted position of Barnard's Star** (large proper motion = matters most):

```
After 50 yr:  Δα ≈ +3.7', Δδ ≈ -8.7'    (significant — ~0.2° shift)
Target coordinates must be updated pre-launch
```

---

## 7. Interstellar Medium Effects

### 7.1 ISM Particle Density

The local ISM (between Sol and α Cen) has:

```
n_H ≈ 0.1–1 proton/cm³    (warm neutral medium)
n_H ≈ 0.01–0.1 /cm³       (hot ionized medium, Local Bubble)
```

### 7.2 Dynamic Pressure (Ram Pressure)

A spacecraft moving at velocity `v` through a medium of density `ρ`:

```
P_ram = ½ · ρ · v²
F_drag = P_ram · A_cross-section
```

For `v = 0.1c`, `n_H = 0.1 cm⁻³`:

```
ρ = 1.67×10⁻²⁷ kg × 10⁴ m⁻³ = 1.67×10⁻²³ kg/m³
P_ram = ½ × 1.67×10⁻²³ × (3×10⁷)² ≈ 7.5×10⁻⁹ Pa   [negligible]
```

Ram pressure is negligible for sub-0.1c travel on interstellar scales (total impulse ~10⁻² N·s over 4 ly for a 10 m² ship).

### 7.3 Erosion (Impact Cratering)

At `v = 0.12c`, a 1-microgram dust grain hits with kinetic energy:

```
E = ½mv² ≈ 0.5 × 10⁻⁹ kg × (3.6×10⁷ m/s)² ≈ 648 J ≈ 0.15 g TNT
```

**This is why Daedalus had a 50-tonne beryllium erosion shield.** Above ~0.1c, ISM dust is a weapons-grade threat, not a drag effect.

Erosion depth per impact approximately:

```
d_crater ≈ (E / σ_material)^(1/3)    [rough order-of-magnitude]
```

For simulation: model the shield as a consumable mass that ablates per unit distance traveled, proportional to `n_dust × v² × A`.

### 7.4 Radiation

At `v = 0.1c`, ISM protons in the ship frame have kinetic energy:

```
E_kin = (γ-1)·m_p·c² ≈ 0.005 × 938 MeV ≈ 4.7 MeV
```

Equivalent to energetic cosmic ray exposure. Heavy shielding (or magnetic deflection) required for crew.

---

## 8. Simulation Architecture

### 8.1 Recommended Units

| Quantity | Unit | Reason |
|----------|------|--------|
| Distance | AU or ly | 1 AU = 1.496×10¹¹ m; 1 ly = 63,241 AU |
| Time | years | 1 yr = 3.156×10⁷ s |
| Velocity | fraction of c | β = v/c; or km/s |
| Mass | kg or M☉ | |
| Acceleration | m/s² or g | |

Speed of light: `c = 0.306 ly/yr = 63,241 AU/yr`

### 8.2 State Vector Schema (suggested)

```json
{
  "t_coord": "coordinate time [yr]",
  "tau": "proper time [yr]",
  "pos": [x, y, z],          // [ly] in heliocentric galactic frame
  "vel": [vx, vy, vz],       // [fraction of c]
  "gamma": 1.0,               // Lorentz factor
  "mass_wet": 0.0,            // [kg]
  "mass_dry": 0.0,            // [kg]
  "thrust_vec": [0,0,0],      // [N]
  "mode": "boost|coast|decel|flyby"
}
```

### 8.3 Integration Loop (Python pseudocode)

```python
def rk4_step(state, dt, force_fn):
    k1 = deriv(state, force_fn)
    k2 = deriv(state + dt/2 * k1, force_fn)
    k3 = deriv(state + dt/2 * k2, force_fn)
    k4 = deriv(state + dt * k3, force_fn)
    return state + (dt/6) * (k1 + 2*k2 + 2*k3 + k4)

def deriv(state, force_fn):
    # Relativistic equations of motion
    gamma_v = state.vel    # γv vector
    v = gamma_v / sqrt(1 + dot(gamma_v, gamma_v)/c**2)
    gamma = 1 / sqrt(1 - dot(v,v)/c**2)
    F = force_fn(state)     # includes thrust + gravity
    
    d_gamma_v_dt = F / state.mass_wet
    dm_dt = -norm(F) / v_exhaust
    d_tau_dt = 1 / gamma
    
    return State(
        d_pos=v,
        d_gamma_v=d_gamma_v_dt,
        d_mass=dm_dt,
        d_tau=d_tau_dt
    )
```

### 8.4 Flyby Detection & Handling

```python
def check_flyby(state, stars):
    for star in stars:
        r = norm(state.pos - star.pos)
        r_dot = dot(state.vel, (state.pos - star.pos)) / r
        if r < SOI(star) and r_dot < 0:  # inside sphere of influence, approaching
            enter_flyby_mode(star)
```

Sphere of influence: `SOI ≈ d_star × (M_star/M_galaxy)^(2/5)` — for interstellar this is ill-defined; use `SOI ≈ R_Hill` of the star, or simply a fixed radius of ~0.1 ly.

### 8.5 Route Planning Algorithm

For a simulation with `N` potential waypoint stars:

1. **Build graph:** nodes = stars, edges = direct trajectories
2. **Edge weight:** `f(d, Δv_available, time_penalty)` — define as time with fixed fuel budget
3. **Search:** Dijkstra or A* on the weighted graph
4. **Refine:** For each flyby node, solve hyperbolic orbit to find required approach vector and timing
5. **Propagate:** Run full ODE simulation on selected route

For the `hailmary` project context: the Astrophage drive gives constant `F` → constant proper acceleration. Brachistochrone trajectories are optimal. The star catalog above provides the node set. Rocky's home system (Eridani 40? — the novel's unnamed system) requires a target star with appropriate properties.

---

## Key References

- **Misner, Thorne, Wheeler** — *Gravitation* (1973), §6.2: relativistic rocket equations
- **Project Daedalus Final Report** — Bond et al., *JBIS* Supplement, 1978
- **Relativistic Rocket FAQ** — Philip Gibbs (1996), math.ucr.edu/home/baez/physics/Relativity/SR/Rocket
- **Project Icarus** — Long et al., *Acta Astronautica* 2011–2013 (multiple papers)
- **StarNAV** — Christian J.A., *Sensors* 19(19), 2019
- **XNAV/SEXTANT** — Gendreau et al., *SPIE*, 2016 (ISS demonstration)
- **Canmom blog** — Full relativistic rocket equation derivation: canmom.art/physics/relativistic-rocket-part-1
- **Atomic Rockets** — projectrho.com (exhaustive engineering reference for realistic space drives)
