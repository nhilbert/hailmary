import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  GlowLayer,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  Scene,
  StandardMaterial,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import type { GalaxyStar, ManeuverSegment, RoutePhase } from '../features/galaxy/types';

// ── Constants ──────────────────────────────────────────────────────────────

// 1 Babylon unit = 1 parsec throughout the scene.
// Navigation stars sit at their real heliocentric equatorial positions (pc).
// HYG point cloud is loaded from /stars.bin at the same 1:1 scale.
// Procedural background galaxy fills the disc structure beyond HYG coverage.

const GALAXY_RADIUS_PC   = 13_000; // Milky Way half-diameter
const GALAXY_MIN_DIST_PC =    500; // exclude inner sphere covered by HYG data
const DISC_THICKNESS_PC  =    250; // disc half-thickness at the outer rim

// Sol is ~8 120 pc from the galactic centre in the Orion Arm.
// The galaxy is generated in galactic Cartesian coordinates centred on Sol:
//   gx → toward GC (l=0°, b=0°)
//   gy → toward l=90°, b=0°
//   gz → toward NGP (b=90°)
// Then rotated into Babylon equatorial space via the IAU galactic→equatorial
// matrix (Hipparcos Vol.1 §1.5.3), with the Babylon axis remap:
//   Babylon X = HYG x,  Babylon Y = HYG z,  Babylon Z = −HYG y.
const GC_DIST_PC = 8_120;

// Galactic→Babylon rotation (row i · [gx,gy,gz] = Babylon component i).
const GAL_TO_BABYLON = [
  [-0.0548755604, +0.4941094279, -0.8676661490],  // → Babylon X
  [-0.4838350155, +0.7469822445, +0.4559837762],  // → Babylon Y
  [+0.8734370902, +0.4448296300, +0.1980763734],  // → Babylon Z
] as const;

const SOL_COLOR    = new Color3(1.00, 0.90, 0.50);
const STAR_COLOR   = new Color3(0.65, 0.82, 1.00);
const SELECT_COLOR = new Color3(1.00, 1.00, 0.60);

const PHASE_COLOR: Record<RoutePhase, Color3> = {
  departure: Color3.FromHexString('#81dbff'),
  transfer:  Color3.FromHexString('#b39aff'),
  insertion: Color3.FromHexString('#8af8c2'),
  coast:     Color3.FromHexString('#ffd98d'),
};

// ── Procedural galaxy ──────────────────────────────────────────────────────

/**
 * Generates a procedural Milky Way background in parsec coordinates.
 * Stars are generated beyond GALAXY_MIN_DIST_PC to avoid overlapping
 * with the HYG real-star point cloud covering the local neighbourhood.
 */
