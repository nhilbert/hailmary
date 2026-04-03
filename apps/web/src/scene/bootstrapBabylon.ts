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

const LIGHT_YEARS_PER_UNIT = 1; // 1 Babylon unit = 1 light-year
const GALAXY_RADIUS_LY = 50_000; // Milky Way ~100,000 ly diameter
const GALAXY_SCALE = 0.0004;     // scale galaxy to fit scene nicely (~20 units radius)
const LOCAL_SCALE = 1.0;         // nearby stars are at real ly coordinates

const SOL_COLOR    = new Color3(1.00, 0.90, 0.50);
const STAR_COLOR   = new Color3(0.65, 0.82, 1.00);
const SELECT_COLOR = new Color3(1.00, 1.00, 0.60);

const PHASE_COLOR: Record<RoutePhase, Color3> = {
  departure: Color3.FromHexString('#81dbff'),
  transfer:  Color3.FromHexString('#b39aff'),
  insertion: Color3.FromHexString('#8af8c2'),
  coast:     Color3.FromHexString('#ffd98d'),
};

// ── Galaxy point cloud generation ─────────────────────────────────────────

/**
 * Generates a procedural Milky Way point cloud.
 * Based on known structure: central bulge, bar, 4 spiral arms, thin disc.
 * Returns Float32Arrays for positions (x,y,z) and colors (r,g,b,a) interleaved.
 */
