import * as THREE from 'three';
import { buildScene, createRenderer, createCamera, resizeCamera, updateParallax } from './scene.js';
import { Player } from './player.js';
import { Controls } from './controls.js';
import { GameUI } from './ui.js';
import { FINISH_X } from './terrain.js';

const canvas = document.getElementById('scene');

const { scene, mountainLayers, coins } = buildScene();
const renderer = createRenderer(canvas);
const camera = createCamera();

let player = new Player();
scene.add(player.mesh);

const ui = new GameUI();
const controls = new Controls(renderer.domElement, player);

let cameraY = player.y;
const clock = new THREE.Clock();
let running = false;

const TRICK_LABELS = { 1: 'Flip!', 2: 'Double Flip!', 3: 'Triple Flip!' };

function resetCoins() {
  for (const c of coins) {
    c.collected = false;
    c.mesh.visible = true;
  }
}

function resetRun() {
  scene.remove(player.mesh);
  player = new Player();
  scene.add(player.mesh);
  controls.player = player;
  resetCoins();
  ui.reset();
  cameraY = player.y;
  ui.hideAllOverlays();
}

function beginGame() {
  resetRun();
  running = true;
  clock.getDelta(); // reset delta accumulation from idle time on the start screen
}

function checkCoinPickups() {
  for (const c of coins) {
    if (c.collected) continue;
    const dx = player.x - c.mesh.position.x;
    const dy = player.y - c.mesh.position.y;
    if (dx * dx + dy * dy < 0.6 * 0.6) {
      c.collected = true;
      c.mesh.visible = false;
      ui.addCoin();
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  if (running) {
    const events = player.update(dt);
    checkCoinPickups();

    if (events.trickBonus > 0) {
      const spins = Math.round(events.trickBonus / 50);
      ui.addTrickBonus(events.trickBonus, TRICK_LABELS[spins] || `${spins}x Flip!`);
    }

    if (events.crashed) {
      running = false;
      ui.showCrash(beginGame);
    } else if (player.state === 'running' && player.x >= FINISH_X) {
      player.state = 'finished';
      running = false;
      ui.showWin(beginGame);
    }

    ui.distance = player.x;
    ui.updateHUD(player.x / FINISH_X);

    cameraY += (player.y - cameraY) * Math.min(1, dt * 3);
    camera.position.x = player.x;
    camera.position.y = Math.max(cameraY, player.y - 2) + 1.5;
    updateParallax(mountainLayers, camera.position.x);
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  resizeCamera(camera);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

ui.reset();
ui.showStart(beginGame);
animate();