function generateGalaxyPoints(count: number): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 4);

  const rand  = () => Math.random();
  // Box-Muller Gaussian N(0,1)
  const randG = () => Math.sqrt(-2 * Math.log(1 - rand() + 1e-10)) * Math.cos(2 * Math.PI * rand());

  // 4 spiral arms: [startAngle]
  // Primary arms (0,1) align with the bar and originate at its endpoints.
  // Secondary arms (2,3) start closer to the centre for a 4-arm appearance.
  const armAngles  = [0, Math.PI, Math.PI / 2, 1.5 * Math.PI];
  const armTMin    = [0.27, 0.27, 0.08, 0.08]; // normalised start radius per arm

  // Logarithmic spiral pitch: b = tan(pitch_angle).
  // Milky Way arms have ~11° pitch → b ≈ 0.194.
  const LOG_SPIRAL_B = 0.194;

  // Exponential disc scale length: ~3 500 pc → normalised 3500/13000 ≈ 0.269
  const DISC_SCALE = 0.269;

  // Vertical scale: maps normalised ny (~0.01 for disc stars) → parsecs.
  // 0.012 is the reference σ so that 1σ ≈ DISC_THICKNESS_PC.
  const VERT_SCALE = DISC_THICKNESS_PC / 0.012;

  let written = 0;
  let attempts = 0;
  const maxAttempts = count * 6;

  while (written < count && attempts < maxAttempts) {
    attempts++;
    const type = rand();
    let nx: number, ny: number, nz: number; // normalised, galaxy-centred
    let brightness: number;
    let hue: number; // 0 = blue, 0.5 = white, 1 = yellow-red

    if (type < 0.09) {
      // ── Central bulge ────────────────────────────────────────────────
      // Sérsic-like: exponential profile from centre, spheroidal flattening.
      const r     = Math.min(-0.10 * Math.log(1 - rand() * 0.9999), 0.22);
      const theta = rand() * Math.PI * 2;
      const phi   = Math.acos(2 * rand() - 1);
      nx = r * Math.sin(phi) * Math.cos(theta);
      ny = r * Math.cos(phi) * 0.40;    // flattened vertically
      nz = r * Math.sin(phi) * Math.sin(theta);
      brightness = (0.45 + rand() * 0.55) * Math.exp(-r / 0.10);
      hue = 0.85 + rand() * 0.15;       // warm old stars

    } else if (type < 0.13) {
      // ── Galactic bar ─────────────────────────────────────────────────
      // Gaussian cross-section so edges fade naturally; tapers at endpoints.
      const s     = (rand() - 0.5);
      const absS  = Math.abs(s);
      const taper = Math.max(0, 1.0 - absS * 1.8);
      const sigmaZ = 0.060 * taper;   // σ_z ≈ 780 pc at centre, tapers to 0
      const sigmaY = 0.006 * taper;   // σ_y ≈  78 pc  (thin disc layer)
      nx = s * 0.56 + randG() * 0.012;
      ny = randG() * sigmaY;
      nz = randG() * sigmaZ;
      brightness = (0.35 + rand() * 0.45) * (0.4 + taper * 0.6);
      hue = 0.65 + rand() * 0.25;

    } else if (type < 0.73) {
      // ── Spiral arms ──────────────────────────────────────────────────
      // Logarithmic spiral: angle = angle0 + ln(r/r0) / b  (constant pitch).
      // Gaussian transverse profile replaces uniform band.
      // Periodic brightness envelope mimics HII-region clumping.
      const armIndex = Math.floor(rand() * armAngles.length);
      const armAngle = armAngles[armIndex];
      const tMin     = armTMin[armIndex];
      const t        = tMin + Math.pow(rand(), 0.55) * (0.9 - tMin);

      const logArg = Math.max(t / tMin, 1 + 1e-9);
      const angle  = armAngle + Math.log(logArg) / LOG_SPIRAL_B;

      // Gaussian arm width: σ grows slightly with radius (arms broaden outward)
      const sigmaArm = (0.018 + t * 0.040);
      const radial   = t * 0.92 + randG() * sigmaArm;

      nx = radial * Math.cos(angle);
      nz = radial * Math.sin(angle);
      ny = randG() * 0.010 * (1 - t * 0.45); // thin disc; thicker at centre

      // Clumping: periodic knots along arc-length simulate star-forming regions.
      // Phase offset per arm prevents all arms from brightening at the same angle.
      const arcPhase  = Math.log(logArg) * 5.5 + armIndex * 0.9;
      const clumpEnv  = 0.45 + 0.55 * Math.pow(Math.abs(Math.sin(arcPhase)), 0.4);
      brightness = (1 - t * 0.45) * (0.30 + rand() * 0.70) * clumpEnv;
      hue = t < 0.25 ? 0 + rand() * 0.15 : 0.35 + rand() * 0.20; // blue→white

    } else if (type < 0.98) {
      // ── Exponential disc ─────────────────────────────────────────────
      // Exponential radial profile (denser toward centre) + Gaussian vertical.
      const r     = Math.min(-DISC_SCALE * Math.log(1 - rand() * 0.9995), 0.95);
      const theta = rand() * Math.PI * 2;
      nx = r * Math.cos(theta) + randG() * 0.012;
      nz = r * Math.sin(theta) + randG() * 0.012;
      ny = randG() * 0.016 * Math.exp(-r / (DISC_SCALE * 2)); // thicker at centre
      brightness = (0.08 + rand() * 0.22) * Math.exp(-r / 0.55);
      hue = 0.45 + rand() * 0.50;

    } else {
      // ── Stellar halo ──────────────────────────────────────────────────
      // Sparse, old stars in a spheroidal halo above/below the disc.
      const r     = Math.min(-0.30 * Math.log(1 - rand() * 0.9999), 0.90);
      const theta = rand() * Math.PI * 2;
      const phi   = Math.acos(2 * rand() - 1);
      nx = r * Math.sin(phi) * Math.cos(theta);
      ny = r * Math.cos(phi) * 0.65; // more vertically extended than the disc
      nz = r * Math.sin(phi) * Math.sin(theta);
      brightness = (0.06 + rand() * 0.14) * Math.exp(-r / 0.40);
      hue = 0.65 + rand() * 0.30; // old, reddish-yellow
    }

    // Convert to Sol-centred galactic Cartesian (parsecs).
    // (nx,nz) are in the galactic disc plane; (ny) is perpendicular (toward NGP).
    // Adding GC_DIST_PC shifts from GC-centred to Sol-centred so Sol = origin.
    const gx = nx * GALAXY_RADIUS_PC + GC_DIST_PC;
    const gy = nz * GALAXY_RADIUS_PC;
    const gz = ny * VERT_SCALE;

    // Rotate galactic → Babylon space.
    const scaledX = GAL_TO_BABYLON[0][0] * gx + GAL_TO_BABYLON[0][1] * gy + GAL_TO_BABYLON[0][2] * gz;
    const scaledY = GAL_TO_BABYLON[1][0] * gx + GAL_TO_BABYLON[1][1] * gy + GAL_TO_BABYLON[1][2] * gz;
    const scaledZ = GAL_TO_BABYLON[2][0] * gx + GAL_TO_BABYLON[2][1] * gy + GAL_TO_BABYLON[2][2] * gz;

    // Exclude the local neighbourhood around Sol (origin); covered by clickable stars.
    const solDist2 = scaledX * scaledX + scaledY * scaledY + scaledZ * scaledZ;
    if (solDist2 < GALAXY_MIN_DIST_PC * GALAXY_MIN_DIST_PC) continue;

    positions[written * 3]     = scaledX;
    positions[written * 3 + 1] = scaledY;
    positions[written * 3 + 2] = scaledZ;

    const rc = Math.min(1, brightness * (0.55 + hue * 0.55));
    const gc = Math.min(1, brightness * (0.65 + hue * 0.10));
    const bc = Math.min(1, brightness * (1.00 - hue * 0.50));
    colors[written * 4]     = rc;
    colors[written * 4 + 1] = gc;
    colors[written * 4 + 2] = bc;
    colors[written * 4 + 3] = 1;

    written++;
  }

  // Trim arrays if rejection sampling left gaps
  return {
    positions: written < count ? positions.slice(0, written * 3) : positions,
    colors:    written < count ? colors.slice(0, written * 4)    : colors,
  };
}

