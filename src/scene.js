import * as THREE from 'three';

const SKY_TOP = 0x8ec9ff;
const SKY_BOTTOM = 0xe8f6ff;
const SNOW_COLOR = 0xf4f8ff;
const SNOW_SHADE = 0xcfe0f2;
const ROCK_COLOR = 0x5b6472;
const RAMP_COLOR = 0xdde7f5;
const COIN_COLOR = 0xffd23f;
const FLAG_POLE_COLOR = 0x6b7280;
const FLAG_COLOR = 0xff5c5c;

const MOUNTAIN_LAYERS = [
  { depthFactor: 0.15, z: -30, color: 0xb9d3ee, amp: 14, freq: 0.02, baseY: 6, phase: 0.4 },
  { depthFactor: 0.35, z: -20, color: 0x9fc0e6, amp: 10, freq: 0.03, baseY: 2, phase: 2.1 },
  { depthFactor: 0.6, z: -10, color: 0x86a9d6, amp: 7, freq: 0.045, baseY: -2, phase: 4.0 },
];

/** Builds a filled silhouette mesh from a height function sampled over [x0, x1]. Purely decorative - not game logic. */
function buildSilhouette(x0, x1, heightFn, bottomY, color, step = 4) {
  const shape = new THREE.Shape();
  shape.moveTo(x0, bottomY);
  for (let x = x0; x <= x1; x += step) {
    shape.lineTo(x, heightFn(x));
  }
  shape.lineTo(x1, heightFn(x1));
  shape.lineTo(x1, bottomY);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

/** Builds a filled silhouette mesh directly from precomputed [x, y] samples (the real course terrain, from Python). */
function buildSilhouetteFromSamples(samples, bottomY, color) {
  const shape = new THREE.Shape();
  shape.moveTo(samples[0][0], bottomY);
  for (const [x, y] of samples) shape.lineTo(x, y);
  const last = samples[samples.length - 1];
  shape.lineTo(last[0], bottomY);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

function buildSky() {
  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(SKY_TOP) },
      bottomColor: { value: new THREE.Color(SKY_BOTTOM) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      void main() {
        gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
      }
    `,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;
  return mesh;
}

function buildMountainLayers(courseLength) {
  const layers = [];
  for (const cfg of MOUNTAIN_LAYERS) {
    const heightFn = (x) =>
      cfg.baseY + cfg.amp * Math.sin(x * cfg.freq + cfg.phase) + cfg.amp * 0.4 * Math.sin(x * cfg.freq * 2.3);
    const mesh = buildSilhouette(-200, courseLength + 200, heightFn, -40, cfg.color, 4);
    mesh.position.z = cfg.z;
    layers.push({ mesh, depthFactor: cfg.depthFactor });
  }
  return layers;
}

function buildTerrain(courseData) {
  const group = new THREE.Group();

  const base = buildSilhouetteFromSamples(courseData.ground_samples, -60, SNOW_SHADE);
  base.position.z = -0.5;
  group.add(base);

  const top = buildSilhouetteFromSamples(courseData.ground_samples, -60, SNOW_COLOR);
  top.position.z = -0.3;
  group.add(top);

  return group;
}

function buildObstacleMeshes(courseData) {
  const group = new THREE.Group();
  for (const o of courseData.obstacles) {
    let mesh;
    if (o.type === 'rock') {
      const geo = new THREE.CircleGeometry(o.width / 2, 12, 0, Math.PI);
      mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: ROCK_COLOR }));
    } else {
      const shape = new THREE.Shape();
      shape.moveTo(-o.width / 2, 0);
      shape.lineTo(o.width / 2, 0);
      shape.lineTo(o.width / 2, o.height);
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: RAMP_COLOR }));
    }
    mesh.position.set(o.anchor_x, o.ground_y, 0.1);
    group.add(mesh);
  }
  return group;
}

function buildCoinMeshes(courseData) {
  const coins = [];
  const geo = new THREE.CircleGeometry(0.35, 16);
  const mat = new THREE.MeshBasicMaterial({ color: COIN_COLOR });
  for (const c of courseData.coins) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(c.x, c.y, 0.2);
    coins.push({ mesh });
  }
  return coins;
}

function buildFinishFlag(courseData) {
  const group = new THREE.Group();
  const poleGeo = new THREE.PlaneGeometry(0.15, 4);
  const poleMat = new THREE.MeshBasicMaterial({ color: FLAG_POLE_COLOR });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(0, 2, 0.15);
  group.add(pole);

  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 3.6);
  flagShape.lineTo(1.1, 3.2);
  flagShape.lineTo(0, 2.8);
  flagShape.closePath();
  const flagGeo = new THREE.ShapeGeometry(flagShape);
  const flagMat = new THREE.MeshBasicMaterial({ color: FLAG_COLOR, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(0, 0, 0.16);
  group.add(flag);

  group.position.set(courseData.finish_x, courseData.finish_ground_y, 0);
  return group;
}

/** Builds the Three.js scene from course data produced by Python (public/py/game.py). Rendering only - no gameplay logic. */
export function buildScene(courseData) {
  const scene = new THREE.Scene();

  scene.add(buildSky());

  const mountainLayers = buildMountainLayers(courseData.course_length);
  mountainLayers.forEach((l) => scene.add(l.mesh));

  scene.add(buildTerrain(courseData));
  scene.add(buildObstacleMeshes(courseData));

  const coins = buildCoinMeshes(courseData);
  coins.forEach((c) => scene.add(c.mesh));

  scene.add(buildFinishFlag(courseData));

  return { scene, mountainLayers, coins };
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  return renderer;
}

const VIEW_HEIGHT = 16; // world units visible vertically

export function createCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfH = VIEW_HEIGHT / 2;
  const halfW = halfH * aspect;
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, -100, 100);
  camera.position.z = 10;
  return camera;
}

export function resizeCamera(camera) {
  const aspect = window.innerWidth / window.innerHeight;
  const halfH = VIEW_HEIGHT / 2;
  const halfW = halfH * aspect;
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}

/** Applies parallax offset to background layers based on camera x. */
export function updateParallax(mountainLayers, cameraX) {
  for (const { mesh, depthFactor } of mountainLayers) {
    mesh.position.x = cameraX * (1 - depthFactor);
  }
}