function generateGalaxyPoints(count: number): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);

  const rand = () => Math.random();
  const randN = () => (rand() + rand() + rand() - 1.5) / 1.5; // approx normal

  // Arm definitions: [angle offset, tightness]
  const arms = [
    [0,           0.3],
    [Math.PI,     0.3],
    [Math.PI / 2, 0.28],
    [1.5 * Math.PI, 0.28],
  ];

  for (let i = 0; i < count; i++) {
    const type = rand();
    let x: number, y: number, z: number;
    let brightness: number;
    let hue: number; // 0=blue, 1=yellow, 2=red

    if (type < 0.15) {
      // Central bulge — dense ellipsoid
      const r = Math.pow(rand(), 0.5) * 0.25;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.cos(phi) * 0.4; // flatten
      z = r * Math.sin(phi) * Math.sin(theta);
      brightness = 0.6 + rand() * 0.4;
      hue = 1; // warm yellow-white bulge stars

    } else if (type < 0.75) {
      // Spiral arms
      const arm = arms[Math.floor(rand() * arms.length)];
      const armAngle = arm[0];
      const tightness = arm[1];
      const t = Math.pow(rand(), 0.6) * 0.9; // distance along arm (0=center, 1=edge)
      const angle = armAngle + t * Math.PI * 2.5 * tightness;
      const spread = 0.04 + t * 0.12;
      x = (t * 0.9 + randN() * spread) * Math.cos(angle);
      z = (t * 0.9 + randN() * spread) * Math.sin(angle);
      y = randN() * 0.015 * (1 - t * 0.5); // thin disc, thicker at center
      brightness = (1 - t * 0.5) * (0.4 + rand() * 0.6);
      hue = t < 0.3 ? 0 : 0.5; // inner arm bluer, outer more yellow

    } else {
      // Disc halo — diffuse background stars
      const r = Math.pow(rand(), 0.4) * 0.95;
      const theta = rand() * Math.PI * 2;
      x = r * Math.cos(theta) + randN() * 0.05;
      z = r * Math.sin(theta) + randN() * 0.05;
      y = randN() * 0.025;
      brightness = 0.15 + rand() * 0.35;
      hue = 0.5 + rand() * 0.5; // mixed
    }

    // Scale to scene units
    const S = GALAXY_SCALE * GALAXY_RADIUS_LY;
    positions[i * 3]     = x * S;
    positions[i * 3 + 1] = y * S;
    positions[i * 3 + 2] = z * S;

    // Color: blue (hue=0) → white (0.5) → yellow-red (1)
    const r = Math.min(1, brightness * (0.6 + hue * 0.5));
    const g = Math.min(1, brightness * (0.7 + hue * 0.1));
    const b = Math.min(1, brightness * (1.0 - hue * 0.5));
    colors[i * 4]     = r;
    colors[i * 4 + 1] = g;
    colors[i * 4 + 2] = b;
    colors[i * 4 + 3] = 1;
  }

  return { positions, colors };
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

  // ── Camera ──────────────────────────────────────────────────
  const camera = new ArcRotateCamera('cam', -Math.PI / 4, 1.0, 28, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 120;
  camera.wheelPrecision = 5;
  camera.minZ = 0.01;
  camera.useAutoRotationBehavior = true;
  if (camera.autoRotationBehavior) {
    camera.autoRotationBehavior.idleRotationSpeed = 0.035;
    camera.autoRotationBehavior.idleRotationWaitTime = 4000;
  }

  // ── Ambient light ────────────────────────────────────────────
  const light = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  light.intensity = 0.1;

  // ── Galaxy point cloud ───────────────────────────────────────
  const STAR_COUNT = 500_000;
  const { positions, colors } = generateGalaxyPoints(STAR_COUNT);

  const galaxyMesh = new Mesh('galaxy', scene);
  const vd = new VertexData();
  vd.positions = positions;
  vd.colors = colors;
  // Create trivial indices so the mesh is valid
  const indices = new Int32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) indices[i] = i;
  vd.indices = indices;
  vd.applyToMesh(galaxyMesh);

  const galaxyMat = new StandardMaterial('galaxy-mat', scene);
  galaxyMat.emissiveColor = Color3.White();
  galaxyMat.disableLighting = true;
  galaxyMat.pointsCloud = true;
  galaxyMat.pointSize = 1.5;
  galaxyMesh.material = galaxyMat;
  galaxyMesh.isPickable = false;

  // ── Glow layer ───────────────────────────────────────────────
  const glow = new GlowLayer('glow', scene);
  glow.intensity = 1.2;

  // ── Navigation star spheres ──────────────────────────────────
  const starMeshes = new Map<string, Mesh>();

  for (const star of stars) {
    const isSol = star.id === 'sol';
    const diameter = isSol ? 0.65 : Math.max(0.28, 0.5 - Math.max(0, star.magnitude) * 0.02);

    const sphere = MeshBuilder.CreateSphere(star.id, { diameter, segments: 12 }, scene);
    sphere.position = new Vector3(star.posX, star.posY, star.posZ);
    sphere.metadata = { starId: star.id };

    const mat = new StandardMaterial(`mat-${star.id}`, scene);
    mat.emissiveColor = isSol ? SOL_COLOR : STAR_COLOR;
    mat.disableLighting = true;
    sphere.material = mat;

    glow.addIncludedOnlyMesh(sphere);
    starMeshes.set(star.id, sphere);
  }

  // ── Route lines ──────────────────────────────────────────────
  let routeLines: Mesh[] = [];

  const updateRoute = (segments: ManeuverSegment[], activeSegmentId: string | null) => {
    routeLines.forEach((m) => m.dispose());
    routeLines = [];

    for (const segment of segments) {
      const from = stars.find((s) => s.id === segment.fromStarId);
      const to   = stars.find((s) => s.id === segment.toStarId);
      if (!from || !to || from.id === to.id) continue;

      const line = MeshBuilder.CreateLines(`line-${segment.id}`, {
        points: [
          new Vector3(from.posX, from.posY, from.posZ),
          new Vector3(to.posX,   to.posY,   to.posZ),
        ],
      }, scene);
      const isActive = segment.id === activeSegmentId;
      line.color = PHASE_COLOR[segment.phase] ?? Color3.White();
      line.alpha = isActive ? 1.0 : 0.55;
      line.isPickable = false;
      routeLines.push(line);
    }
  };

  // ── Star selection ───────────────────────────────────────────
  const updateSelection = (starId: string) => {
    for (const [id, mesh] of starMeshes) {
      const mat = mesh.material as StandardMaterial;
      const isSol      = id === 'sol';
      const isSelected = id === starId;
      mat.emissiveColor = isSelected ? SELECT_COLOR : (isSol ? SOL_COLOR : STAR_COLOR);
      mesh.scaling.setAll(isSelected ? 1.6 : 1.0);
    }
  };

  // ── Pointer picking ──────────────────────────────────────────
  scene.onPointerObservable.add((info) => {
    if (info.type !== PointerEventTypes.POINTERPICK) return;
    const starId = info.pickInfo?.pickedMesh?.metadata?.starId as string | undefined;
    if (starId) onSelectStar(starId);
  });

  // ── Render loop ──────────────────────────────────────────────
  engine.runRenderLoop(() => scene.render());

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  return {
    updateSelection,
    updateRoute,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      engine.dispose();
    },
  };
}