function buildPointCloudMesh(
  name: string,
  positions: Float32Array,
  colors: Float32Array,
  scene: Scene,
  pointSize = 1.5,
): Mesh {
  const count = positions.length / 3;
  const mesh  = new Mesh(name, scene);
  const vd    = new VertexData();
  vd.positions = positions;
  vd.colors    = colors;
  const indices = new Int32Array(count);
  for (let i = 0; i < count; i++) indices[i] = i;
  vd.indices = indices;
  vd.applyToMesh(mesh);

  const mat          = new StandardMaterial(`${name}-mat`, scene);
  mat.emissiveColor  = Color3.White();
  mat.disableLighting = true;
  mat.pointsCloud    = true;
  mat.pointSize      = pointSize;
  mesh.material      = mat;
  mesh.isPickable    = false;
  return mesh;
}

// ── HYG binary loader ──────────────────────────────────────────────────────

/**
 * Async: fetch /stars.bin (generated by scripts/fetch_hyg.py), parse it,
 * build a new point-cloud mesh, and dispose the procedural background.
 *
 * Binary layout:
 *   4 bytes  uint32 LE  star count N
 *   N × 24 bytes:  6 × float32 LE  (bx, by, bz, r, g, b)
 *   Coordinates already in Babylon space (parsecs).
 */
