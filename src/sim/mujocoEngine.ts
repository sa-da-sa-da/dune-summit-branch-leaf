import { go2Xml } from "@/sim/go2mjcf";
import { mjToThree } from "@/sim/frame";
import type { Sample } from "@/sim/reference";
import type { PhysEngine, PhysState } from "@/sim/phys";
import * as THREE from "three";

const KP = [40, 50, 65];
const KD = [2.0, 2.4, 2.8];
const TMAX = [23.7, 23.7, 45.43];

type MJ = Awaited<ReturnType<(typeof import("@mujoco/mujoco"))["default"]>>;

export class MujocoEngine implements PhysEngine {
  readonly id = "mujoco" as const;
  private mujoco!: MJ;
  private model: InstanceType<MJ["MjModel"]> | null = null;
  private data: InstanceType<MJ["MjData"]> | null = null;
  private terrain: "flat" | "step" = "flat";
  private footGeom = [0, 0, 0, 0];
  private forceBuf: { GetView: () => ArrayLike<number>; delete: () => void } | null = null;
  private liftT = 0;
  private pushT = 0;
  private pushFx = 0;
  private pushFy = 0;
  private tmp = new THREE.Vector3();

  static async create(terrain: "flat" | "step") {
    const loadMujoco = (await import("@mujoco/mujoco")).default;
    const mujoco = await loadMujoco();
    const engine = new MujocoEngine();
    engine.mujoco = mujoco;
    engine.forceBuf = new mujoco.DoubleBuffer(6);
    engine.load(terrain);
    return engine;
  }

  setTerrain(terrain: "flat" | "step") {
    this.load(terrain);
  }

  reset(sample: Sample) {
    const mj = this.mujoco;
    const model = this.model;
    const data = this.data;
    if (!model || !data) return;
    mj.mj_resetDataKeyframe(model, data, 0);
    writeSample(data.qpos, sample);
    for (let i = 0; i < data.qvel.length; i++) data.qvel[i] = 0;
    this.liftT = 0;
    this.pushT = 0;
    mj.mj_forward(model, data);
  }

  push(sample: Sample) {
    const yaw = Math.atan2(2 * (sample.quat[0] * sample.quat[3] + sample.quat[1] * sample.quat[2]), 1 - 2 * (sample.quat[2] ** 2 + sample.quat[3] ** 2));
    const fx = Math.sin(yaw);
    const fy = -Math.cos(yaw);
    this.pushFx = fx * 150;
    this.pushFy = fy * 150;
    this.pushT = 0.28;
  }

  lift() {
    this.liftT = 0.48;
  }

