/** Kinematic reference. The gait / gestures never see contact — both physics
 *  entries track this trajectory instead of replacing it. */

export const LEGS = ["FL", "FR", "RL", "RR"] as const;
export type LegName = (typeof LEGS)[number];
export const JOINTS = ["hip", "thigh", "calf"] as const;

/** Hip-joint origins in the trunk frame (MuJoCo: x forward, y left, z up). */
export const HIP: readonly [number, number, number][] = [
  [0.1934, 0.0465, 0],
  [0.1934, -0.0465, 0],
  [-0.1934, 0.0465, 0],
  [-0.1934, -0.0465, 0],
];
const SIDE = [1, -1, 1, -1];
const L_HIP = 0.0955;
const L1 = 0.213;
const L2 = 0.213;
export const FOOT_Z = 0.005;
export const STAND_Z = 0.27;
const PERIOD = 0.46;
const DUTY = 0.58;
const SWING_H = 0.055;

export const TAU_MAX = [23.7, 23.7, 45.43];

export type Sample = {
  pos: [number, number, number];
  quat: [number, number, number, number];
  joints: number[];
  /** Foot origins in the trunk frame. */
  feetBody: [number, number, number][];
  pose: string;
  speed: number;
  roll: number;
  pitch: number;
  yaw: number;
  height: number;
};

type Pose = { z: number; pitch: number; roll: number; joints: number[] };

const STAND_J = [0, 0.9, -1.8, 0, 0.9, -1.8, 0, 0.9, -1.8, 0, 0.9, -1.8];
const LIE_J = [0, 1.45, -2.55, 0, 1.45, -2.55, 0, 1.45, -2.55, 0, 1.45, -2.55];
const SIT_J = [0, 0.75, -1.45, 0, 0.75, -1.45, 0, 1.55, -2.45, 0, 1.55, -2.45];

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function clampJoint(leg: number, part: number, q: number) {
  if (part === 0) return clamp(q, -1.0472, 1.0472);
  if (part === 2) return clamp(q, -2.7227, -0.83776);
  return leg < 2 ? clamp(q, -1.5708, 3.4907) : clamp(q, -0.5236, 4.5379);
}

/** Foot position in the hip frame. */
export function fkFoot(qhip: number, qthigh: number, qcalf: number, side: number) {
  const c = Math.cos(qhip);
  const s = Math.sin(qhip);
  const sum = qthigh + qcalf;
  const fx = -L1 * Math.sin(qthigh) - L2 * Math.sin(sum);
  const fz = -L1 * Math.cos(qthigh) - L2 * Math.cos(sum);
  return {
    x: fx,
    y: c * (side * L_HIP) - s * fz,
    z: s * (side * L_HIP) + c * fz,
  };
}

export function ikLeg(px: number, py: number, pz: number, side: number): [number, number, number] | null {
  const h2 = py * py + pz * pz - L_HIP * L_HIP;
  if (h2 < 1e-8) return null;
  const qhip = Math.atan2(py, -pz) - Math.atan2(side * L_HIP, Math.sqrt(h2));
  const c = Math.cos(qhip);
  const s = Math.sin(qhip);
  const fx = px;
  const fz = -s * py + c * pz;
  const d2 = fx * fx + fz * fz;
  const cosq = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (cosq > 1.02 || cosq < -1.02) return null;
  const qc = -Math.acos(clamp(cosq, -1, 1));
  const A = L1 + L2 * Math.cos(qc);
  const B = L2 * Math.sin(qc);
  const det = A * A + B * B;
  if (det < 1e-10) return null;
  const qt = Math.atan2((-A * fx + B * fz) / det, (-B * fx - A * fz) / det);
  return [qhip, qt, qc];
}

function yprQuat(yaw: number, pitch: number, roll: number): [number, number, number, number] {
  const cz = Math.cos(yaw / 2);
  const sz = Math.sin(yaw / 2);
  const cy = Math.cos(pitch / 2);
  const sy = Math.sin(pitch / 2);
  const cx = Math.cos(roll / 2);
  const sx = Math.sin(roll / 2);
  return [
    cz * cy * cx + sz * sy * sx,
    cz * cy * sx - sz * sy * cx,
    cz * sy * cx + sz * cy * sx,
    sz * cy * cx - cz * sy * sx,
  ];
}