async function loadHygStars(scene: Scene, proceduralMesh: Mesh): Promise<void> {
  let resp: Response;
  try {
    resp = await fetch('/stars.bin');
    if (!resp.ok) return; // binary not generated yet — silently skip
  } catch {
    return;
  }

  const buf   = await resp.arrayBuffer();
  const view  = new DataView(buf);
  const count = view.getUint32(0, true /* little-endian */);

  const expectedBytes = 4 + count * 6 * 4;
  if (buf.byteLength < expectedBytes) {
    console.warn(`stars.bin too short (${buf.byteLength} bytes, expected ${expectedBytes})`);
    return;
  }

  const positions = new Float32Array(count * 3);
  const colors    = new Float32Array(count * 4);
  let   offset    = 4;

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = view.getFloat32(offset,      true);
    positions[i * 3 + 1] = view.getFloat32(offset +  4, true);
    positions[i * 3 + 2] = view.getFloat32(offset +  8, true);
    colors[i * 4]        = view.getFloat32(offset + 12, true);
    colors[i * 4 + 1]    = view.getFloat32(offset + 16, true);
    colors[i * 4 + 2]    = view.getFloat32(offset + 20, true);
    colors[i * 4 + 3]    = 1.0;
    offset += 24;
  }

  // Swap out procedural cloud with real star data
  proceduralMesh.dispose();
  buildPointCloudMesh('hyg-stars', positions, colors, scene, 1.5);
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface GalaxyScene {
  updateSelection: (starId: string) => void;
  updateRoute: (segments: ManeuverSegment[], activeSegmentId: string | null) => void;
  /** Move all star spheres to their positions at the given epoch offset [years from J2000]. */
  updateEpoch: (yearsFromNow: number) => void;
  /** Apply relativistic stellar aberration for the given ship beta (v/c, 0 = off). */
  setAberrationBeta: (beta: number) => void;
  dispose: () => void;
}

