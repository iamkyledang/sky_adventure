import * as THREE from 'three';
import { buildScene, createRenderer, createCamera, resizeCamera, updateParallax } from './scene.js';
import { buildRiderMesh } from './riderView.js';
import { Controls } from './controls.js';
import { GameUI } from './ui.js';
import * as pyBridge from './pyBridge.js';

const canvas = document.getElementById('scene');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

const renderer = createRenderer(canvas);
const camera = createCamera();
const ui = new GameUI();
const clock = new THREE.Clock();

const TRICK_LABELS = { 1: 'Flip!', 2: 'Double Flip!', 3: 'Triple Flip!' };

let scene = null;
let mountainLayers = [];
let coins = [];
let riderMesh = null;
let running = false;
let cameraY = 0;

function applyState(state) {
  riderMesh.position.set(state.x, state.y, 0.5);
  riderMesh.rotation.z = state.rotation;
}

function positionCamera(state) {
  cameraY = state.y;
  camera.position.x = state.x;
  camera.position.y = state.y + 1.5;
}

function beginGame() {
  const state = pyBridge.resetGame();
  applyState(state);
  positionCamera(state);
  coins.forEach((c) => (c.mesh.visible = true));
  ui.reset();
  ui.hideAllOverlays();
  running = true;
  clock.getDelta(); // discard idle-time delta accumulated on the start screen
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  if (running) {
    const state = pyBridge.step(dt);
    applyState(state);

    for (const idx of state.coins_collected) {
      coins[idx].mesh.visible = false;
      ui.addCoin();
    }

    if (state.trick_bonus > 0) {
      const spins = Math.round(state.trick_bonus / 50);
      ui.addTrickBonus(state.trick_bonus, TRICK_LABELS[spins] || `${spins}x Flip!`);
    }

    if (state.crashed) {
      running = false;
      ui.showCrash(beginGame);
    } else if (state.finished) {
      running = false;
      ui.showWin(beginGame);
    }

    ui.distance = state.x;
    ui.updateHUD(state.progress);

    cameraY += (state.y - cameraY) * Math.min(1, dt * 3);
    camera.position.x = state.x;
    camera.position.y = Math.max(cameraY, state.y - 2) + 1.5;
    updateParallax(mountainLayers, camera.position.x);
  }

  renderer.render(scene, camera);
}

async function boot() {
  try {
    await pyBridge.initPyodide((message) => {
      loadingText.textContent = message;
    });

    const courseData = pyBridge.getCourseData();
    const built = buildScene(courseData);
    scene = built.scene;
    mountainLayers = built.mountainLayers;
    coins = built.coins;

    riderMesh = buildRiderMesh();
    scene.add(riderMesh);

    // eslint-disable-next-line no-new
    new Controls(renderer.domElement, {
      onStart: () => pyBridge.startCharge(),
      onRelease: () => pyBridge.releaseCharge(),
    });

    const state = pyBridge.resetGame();
    applyState(state);
    positionCamera(state);

    loadingOverlay.classList.add('hidden');
    ui.showStart(beginGame);
    animate();
  } catch (err) {
    loadingText.textContent = 'Failed to load. Please check your connection and reload the page.';
    console.error(err);
  }
}

window.addEventListener('resize', () => {
  resizeCamera(camera);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

boot();