function rotZ(yaw: number, x: number, y: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [c * x - s * y, s * x + c * y] as const;
}

function nominalFoot(leg: number, yaw: number, x: number, y: number, z: number) {
  const hip = HIP[leg];
  const localX = 0;
  const localY = SIDE[leg] * L_HIP;
  const [wx, wy] = rotZ(yaw, hip[0] + localX, hip[1] + localY);
  return { x: x + wx, y: y + wy, z: FOOT_Z };
}

type Foot = {
  x: number;
  y: number;
  z: number;
  swing: boolean;
  sx: number;
  sy: number;
  lx: number;
  ly: number;
  wasSwing: boolean;
};

function smooth(u: number) {
  const s = clamp(u, 0, 1);
  return s * s * (3 - 2 * s);
}

export class Reference {
  x = 0;
  y = 0;
  z = STAND_Z;
  yaw = 0;
  pitch = 0;
  roll = 0;
  joints = STAND_J.slice();
  pose = "站立";
  strength = 1;
  gravComp = true;
  private mode: "pose" | "trot" = "pose";
  private phase = 0;
  private vx = 0;
  private vy = 0;
  private wz = 0;
  private feet: Foot[] = [];
  private blend: { from: Pose; to: Pose; t: number; dur: number; name: string } | null = null;
  private gesture: { name: string; t: number; dur: number; fn: (u: number) => Pose } | null = null;
  private forced: { vx: number; vy: number; wz: number; t: number } | null = null;
  private settle = 0;

  constructor() {
    this.feet = [0, 1, 2, 3].map(() => ({
      x: 0, y: 0, z: FOOT_Z, swing: false, sx: 0, sy: 0, lx: 0, ly: 0, wasSwing: false,
    }));
    this.plantNominal();
  }

  resetStand() {
    this.x = 0;
    this.y = 0;
    this.z = STAND_Z;
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.joints = STAND_J.slice();
    this.pose = "站立";
    this.mode = "pose";
    this.phase = 0;
    this.vx = this.vy = this.wz = 0;
    this.blend = null;
    this.gesture = null;
    this.forced = null;
    this.settle = 0;
    this.plantNominal();
  }

  /** Drive the reference for `seconds`, ignoring the keyboard. */
  forceFor(seconds: number, vx: number, vy = 0, wz = 0) {
    this.forced = { vx, vy, wz, t: seconds };
    this.mode = "trot";
    this.pose = "小跑";
    this.gesture = null;
    this.blend = null;
    this.pitch = 0;
    this.roll = 0;
    this.z = STAND_Z;
    this.plantNominal();
  }

  standUp() { this.blendTo(STAND_Z, 0, 0, STAND_J, 1.15, "站立"); }
  standDown() { this.blendTo(0.055, 0, 0, LIE_J, 1.15, "趴下"); }
  sit() { this.blendTo(0.2, -0.42, 0, SIT_J, 1.1, "坐下"); }
  riseSit() { this.standUp(); }
  balanceStand() { this.standUp(); }
  recoveryStand() { this.standUp(); }
  stopMove() {
    this.forced = null;
    this.vx = this.vy = this.wz = 0;
  }

  hello() { this.play("打招呼", 3.1, helloPose); }
  stretch() { this.play("伸懒腰", 2.7, stretchPose); }
  heart() { this.play("比心", 2.6, heartPose); }
  content() { this.play("开心", 2.5, contentPose); }
  dance1() { this.play("舞蹈", 5.4, dancePose); }
  dance2() { this.play("舞蹈", 4.2, dancePose); }
  wiggle() { this.play("扭胯", 2.3, wigglePose); }
  scrape() { this.play("刨地", 2.2, scrapePose); }
  jump() { this.play("前跳", 0.9, jumpPose); }
  poseAct() { this.play("摆姿势", 2.2, heartPose); }