export function initGalaxyScene(
  canvas: HTMLCanvasElement,
  stars: GalaxyStar[],
  onSelectStar: (id: string) => void,
): GalaxyScene {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: false,
    antialias: true,
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.01, 0.02, 0.06, 1);

  // ── Camera ──────────────────────────────────────────────────────
  // Initial radius ~8 pc shows the local neighbourhood (Sol + Alpha Cen etc.)
  // Zoom out to 15 000 pc to see the full Milky Way background.
  const camera = new ArcRotateCamera('cam', -Math.PI / 4, 1.0, 8, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 0.05;
  camera.upperRadiusLimit = 20_000;
  camera.wheelPrecision   = 2;
  camera.minZ             = 0.001;
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed    = 0.035;
    camera.autoRotationBehavior.idleRotationWaitTime = 4000;
  }

  // ── Ambient light ────────────────────────────────────────────────
  const light = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  light.intensity = 0.1;

  // ── Procedural background galaxy ─────────────────────────────────
  // Covers the outer Milky Way structure beyond HYG catalogue range.
  // Replaced by the real HYG point cloud once /stars.bin has loaded.
  const STAR_COUNT = 1_000_000;
  const { positions, colors } = generateGalaxyPoints(STAR_COUNT);
  const proceduralMesh = buildPointCloudMesh('galaxy', positions, colors, scene, 1.5);

  // ── Glow layer ───────────────────────────────────────────────────
  const glow = new GlowLayer('glow', scene);
  glow.intensity = 1.2;

  // ── Navigation star spheres ──────────────────────────────────────
  const starMeshes = new Map<string, Mesh>();

  for (const star of stars) {
    const isSol    = star.id === 'sol';
    const diameter = isSol ? 0.40 : Math.max(0.15, 0.32 - Math.max(0, star.magnitude) * 0.008);

    const sphere = MeshBuilder.CreateSphere(star.id, { diameter, segments: 12 }, scene);
    sphere.position = new Vector3(star.posX, star.posY, star.posZ);
    sphere.metadata = { starId: star.id };

    const mat          = new StandardMaterial(`mat-${star.id}`, scene);
    mat.emissiveColor  = isSol ? SOL_COLOR : STAR_COLOR;
    mat.disableLighting = true;
    sphere.material    = mat;

    // Limit glow to bright/named stars; faint catalogue stars don't need it
    // and adding 1000 meshes to the glow layer would tank performance.
    if (star.magnitude < 9 || isSol) {
      glow.addIncludedOnlyMesh(sphere);
    }
    starMeshes.set(star.id, sphere);
  }

  // ── Route lines ──────────────────────────────────────────────────
  let routeLines: Mesh[] = [];

  const updateRoute = (segments: ManeuverSegment[], activeSegmentId: string | null) => {
    routeLines.forEach((m) => m.dispose());
    routeLines = [];

    if (segments.length === 0) return;

    const fromStar = stars.find((s) => s.id === segments[0].fromStarId);
    const toStar   = stars.find((s) => s.id === segments[segments.length - 1].toStarId);
    if (!fromStar || !toStar || fromStar.id === toStar.id) return;

    const origin = new Vector3(fromStar.posX, fromStar.posY, fromStar.posZ);
    const dest   = new Vector3(toStar.posX,   toStar.posY,   toStar.posZ);

    // Split the route line into colored sections proportional to each segment's distance.
    const totalDist = segments.reduce((sum, s) => sum + s.distanceKm, 0);
    if (totalDist === 0) return;

    let cumFraction = 0;
    for (const segment of segments) {
      const frac = segment.distanceKm / totalDist;
      if (frac <= 0) continue;

      const p1 = Vector3.Lerp(origin, dest, cumFraction);
      const p2 = Vector3.Lerp(origin, dest, cumFraction + frac);
      cumFraction += frac;

      const line = MeshBuilder.CreateLines(`line-${segment.id}`, { points: [p1, p2] }, scene);
      line.color      = PHASE_COLOR[segment.phase] ?? Color3.White();
      line.alpha      = segment.id === activeSegmentId ? 1.0 : 0.80;
      line.isPickable = false;
      routeLines.push(line);
    }
  };

  // ── Proper-motion epoch update ───────────────────────────────────
  // Moves each star sphere to its position at J2000 + yearsFromNow.
  // pmX/Y/Z are in pc/yr in Babylon space.
  const updateEpoch = (yearsFromNow: number) => {
    for (const star of stars) {
      const mesh = starMeshes.get(star.id);
      if (!mesh) continue;
      const pmX = star.pmX ?? 0;
      const pmY = star.pmY ?? 0;
      const pmZ = star.pmZ ?? 0;
      mesh.position.set(
        star.posX + pmX * yearsFromNow,
        star.posY + pmY * yearsFromNow,
        star.posZ + pmZ * yearsFromNow,
      );
    }
  };

  // ── Stellar aberration ───────────────────────────────────────────
  // For a ship moving at beta = v/c along +Z (toward destination),
  // each star's apparent angle θ' satisfies:
  //   cos θ' = (cos θ + β) / (1 + β·cos θ)
  // We implement this by displacing each sphere's position to its
  // aberrated direction (same distance, shifted angle).
  const setAberrationBeta = (beta: number) => {
    if (Math.abs(beta) < 1e-6) {
      // Reset to epoch positions
      updateEpoch(0);
      return;
    }
    for (const star of stars) {
      const mesh = starMeshes.get(star.id);
      if (!mesh || star.id === 'sol') continue;

      const px = star.posX, py = star.posY, pz = star.posZ;
      const dist = Math.sqrt(px * px + py * py + pz * pz);
      if (dist < 1e-9) continue;

      // Ship moves along +Z; cos θ = pz / dist (angle from ship's heading)
      const cosTheta  = pz / dist;
      const cosThetaP = (cosTheta + beta) / (1.0 + beta * cosTheta);

      // Preserve the transverse direction, scale polar angle
      const sinThetaP = Math.sqrt(Math.max(0, 1.0 - cosThetaP * cosThetaP));
      const sinTheta  = Math.sqrt(Math.max(1e-30, 1.0 - cosTheta * cosTheta));
      const scale = sinTheta > 1e-9 ? sinThetaP / sinTheta : 1.0;

      mesh.position.set(
        px * scale,
        py * scale,
        pz * cosThetaP / (cosTheta === 0 ? 1 : Math.abs(cosTheta)) * (pz >= 0 ? 1 : -1) * (dist / dist),
      );
      // Proper Z coordinate: dist * cosThetaP
      mesh.position.z = dist * cosThetaP;
      mesh.position.x = px * scale;
      mesh.position.y = py * scale;
    }
  };

  // ── Star selection ───────────────────────────────────────────────
  const updateSelection = (starId: string) => {
    for (const [id, mesh] of starMeshes) {
      const mat = mesh.material as StandardMaterial;
      mat.emissiveColor = id === starId ? SELECT_COLOR : (id === 'sol' ? SOL_COLOR : STAR_COLOR);
      mesh.scaling.setAll(id === starId ? 1.6 : 1.0);
    }
  };

  // ── Pointer picking ──────────────────────────────────────────────
  scene.onPointerObservable.add((info) => {
    if (info.type !== PointerEventTypes.POINTERPICK) return;
    const starId = info.pickInfo?.pickedMesh?.metadata?.starId as string | undefined;
    if (starId) onSelectStar(starId);
  });

  // ── Start render loop ────────────────────────────────────────────
  engine.runRenderLoop(() => scene.render());

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  // ── Load real HYG star catalogue in the background ───────────────
  loadHygStars(scene, proceduralMesh).catch(() => {/* silently ignore */});

  return {
    updateSelection,
    updateRoute,
    updateEpoch,
    setAberrationBeta,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      engine.dispose();
    },
  };
}