  step(sample: Sample, strength: number, gravComp: boolean): PhysState {
    const model = this.model;
    const data = this.data;
    if (!model || !data) return idle(sample);
    const s = Math.max(0.05, Math.min(1.5, strength));
    const qpos = data.qpos as Float64Array;
    const qvel = data.qvel as Float64Array;
    const ctrl = data.ctrl as Float64Array;
    const bias = data.qfrc_bias as Float64Array;
    for (let i = 0; i < 12; i++) {
      const part = i % 3;
      let tau = KP[part] * s * (sample.joints[i] - qpos[7 + i]) - KD[part] * s * qvel[6 + i];
      if (gravComp) tau += bias[6 + i];
      const lim = TMAX[part] * Math.min(1.4, s);
      ctrl[i] = Math.max(-lim, Math.min(lim, tau));
    }
    const xf = data.xfrc_applied as Float64Array;
    xf.fill(0);
    const kp = 380 * s;
    const kd = 70 * s;
    let fx = kp * (sample.pos[0] - qpos[0]) - kd * qvel[0];
    let fy = kp * (sample.pos[1] - qpos[1]) - kd * qvel[1];
    let fz = kp * (sample.pos[2] - qpos[2]) - kd * qvel[2];
    const hcap = 70 * s;
    const vcap = 80 * s;
    const hmag = Math.hypot(fx, fy) || 1;
    if (hmag > hcap) {
      fx *= hcap / hmag;
      fy *= hcap / hmag;
    }
    fz = Math.max(-vcap, Math.min(vcap, fz));
    if (this.liftT > 0) {
      fz += 220;
      this.liftT -= 0.002;
    }
    if (this.pushT > 0) {
      fx += this.pushFx;
      fy += this.pushFy;
      this.pushT -= 0.002;
    }
    const [ew, ex, ey, ez] = quatMul(sample.quat, [qpos[3], -qpos[4], -qpos[5], -qpos[6]]);
    const sign = ew < 0 ? -1 : 1;
    const akp = 16 * s;
    const akd = 3.2 * s;
    let tx = sign * ex * 2 * akp - akd * qvel[3];
    let ty = sign * ey * 2 * akp - akd * qvel[4];
    let tz = sign * ez * 2 * akp - akd * qvel[5];
    if (this.pushT > 0) {
      tx += -0.11 * this.pushFy;
      ty += 0.11 * this.pushFx;
    }
    const tmag = Math.hypot(tx, ty, tz) || 1;
    const tcap = 12 * s;
    if (tmag > tcap) {
      tx *= tcap / tmag;
      ty *= tcap / tmag;
      tz *= tcap / tmag;
    }
    xf[6] = fx;
    xf[7] = fy;
    xf[8] = fz;
    xf[9] = tx;
    xf[10] = ty;
    xf[11] = tz;
    this.mujoco.mj_step(model, data);

    const feet = [0, 0, 0, 0];
    const dots: number[] = [];
    const contacts = data.contact;
    const n = contacts.size();
    const buf = this.forceBuf;
    for (let i = 0; i < n; i++) {
      const c = contacts.get(i);
      if (!c) continue;
      let leg = this.footGeom.indexOf(c.geom1);
      if (leg < 0) leg = this.footGeom.indexOf(c.geom2);
      if (buf) {
        this.mujoco.mj_contactForce(model, data, i, buf);
        const view = buf.GetView() as ArrayLike<number>;
        if (leg >= 0) feet[leg] += Math.abs(view[0] ?? 0);
      }
      const pos = c.pos as ArrayLike<number> | undefined;
      if (pos && pos.length >= 3 && dots.length < 24) {
        mjToThree(pos[0], pos[1], pos[2], this.tmp);
        dots.push(this.tmp.x, this.tmp.y, this.tmp.z);
      }
      c.delete();
    }
    contacts.delete();

    const act = data.qfrc_actuator as Float64Array;
    const joints = sample.joints.slice();
    for (let i = 0; i < 12; i++) joints[i] = qpos[7 + i];
    return {
      pos: [qpos[0], qpos[1], qpos[2]],
      quat: [qpos[3], qpos[4], qpos[5], qpos[6]],
      joints,
      feet,
      contacts: n,
      servo: Math.hypot(fx, fy, fz),
      dots,
      actuator: act ? Array.from(act.slice(6, 18)) : undefined,
    };
  }

  dispose() {
    this.data?.delete();
    this.model?.delete();
    this.forceBuf?.delete();
    this.data = null;
    this.model = null;
    this.forceBuf = null;
  }

  private load(terrain: "flat" | "step") {
    this.data?.delete();
    this.model?.delete();
    this.model = this.mujoco.MjModel.from_xml_string(go2Xml(terrain));
    this.data = new this.mujoco.MjData(this.model);
    this.mujoco.mj_resetDataKeyframe(this.model, this.data, 0);
    this.mujoco.mj_forward(this.model, this.data);
    const obj = this.mujoco.mjtObj.mjOBJ_GEOM.value;
    this.footGeom = ["FL_foot", "FR_foot", "RL_foot", "RR_foot"].map((name) =>
      this.mujoco.mj_name2id(this.model!, obj, name),
    );
    this.terrain = terrain;
  }
}

function writeSample(qpos: Float64Array, sample: Sample) {
  qpos[0] = sample.pos[0];
  qpos[1] = sample.pos[1];
  qpos[2] = sample.pos[2];
  qpos[3] = sample.quat[0];
  qpos[4] = sample.quat[1];
  qpos[5] = sample.quat[2];
  qpos[6] = sample.quat[3];
  for (let i = 0; i < 12; i++) qpos[7 + i] = sample.joints[i];
}

function quatMul(a: [number, number, number, number], b: [number, number, number, number]) {
  const [aw, ax, ay, az] = a;
  const [bw, bx, by, bz] = b;
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ] as [number, number, number, number];
}

function idle(sample: Sample): PhysState {
  return {
    pos: sample.pos,
    quat: sample.quat,
    joints: sample.joints,
    feet: [0, 0, 0, 0],
    contacts: 0,
    servo: 0,
    dots: [],
  };
}