  step(dt: number, keys: Set<string>) {
    let vx = 0, vy = 0, wz = 0;
    if (this.forced && this.forced.t > 0) {
      vx = this.forced.vx;
      vy = this.forced.vy;
      wz = this.forced.wz;
      this.forced.t -= dt;
      if (this.forced.t <= 0) this.forced = null;
    } else if (!this.gesture) {
      if (keys.has("KeyW") || keys.has("ArrowUp")) vx += 0.5;
      if (keys.has("KeyS") || keys.has("ArrowDown")) vx -= 0.32;
      if (keys.has("KeyQ")) vy += 0.28;
      if (keys.has("KeyE")) vy -= 0.28;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) wz += 1.35;
      if (keys.has("KeyD") || keys.has("ArrowRight")) wz -= 1.35;
    }
    const k = 1 - Math.exp(-dt * 8);
    this.vx += (vx - this.vx) * k;
    this.vy += (vy - this.vy) * k;
    this.wz += (wz - this.wz) * k;

    const moving = Math.hypot(this.vx, this.vy) > 0.04 || Math.abs(this.wz) > 0.08;
    if (moving && !this.gesture && this.z > 0.22) {
      if (this.mode !== "trot") {
        this.mode = "trot";
        this.pose = "小跑";
        this.blend = null;
        this.pitch = 0;
        this.roll = 0;
        this.z = STAND_Z;
        this.plantNominal();
      }
    }

    if (this.gesture) {
      this.gesture.t += dt;
      const u = clamp(this.gesture.t / this.gesture.dur, 0, 1);
      const p = this.gesture.fn(u);
      this.z = p.z;
      this.pitch = p.pitch;
      this.roll = p.roll;
      this.joints = p.joints;
      this.pose = this.gesture.name;
      if (u >= 1) {
        this.gesture = null;
        this.blendTo(STAND_Z, 0, 0, STAND_J, 0.45, "站立");
      }
      return;
    }

    if (this.mode === "trot") {
      this.integrate(dt);
      this.phase = (this.phase + dt / PERIOD) % 1;
      this.trotJoints();
      if (!moving && !this.forced) {
        this.settle += dt;
        if (this.settle > 0.28) {
          this.mode = "pose";
          this.blendTo(STAND_Z, 0, 0, STAND_J, 0.35, "站立");
        }
      } else this.settle = 0;
      return;
    }

