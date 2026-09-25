import * as THREE from 'three';
import { groundHeight, slopeAt, obstacleAt } from './terrain.js';

export const PLAYER_HALF_HEIGHT = 0.5;
const GRAVITY = -26;
const MIN_SPEED = 9;
const MAX_SPEED = 26;
const SLOPE_ACCEL = 34; // how strongly downhill slope speeds you up
const JUMP_BASE = 8;
const JUMP_CHARGE_MAX = 6.5; // added on top of JUMP_BASE at full charge
const MAX_CHARGE_TIME = 0.55; // seconds of holding to reach full charge
const RAMP_LAUNCH_BOOST = 11;
const SPIN_SPEED = Math.PI * 2.2; // radians/sec while spinning
const LANDING_TOLERANCE = 0.35; // radians of allowed rotation error on landing

const BODY_COLOR = 0x2b3140;
const BOARD_COLOR = 0xff8a3d;

function buildRiderMesh() {
  const group = new THREE.Group();

  const boardGeo = new THREE.PlaneGeometry(1.5, 0.22);
  const boardMat = new THREE.MeshBasicMaterial({ color: BOARD_COLOR });
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, -0.4, 0.05);
  group.add(board);

  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-0.28, -0.3);
  bodyShape.lineTo(-0.22, 0.35);
  bodyShape.quadraticCurveTo(0, 0.55, 0.22, 0.35);
  bodyShape.lineTo(0.28, -0.3);
  bodyShape.closePath();
  const bodyGeo = new THREE.ShapeGeometry(bodyShape);
  const bodyMat = new THREE.MeshBasicMaterial({ color: BODY_COLOR });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0, 0.06);
  group.add(body);

  const headGeo = new THREE.CircleGeometry(0.22, 16);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 0.65, 0.06);
  group.add(head);

  return group;
}

export class Player {
  constructor() {
    this.x = 0;
    this.y = groundHeight(0) + PLAYER_HALF_HEIGHT;
    this.vy = 0;
    this.speed = MIN_SPEED + 3;
    this.grounded = true;
    this.rotation = 0;
    this.spinVelocity = 0;
    this.totalRotation = 0;
    this.state = 'running'; // running | airborne | crashed | finished
    this.chargeTime = 0;
    this.charging = false;
    this.mesh = buildRiderMesh();
    this._lastRampX = null;
  }

  startCharge() {
    if (this.state !== 'running' && this.state !== 'airborne') return;
    if (this.grounded) {
      this.charging = true;
      this.chargeTime = 0;
    } else {
      // Airborne tap: begin/continue a trick spin.
      this.spinVelocity = SPIN_SPEED;
    }
  }

  releaseCharge() {
    if (this.charging && this.grounded) {
      const t = Math.min(this.chargeTime, MAX_CHARGE_TIME);
      const power = t / MAX_CHARGE_TIME;
      this.vy = JUMP_BASE + JUMP_CHARGE_MAX * power;
      this.grounded = false;
      this.state = 'airborne';
      this.totalRotation = 0;
    }
    this.charging = false;
    this.chargeTime = 0;
  }

  /** Advances physics by dt seconds. Returns an event object describing what happened. */
  update(dt) {
    const events = { crashed: false, landed: false, trickBonus: 0 };
    if (this.state === 'crashed' || this.state === 'finished') return events;

    if (this.charging && this.grounded) {
      this.chargeTime += dt;
    }

    const slope = slopeAt(this.x);
    this.speed += -slope * SLOPE_ACCEL * dt;
    this.speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, this.speed));
    this.x += this.speed * dt;

    const ground = groundHeight(this.x);

    if (this.grounded) {
      this.y = ground + PLAYER_HALF_HEIGHT;
      this.rotation = Math.atan(slopeAt(this.x));

      const obstacle = obstacleAt(this.x);
      if (obstacle && obstacle.type === 'rock') {
        this.state = 'crashed';
        events.crashed = true;
        return events;
      }
      if (obstacle && obstacle.type === 'ramp' && this._lastRampX !== obstacle.x) {
        this._lastRampX = obstacle.x;
        this.vy = RAMP_LAUNCH_BOOST;
        this.grounded = false;
        this.state = 'airborne';
        this.totalRotation = 0;
        this.charging = false;
      }
    } else {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;

      if (this.spinVelocity !== 0) {
        const delta = this.spinVelocity * dt;
        this.rotation += delta;
        this.totalRotation += delta;
      }

      const floor = ground + PLAYER_HALF_HEIGHT;
      if (this.y <= floor && this.vy <= 0) {
        this.y = floor;
        this.vy = 0;
        this.grounded = true;
        this.spinVelocity = 0;

        const obstacle = obstacleAt(this.x);
        if (obstacle && obstacle.type === 'rock') {
          this.state = 'crashed';
          events.crashed = true;
          return events;
        }

        const spins = this.totalRotation / (Math.PI * 2);
        const nearestWhole = Math.round(spins);
        const error = Math.abs(spins - nearestWhole) * Math.PI * 2;
        const attemptedTrick = Math.abs(this.totalRotation) > 0.5;

        if (attemptedTrick && error <= LANDING_TOLERANCE && nearestWhole !== 0) {
          events.trickBonus = Math.abs(nearestWhole) * 50;
          this.rotation = 0;
        } else if (attemptedTrick) {
          // Wipeout: bad landing costs speed but the run continues.
          this.speed = Math.max(MIN_SPEED, this.speed * 0.35);
          this.rotation = 0;
        } else {
          this.rotation = Math.atan(slopeAt(this.x));
        }

        this.state = 'running';
        events.landed = true;
        this.totalRotation = 0;
      }
    }

    this.mesh.position.set(this.x, this.y, 0.5);
    this.mesh.rotation.z = this.rotation;

    return events;
  }
}
