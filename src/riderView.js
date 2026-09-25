import * as THREE from 'three';

const BODY_COLOR = 0x2b3140;
const BOARD_COLOR = 0xff8a3d;

/** Builds the visual-only rider mesh (board + body + head). No physics here - see public/py/player.py. */
export function buildRiderMesh() {
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