    this.settle = 0;
    if (this.blend) {
      this.blend.t += dt;
      const u = smooth(this.blend.t / this.blend.dur);
      this.z = this.blend.from.z + (this.blend.to.z - this.blend.from.z) * u;
      this.pitch = this.blend.from.pitch + (this.blend.to.pitch - this.blend.from.pitch) * u;
      this.roll = this.blend.from.roll + (this.blend.to.roll - this.blend.from.roll) * u;
      this.joints = this.blend.from.joints.map((q, i) => q + (this.blend!.to.joints[i] - q) * u);
      this.pose = this.blend.name;
      if (this.blend.t >= this.blend.dur) this.blend = null;
    }
  }

  sample(): Sample {
    const feetBody = [0, 1, 2, 3].map((leg) => {
      const hip = HIP[leg];
      const f = fkFoot(this.joints[leg * 3], this.joints[leg * 3 + 1], this.joints[leg * 3 + 2], SIDE[leg]);
      return [hip[0] + f.x, hip[1] + f.y, hip[2] + f.z] as [number, number, number];
    });
    return {
      pos: [this.x, this.y, this.z],
      quat: yprQuat(this.yaw, this.pitch, this.roll),
      joints: this.joints.slice(),
      feetBody,
      pose: this.pose,
      speed: Math.hypot(this.vx, this.vy),
      roll: this.roll,
      pitch: this.pitch,
      yaw: this.yaw,
      height: this.z,
    };
  }

  private plantNominal() {
    for (let i = 0; i < 4; i++) {
      const f = nominalFoot(i, this.yaw, this.x, this.y, this.z);
      this.feet[i].x = f.x;
      this.feet[i].y = f.y;
      this.feet[i].z = FOOT_Z;
      this.feet[i].swing = false;
      this.feet[i].wasSwing = false;
    }
  }

  private integrate(dt: number) {
    const [wx, wy] = rotZ(this.yaw, this.vx, this.vy);
    this.x += wx * dt;
    this.y += wy * dt;
    this.yaw += this.wz * dt;
    this.z = STAND_Z;
    this.pitch = 0;
    this.roll = 0;
  }

  private trotJoints() {
    const next: number[] = this.joints.slice();
    for (let leg = 0; leg < 4; leg++) {
      const offset = leg === 0 || leg === 3 ? 0 : 0.5;
      let p = (this.phase + offset) % 1;
      const swing = p > DUTY;
      const foot = this.feet[leg];
      if (swing && !foot.wasSwing) {
        foot.sx = foot.x;
        foot.sy = foot.y;
        const swingT = PERIOD * (1 - DUTY);
        const ahead = swingT + PERIOD * DUTY * 0.5;
        const [dx, dy] = rotZ(this.yaw, this.vx, this.vy);
        const nx = this.x + dx * ahead;
        const ny = this.y + dy * ahead;
        const nyaw = this.yaw + this.wz * ahead;
        const land = nominalFoot(leg, nyaw, nx, ny, this.z);
        foot.lx = land.x;
        foot.ly = land.y;
      }
      foot.wasSwing = swing;
      foot.swing = swing;
      if (swing) {
        const u = (p - DUTY) / (1 - DUTY);
        const s = smooth(u);
        foot.x = foot.sx + (foot.lx - foot.sx) * s;
        foot.y = foot.sy + (foot.ly - foot.sy) * s;
        foot.z = FOOT_Z + Math.sin(clamp(u, 0, 1) * Math.PI) * SWING_H;
      } else {
        foot.z = FOOT_Z;
      }
      const target = this.worldToHip(leg, foot.x, foot.y, foot.z);
      const solved = ikLeg(target[0], target[1], target[2], SIDE[leg]);
      if (solved) {
        next[leg * 3] = clampJoint(leg, 0, solved[0]);
        next[leg * 3 + 1] = clampJoint(leg, 1, solved[1]);
        next[leg * 3 + 2] = clampJoint(leg, 2, solved[2]);
      }
    }
    this.joints = next;
    this.pose = "小跑";
  }

  /** Foot target in the hip frame, planner ground always z = FOOT_Z. */
  private worldToHip(leg: number, fx: number, fy: number, fz: number): [number, number, number] {
    const dx = fx - this.x;
    const dy = fy - this.y;
    const dz = fz - this.z;
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    const bx = c * dx + s * dy;
    const by = -s * dx + c * dy;
    const hip = HIP[leg];
    return [bx - hip[0], by - hip[1], dz - hip[2]];
  }

  private blendTo(z: number, pitch: number, roll: number, joints: number[], dur: number, name: string) {
    this.mode = "pose";
    this.gesture = null;
    this.forced = null;
    this.vx = this.vy = this.wz = 0;
    this.blend = {
      from: { z: this.z, pitch: this.pitch, roll: this.roll, joints: this.joints.slice() },
      to: { z, pitch, roll, joints: joints.slice() },
      t: 0,
      dur,
      name,
    };
  }

  private play(name: string, dur: number, fn: (u: number) => Pose) {
    this.mode = "pose";
    this.forced = null;
    this.vx = this.vy = this.wz = 0;
    this.blend = null;
    this.gesture = { name, t: 0, dur, fn };
  }
}

function helloPose(u: number): Pose {
  const j = STAND_J.slice();
  const wave = Math.sin(u * Math.PI * 5);
  j[3] = -0.35;
  j[4] = 0.25;
  j[5] = -1.15 + 0.45 * wave;
  return { z: STAND_Z, pitch: 0.05, roll: -0.06, joints: j };
}

