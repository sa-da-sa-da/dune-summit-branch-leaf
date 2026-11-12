import * as THREE from "three";

/** MuJoCo (x forward, y left, z up) → three.js (x right, y up, z toward viewer). */
export const MJ_TO_THREE = new THREE.Matrix4().set(
  0, -1, 0, 0,
  0, 0, 1, 0,
  -1, 0, 0, 0,
  0, 0, 0, 1,
);
const THREE_TO_MJ = MJ_TO_THREE.clone().transpose();

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _out = new THREE.Quaternion();

export function mjToThree(x: number, y: number, z: number, target: THREE.Vector3) {
  target.set(-y, z, -x);
  return target;
}

export function threeToMj(x: number, y: number, z: number): [number, number, number] {
  return [-z, -x, y];
}

export function mjQuatToThree(w: number, x: number, y: number, z: number, target: THREE.Quaternion) {
  _q.set(x, y, z, w);
  _m.makeRotationFromQuaternion(_q);
  _m.premultiply(MJ_TO_THREE).multiply(THREE_TO_MJ);
  return target.copy(_out.setFromRotationMatrix(_m));
}

export const AXIS_HIP = new THREE.Vector3(0, 0, -1);
export const AXIS_LEG = new THREE.Vector3(-1, 0, 0);
