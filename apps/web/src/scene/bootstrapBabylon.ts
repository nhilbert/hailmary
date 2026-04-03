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
  const randN = () => (rand() + rand() + rand() - 1.5) / 1.5; // approx normal

  // 4 spiral arms: [startAngle, tightness]
  const arms = [
    [0,             0.30],
    [Math.PI,       0.30],
    [Math.PI / 2,   0.28],
    [1.5 * Math.PI, 0.28],
  ];

  let written = 0;
  let attempts = 0;
  const maxAttempts = count * 4;

  while (written < count && attempts < maxAttempts) {
    attempts++;
    const type = rand();
    let nx: number, ny: number, nz: number; // normalised [-1, 1]
    let brightness: number;
    let hue: number; // 0=blue, 0.5=white, 1=yellow-red

    if (type < 0.12) {
      // Central bulge — warm dense ellipsoid
      const r     = Math.pow(rand(), 0.5) * 0.20;
      const theta = rand() * Math.PI * 2;
      const phi   = Math.acos(2 * rand() - 1);
      nx = r * Math.sin(phi) * Math.cos(theta);
      ny = r * Math.cos(phi) * 0.35;
      nz = r * Math.sin(phi) * Math.sin(theta);
      brightness = 0.55 + rand() * 0.45;
      hue = 1;

    } else if (type < 0.72) {
      // Spiral arms
      const arm      = arms[Math.floor(rand() * arms.length)];
      const armAngle = arm[0];
      const tight    = arm[1];
      const t        = Math.pow(rand(), 0.55) * 0.9;
      const angle    = armAngle + t * Math.PI * 2.5 * tight;
      const spread   = 0.03 + t * 0.10;
      nx = (t * 0.9 + randN() * spread) * Math.cos(angle);
      nz = (t * 0.9 + randN() * spread) * Math.sin(angle);
      ny = randN() * 0.012 * (1 - t * 0.5);
      brightness = (1 - t * 0.5) * (0.35 + rand() * 0.65);
      hue = t < 0.3 ? 0 : 0.5;

    } else {
      // Disc halo — diffuse background
      const r     = Math.pow(rand(), 0.4) * 0.95;
      const theta = rand() * Math.PI * 2;
      nx = r * Math.cos(theta) + randN() * 0.04;
      nz = r * Math.sin(theta) + randN() * 0.04;
      ny = randN() * 0.020;
      brightness = 0.12 + rand() * 0.30;
      hue = 0.5 + rand() * 0.5;
    }

    // Scale to parsecs
    const scaledX = nx * GALAXY_RADIUS_PC;
    const scaledY = ny * GALAXY_RADIUS_PC * (DISC_THICKNESS_PC / GALAXY_RADIUS_PC / 0.012);
    const scaledZ = nz * GALAXY_RADIUS_PC;

    // Exclude inner sphere (covered by HYG point cloud)
    const dist2 = scaledX * scaledX + scaledY * scaledY + scaledZ * scaledZ;
    if (dist2 < GALAXY_MIN_DIST_PC * GALAXY_MIN_DIST_PC) continue;

    positions[written * 3]     = scaledX;
    positions[written * 3 + 1] = scaledY;
    positions[written * 3 + 2] = scaledZ;

    const r = Math.min(1, brightness * (0.55 + hue * 0.55));
    const g = Math.min(1, brightness * (0.65 + hue * 0.10));
    const b = Math.min(1, brightness * (1.00 - hue * 0.50));
    colors[written * 4]     = r;
    colors[written * 4 + 1] = g;
    colors[written * 4 + 2] = b;
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
  const STAR_COUNT = 500_000;
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

    glow.addIncludedOnlyMesh(sphere);
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
    dispose: () => {
      window.removeEventListener('resize', onResize);
      engine.dispose();
    },
  };
}