function stretchPose(u: number): Pose {
  const a = Math.sin(Math.min(1, u * 1.4) * Math.PI);
  const j = STAND_J.slice();
  j[1] = 0.35; j[2] = -1.05;
  j[4] = 0.35; j[5] = -1.05;
  j[7] = 1.25; j[8] = -2.25;
  j[10] = 1.25; j[11] = -2.25;
  return { z: STAND_Z - 0.06 * a, pitch: 0.45 * a, roll: 0, joints: j };
}

function heartPose(u: number): Pose {
  const a = Math.sin(Math.min(1, u * 1.2) * Math.PI);
  const j = STAND_J.slice();
  j[1] = 0.4; j[2] = -2.2;
  j[4] = 0.4; j[5] = -2.2;
  j[0] = 0.45 * a;
  j[3] = -0.45 * a;
  return { z: STAND_Z - 0.03 * a, pitch: -0.15 * a, roll: 0, joints: j };
}

function contentPose(u: number): Pose {
  const hop = Math.abs(Math.sin(u * Math.PI * 4));
  const j = STAND_J.slice();
  for (let i = 0; i < 4; i++) j[i * 3 + 1] = 0.9 - 0.25 * hop;
  return { z: STAND_Z + 0.04 * hop, pitch: 0, roll: 0, joints: j };
}

function dancePose(u: number): Pose {
  const j = STAND_J.slice();
  const roll = Math.sin(u * Math.PI * 4) * 0.18;
  j[0] = 0.2 * Math.sin(u * Math.PI * 4);
  j[3] = -j[0];
  j[6] = 0.15 * Math.sin(u * Math.PI * 4 + 1);
  j[9] = -j[6];
  j[2] = -1.8 + 0.25 * Math.sin(u * Math.PI * 6);
  j[11] = -1.8 + 0.25 * Math.sin(u * Math.PI * 6 + 2);
  return { z: STAND_Z, pitch: 0.08 * Math.sin(u * Math.PI * 2), roll, joints: j };
}

function wigglePose(u: number): Pose {
  return { z: STAND_Z, pitch: 0, roll: 0.12 * Math.sin(u * Math.PI * 6), joints: STAND_J.slice() };
}

function scrapePose(u: number): Pose {
  const j = STAND_J.slice();
  j[4] = 0.55 + 0.35 * Math.sin(u * Math.PI * 6);
  j[5] = -1.7;
  return { z: STAND_Z, pitch: 0.12, roll: 0, joints: j };
}

function jumpPose(u: number): Pose {
  const j = STAND_J.slice();
  const crouch = u < 0.35 ? u / 0.35 : u < 0.55 ? 1 - (u - 0.35) / 0.2 : 0;
  for (let i = 0; i < 4; i++) {
    j[i * 3 + 1] = 0.9 + 0.45 * crouch;
    j[i * 3 + 2] = -1.8 - 0.35 * crouch;
  }
  const air = u > 0.4 && u < 0.75 ? Math.sin(((u - 0.4) / 0.35) * Math.PI) : 0;
  return { z: STAND_Z - 0.05 * crouch + 0.1 * air, pitch: -0.2 * air, roll: 0, joints: j };
}

/** Static torque estimate τ ≈ Jᵀ F from a foot contact force in the hip frame. */
export function torqueFromContact(
  qhip: number,
  qthigh: number,
  qcalf: number,
  side: number,
  fx: number,
  fy: number,
  fz: number,
): [number, number, number] {
  const c = Math.cos(qhip);
  const s = Math.sin(qhip);
  const fxt = fx;
  const fyt = c * fy + s * fz;
  const fzt = -s * fy + c * fz;
  const sum = qthigh + qcalf;
  const dfx_qt = -L1 * Math.cos(qthigh) - L2 * Math.cos(sum);
  const dfz_qt = L1 * Math.sin(qthigh) + L2 * Math.sin(sum);
  const dfx_qc = -L2 * Math.cos(sum);
  const dfz_qc = L2 * Math.sin(sum);
  const tauT = dfx_qt * fxt + dfz_qt * fzt;
  const tauC = dfx_qc * fxt + dfz_qc * fzt;
  const tauH = (side * L_HIP) * fzt * 0.15 + fy * 0.02;
  return [tauH, tauT, tauC];
}
