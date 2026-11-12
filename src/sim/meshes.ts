import * as THREE from "three";
import { AXIS_HIP, AXIS_LEG, MJ_TO_THREE, mjQuatToThree, mjToThree } from "@/sim/frame";
import { HIP, type Sample } from "@/sim/reference";

const SIDE = [1, -1, 1, -1];

const COLOR: Record<string, number> = {
  base_0: 0x1c1e20,
  base_1: 0x1c1e20,
  base_2: 0x16181a,
  base_3: 0xf3f0e8,
  base_4: 0x8e97a6,
  hip_0: 0xd7e2e4,
  hip_1: 0x8e97a6,
  thigh_0: 0xd7e2e4,
  thigh_1: 0x8e97a6,
  thigh_mirror_0: 0xd7e2e4,
  thigh_mirror_1: 0x8e97a6,
  calf_0: 0x8e97a6,
  calf_1: 0x1c1e20,
  calf_mirror_0: 0x8e97a6,
  calf_mirror_1: 0x1c1e20,
  foot: 0x141618,
};

/** Hip visual quaternions from the Menagerie MJCF, (w, x, y, z). */
const HIP_Q: [number, number, number, number][] = [
  [1, 0, 0, 0],
  [4.63268e-05, 1, 0, 0],
  [4.63268e-05, 0, 1, 0],
  [2.14617e-09, 4.63268e-05, 4.63268e-05, -1],
];

export type Rig = {
  root: THREE.Group;
  hips: THREE.Group[];
  thighs: THREE.Group[];
  calves: THREE.Group[];
  feet: THREE.Object3D[];
};

export async function loadGeometries(onProgress?: (p: number) => void) {
  const res = await fetch("/models/go2/pack.bin");
  if (!res.ok) throw new Error("外形包加载失败");
  const buf = await res.arrayBuffer();
  onProgress?.(0.4);
  const dv = new DataView(buf);
  const bytes = new Uint8Array(buf);
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "G2PK") {
    throw new Error("外形包格式不对");
  }
  const count = dv.getUint32(8, true);
  const geos = new Map<string, THREE.BufferGeometry>();
  let o = 12;
  for (let p = 0; p < count; p++) {
    const nl = dv.getUint8(o);
    o += 1;
    const name = new TextDecoder().decode(bytes.subarray(o, o + nl));
    o += nl;
    const vc = dv.getUint32(o, true);
    o += 4;
    const ic = dv.getUint32(o, true);
    o += 4;
    const scale = [dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)];
    o += 12;
    const offset = [dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)];
    o += 12;
    const pos = new Float32Array(vc * 3);
    const nor = new Float32Array(vc * 3);
    for (let i = 0; i < vc; i++) {
      for (let k = 0; k < 3; k++) {
        const q = dv.getInt16(o, true);
        o += 2;
        const t = (q / 32767 + 1) / 2;
        pos[i * 3 + k] = t * scale[k] + offset[k];
      }
    }
    for (let i = 0; i < vc; i++) {
      for (let k = 0; k < 3; k++) {
        nor[i * 3 + k] = dv.getInt8(o) / 127;
        o += 1;
      }
    }
    const idx = new Uint32Array(ic);
    for (let i = 0; i < ic; i++) {
      idx[i] = dv.getUint16(o, true);
      o += 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.applyMatrix4(MJ_TO_THREE);
    geos.set(name, geo);
    onProgress?.(0.4 + (0.5 * (p + 1)) / count);
  }
  return geos;
}

function material(name: string, ghost: boolean) {
  return new THREE.MeshStandardMaterial({
    color: ghost ? 0xe85d04 : (COLOR[name] ?? 0x888888),
    roughness: ghost ? 1 : 0.62,
    metalness: ghost ? 0 : 0.18,
    transparent: ghost,
    opacity: ghost ? 0.28 : 1,
    depthWrite: !ghost,
    emissive: ghost ? 0x5a2408 : 0x000000,
    emissiveIntensity: ghost ? 0.35 : 0,
  });
}

function mesh(geo: THREE.BufferGeometry, name: string, ghost: boolean, quat?: [number, number, number, number]) {
  const m = new THREE.Mesh(geo, material(name, ghost));
  m.castShadow = !ghost;
  m.receiveShadow = !ghost;
  if (quat) {
    const q = new THREE.Quaternion();
    mjQuatToThree(quat[0], quat[1], quat[2], quat[3], q);
    m.quaternion.copy(q);
  }
  return m;
}

export function buildRig(geos: Map<string, THREE.BufferGeometry>, ghost: boolean): Rig {
  const root = new THREE.Group();
  root.name = ghost ? "ghost" : "robot";
  for (const part of ["base_0", "base_1", "base_2", "base_3", "base_4"]) {
    const g = geos.get(part);
    if (g) root.add(mesh(g, part, ghost));
  }
  const hips: THREE.Group[] = [];
  const thighs: THREE.Group[] = [];
  const calves: THREE.Group[] = [];
  const feet: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const rear = i >= 2;
    const mirror = i === 1 || i === 3;
    const hip = new THREE.Group();
    const p = new THREE.Vector3();
    mjToThree(HIP[i][0], HIP[i][1], HIP[i][2], p);
    hip.position.copy(p);
    for (const part of ["hip_0", "hip_1"]) {
      const g = geos.get(part);
      if (g) hip.add(mesh(g, part, ghost, HIP_Q[i]));
    }
    const thigh = new THREE.Group();
    thigh.position.set(-SIDE[i] * 0.0955, 0, 0);
    for (const part of mirror ? ["thigh_mirror_0", "thigh_mirror_1"] : ["thigh_0", "thigh_1"]) {
      const g = geos.get(part);
      if (g) thigh.add(mesh(g, part, ghost));
    }
    const calf = new THREE.Group();
    calf.position.set(0, -0.213, 0);
    for (const part of mirror ? ["calf_mirror_0", "calf_mirror_1"] : ["calf_0", "calf_1"]) {
      const g = geos.get(part);
      if (g) calf.add(mesh(g, part, ghost));
    }
    const foot = new THREE.Object3D();
    foot.position.set(0, -0.213, 0);
    const fg = geos.get("foot");
    if (fg) foot.add(mesh(fg, "foot", ghost));
    calf.add(foot);
    thigh.add(calf);
    hip.add(thigh);
    root.add(hip);
    hips.push(hip);
    thighs.push(thigh);
    calves.push(calf);
    feet.push(foot);
    void rear;
  }
  return { root, hips, thighs, calves, feet };
}

const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();

export function poseRig(
  rig: Rig,
  pos: [number, number, number],
  quat: [number, number, number, number],
  joints: number[],
) {
  mjToThree(pos[0], pos[1], pos[2], _p);
  rig.root.position.copy(_p);
  mjQuatToThree(quat[0], quat[1], quat[2], quat[3], _q);
  rig.root.quaternion.copy(_q);
  for (let i = 0; i < 4; i++) {
    rig.hips[i].quaternion.setFromAxisAngle(AXIS_HIP, joints[i * 3]);
    rig.thighs[i].quaternion.setFromAxisAngle(AXIS_LEG, joints[i * 3 + 1]);
    rig.calves[i].quaternion.setFromAxisAngle(AXIS_LEG, joints[i * 3 + 2]);
  }
}

export function poseSample(rig: Rig, sample: Sample) {
  poseRig(rig, sample.pos, sample.quat, sample.joints);
}
