import * as THREE from 'three';
import { groundHeight, COURSE_LENGTH, OBSTACLES, COINS, FINISH_X } from './terrain.js';

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

const TERRAIN_SAMPLE_STEP = 2;
const TERRAIN_PAD = 20; // extra ground drawn before start / after finish

/** Builds a filled silhouette shape mesh from a height function sampled over [x0, x1]. */
function buildSilhouette(x0, x1, heightFn, bottomY, color, step = TERRAIN_SAMPLE_STEP) {
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

function buildMountainLayers() {
  const layers = [];
  for (const cfg of MOUNTAIN_LAYERS) {
    const heightFn = (x) =>
      cfg.baseY + cfg.amp * Math.sin(x * cfg.freq + cfg.phase) + cfg.amp * 0.4 * Math.sin(x * cfg.freq * 2.3);
    const mesh = buildSilhouette(-200, COURSE_LENGTH + 200, heightFn, -40, cfg.color, 4);
    mesh.position.z = cfg.z;
    layers.push({ mesh, depthFactor: cfg.depthFactor });
  }
  return layers;
}

function buildTerrain() {
  const group = new THREE.Group();
  const x0 = -TERRAIN_PAD;
  const x1 = FINISH_X + TERRAIN_PAD;

  const base = buildSilhouette(x0, x1, groundHeight, -60, SNOW_SHADE);
  base.position.z = -0.5;
  group.add(base);

  const top = buildSilhouette(x0, x1, groundHeight, -60, SNOW_COLOR);
  top.position.z = -0.3;
  group.add(top);

  return group;
}

function buildObstacleMeshes() {
  const group = new THREE.Group();
  for (const o of OBSTACLES) {
    let mesh;
    if (o.type === 'rock') {
      const geo = new THREE.CircleGeometry(o.width / 2, 12, 0, Math.PI);
      const mat = new THREE.MeshBasicMaterial({ color: ROCK_COLOR });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(o.x, groundHeight(o.x), 0.1);
    } else {
      const shape = new THREE.Shape();
      shape.moveTo(-o.width / 2, 0);
      shape.lineTo(o.width / 2, 0);
      shape.lineTo(o.width / 2, o.height);
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({ color: RAMP_COLOR });
      mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(o.x - o.width / 2, groundHeight(o.x - o.width / 2), 0.1);
    }
    group.add(mesh);
  }
  return group;
}

function buildCoinMeshes() {
  const coins = [];
  const geo = new THREE.CircleGeometry(0.35, 16);
  const mat = new THREE.MeshBasicMaterial({ color: COIN_COLOR });
  for (const c of COINS) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(c.x, groundHeight(c.x) + c.height, 0.2);
    coins.push({ mesh, x: c.x, collected: false });
  }
  return coins;
}

function buildFinishFlag() {
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

  group.position.set(FINISH_X, groundHeight(FINISH_X), 0);
  return group;
}

export function buildScene() {
  const scene = new THREE.Scene();

  const sky = buildSky();
  scene.add(sky);

  const mountainLayers = buildMountainLayers();
  mountainLayers.forEach((l) => scene.add(l.mesh));

  const terrain = buildTerrain();
  scene.add(terrain);

  const obstacles = buildObstacleMeshes();
  scene.add(obstacles);

  const coins = buildCoinMeshes();
  coins.forEach((c) => scene.add(c.mesh));

  const finish = buildFinishFlag();
  scene.add(finish);

  return { scene, mountainLayers, coins, sky };
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
