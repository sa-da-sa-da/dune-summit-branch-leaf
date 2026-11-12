import { b as Vector3 } from "../_libs/three.mjs";
import { n as mjToThree } from "./mount-BWqdfChp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mujocoEngine-BBQ19ZGt.js
/** Collision-only Go2. Masses, axes, ranges and torque limits match
*  mujoco_menagerie unitree_go2. Visuals stay in three.js. */
var LEGS = [
	{
		name: "FL",
		hip: "0.1934 0.0465 0",
		side: 1,
		thigh: "front_hip"
	},
	{
		name: "FR",
		hip: "0.1934 -0.0465 0",
		side: -1,
		thigh: "front_hip"
	},
	{
		name: "RL",
		hip: "-0.1934 0.0465 0",
		side: 1,
		thigh: "back_hip"
	},
	{
		name: "RR",
		hip: "-0.1934 -0.0465 0",
		side: -1,
		thigh: "back_hip"
	}
];
function leg(spec) {
	const y = spec.side * .0955;
	const hy = spec.side * .08;
	return `
      <body name="${spec.name}_hip" pos="${spec.hip}">
        <inertial pos="0 0 0" mass="0.678" diaginertia="0.000884 0.000596 0.00048"/>
        <joint name="${spec.name}_hip_joint" class="abduction"/>
        <geom size="0.046 0.02" pos="0 ${hy} 0" quat="0.707107 0.707107 0 0" type="cylinder" class="collision"/>
        <body name="${spec.name}_thigh" pos="0 ${y} 0">
          <inertial pos="0 0 -0.03" mass="1.152" diaginertia="0.00595 0.00584 0.00088"/>
          <joint name="${spec.name}_thigh_joint" class="${spec.thigh}"/>
          <geom size="0.1065 0.01225 0.017" pos="0 0 -0.1065" quat="0.707107 0 0.707107 0" type="box" class="collision"/>
          <body name="${spec.name}_calf" pos="0 0 -0.213">
            <inertial pos="0 0 -0.14" mass="0.241" diaginertia="0.00149 0.00146 0.000053"/>
            <joint name="${spec.name}_calf_joint" class="knee"/>
            <geom size="0.012 0.06" pos="0.008 0 -0.06" type="cylinder" class="collision"/>
            <geom name="${spec.name}_foot" type="sphere" size="0.022" pos="0 0 -0.213" friction="0.95 0.02 0.01" condim="3" priority="1" solimp="0.9 0.95 0.001"/>
          </body>
        </body>
      </body>`;
}
function go2Xml(terrain) {
	const ground = terrain === "step" ? `
    <geom name="pad" type="box" pos="-0.9 0 -0.05" size="1.45 1.6 0.05" friction="1.05 0.02 0.01" condim="3" rgba="0.16 0.2 0.17 1"/>
    <geom name="low" type="box" pos="2.4 0 -0.29" size="2.4 1.6 0.1" friction="1.05 0.02 0.01" condim="3" rgba="0.1 0.12 0.11 1"/>
    <geom name="face" type="box" pos="0.55 0 -0.09" size="0.012 1.6 0.09" rgba="0.55 0.28 0.12 1" contype="0" conaffinity="0"/>` : `
    <geom name="floor" type="box" pos="0 0 -0.05" size="6 6 0.05" friction="1.05 0.02 0.01" condim="3" rgba="0.14 0.18 0.15 1"/>`;
	return `<mujoco model="go2_class">
  <compiler angle="radian" autolimits="true"/>
  <option timestep="0.002" integrator="implicitfast" gravity="0 0 -9.81" cone="elliptic"/>
  <default>
    <default class="go2">
      <geom friction="0.8" margin="0.001" condim="3" rgba="0.25 0.28 0.27 1"/>
      <joint axis="0 1 0" damping="1.2" armature="0.01" frictionloss="0.15"/>
      <motor ctrlrange="-23.7 23.7" gear="1"/>
      <default class="abduction">
        <joint axis="1 0 0" range="-1.0472 1.0472"/>
      </default>
      <default class="front_hip"><joint range="-1.5708 3.4907"/></default>
      <default class="back_hip"><joint range="-0.5236 4.5379"/></default>
      <default class="knee">
        <joint range="-2.7227 -0.83776"/>
        <motor ctrlrange="-45.43 45.43"/>
      </default>
      <default class="collision"><geom group="3"/></default>
    </default>
  </default>
  <worldbody>
    <light pos="0 0 2" dir="0 0 -1" directional="true"/>
    <body name="base" pos="0 0 0.27" childclass="go2">
      <inertial pos="0.02 0 0" mass="6.921" diaginertia="0.107 0.098 0.0245"/>
      <freejoint/>
      <geom name="trunk" type="box" size="0.188 0.08 0.06" class="collision"/>
      ${LEGS.map(leg).join("\n")}
    </body>
    ${ground}
  </worldbody>
  <actuator>
    <motor class="abduction" name="FL_hip" joint="FL_hip_joint"/>
    <motor class="go2" name="FL_thigh" joint="FL_thigh_joint"/>
    <motor class="knee" name="FL_calf" joint="FL_calf_joint"/>
    <motor class="abduction" name="FR_hip" joint="FR_hip_joint"/>
    <motor class="go2" name="FR_thigh" joint="FR_thigh_joint"/>
    <motor class="knee" name="FR_calf" joint="FR_calf_joint"/>
    <motor class="abduction" name="RL_hip" joint="RL_hip_joint"/>
    <motor class="go2" name="RL_thigh" joint="RL_thigh_joint"/>
    <motor class="knee" name="RL_calf" joint="RL_calf_joint"/>
    <motor class="abduction" name="RR_hip" joint="RR_hip_joint"/>
    <motor class="go2" name="RR_thigh" joint="RR_thigh_joint"/>
    <motor class="knee" name="RR_calf" joint="RR_calf_joint"/>
  </actuator>
  <keyframe>
    <key name="home" qpos="0 0 0.27 1 0 0 0 0 0.9 -1.8 0 0.9 -1.8 0 0.9 -1.8 0 0.9 -1.8"/>
  </keyframe>
</mujoco>`;
}
var KP = [
	40,
	50,
	65
];
var KD = [
	2,
	2.4,
	2.8
];
var TMAX = [
	23.7,
	23.7,
	45.43
];
var MujocoEngine = class MujocoEngine {
	id = "mujoco";
	mujoco;
	model = null;
	data = null;
	terrain = "flat";
	footGeom = [
		0,
		0,
		0,
		0
	];
	forceBuf = null;
	liftT = 0;
	pushT = 0;
	pushFx = 0;
	pushFy = 0;
	tmp = new Vector3();
	static async create(terrain) {
		const loadMujoco = (await import("../_libs/mujoco__mujoco.mjs").then((n) => n.t)).default;
		const mujoco = await loadMujoco();
		const engine = new MujocoEngine();
		engine.mujoco = mujoco;
		engine.forceBuf = new mujoco.DoubleBuffer(6);
		engine.load(terrain);
		return engine;
	}
	setTerrain(terrain) {
		this.load(terrain);
	}
	reset(sample) {
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
	push(sample) {
		const yaw = Math.atan2(2 * (sample.quat[0] * sample.quat[3] + sample.quat[1] * sample.quat[2]), 1 - 2 * (sample.quat[2] ** 2 + sample.quat[3] ** 2));
		const fx = Math.sin(yaw);
		const fy = -Math.cos(yaw);
		this.pushFx = fx * 150;
		this.pushFy = fy * 150;
		this.pushT = .28;
	}
	lift() {
		this.liftT = .48;
	}
	step(sample, strength, gravComp) {
		const model = this.model;
		const data = this.data;
		if (!model || !data) return idle(sample);
		const s = Math.max(.05, Math.min(1.5, strength));
		const qpos = data.qpos;
		const qvel = data.qvel;
		const ctrl = data.ctrl;
		const bias = data.qfrc_bias;
		for (let i = 0; i < 12; i++) {
			const part = i % 3;
			let tau = KP[part] * s * (sample.joints[i] - qpos[7 + i]) - KD[part] * s * qvel[6 + i];
			if (gravComp) tau += bias[6 + i];
			const lim = TMAX[part] * Math.min(1.4, s);
			ctrl[i] = Math.max(-lim, Math.min(lim, tau));
		}
		const xf = data.xfrc_applied;
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
			this.liftT -= .002;
		}
		if (this.pushT > 0) {
			fx += this.pushFx;
			fy += this.pushFy;
			this.pushT -= .002;
		}
		const [ew, ex, ey, ez] = quatMul(sample.quat, [
			qpos[3],
			-qpos[4],
			-qpos[5],
			-qpos[6]
		]);
		const sign = ew < 0 ? -1 : 1;
		const akp = 16 * s;
		const akd = 3.2 * s;
		let tx = sign * ex * 2 * akp - akd * qvel[3];
		let ty = sign * ey * 2 * akp - akd * qvel[4];
		let tz = sign * ez * 2 * akp - akd * qvel[5];
		if (this.pushT > 0) {
			tx += -.11 * this.pushFy;
			ty += .11 * this.pushFx;
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
		const feet = [
			0,
			0,
			0,
			0
		];
		const dots = [];
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
				const view = buf.GetView();
				if (leg >= 0) feet[leg] += Math.abs(view[0] ?? 0);
			}
			const pos = c.pos;
			if (pos && pos.length >= 3 && dots.length < 24) {
				mjToThree(pos[0], pos[1], pos[2], this.tmp);
				dots.push(this.tmp.x, this.tmp.y, this.tmp.z);
			}
			c.delete();
		}
		contacts.delete();
		const act = data.qfrc_actuator;
		const joints = sample.joints.slice();
		for (let i = 0; i < 12; i++) joints[i] = qpos[7 + i];
		return {
			pos: [
				qpos[0],
				qpos[1],
				qpos[2]
			],
			quat: [
				qpos[3],
				qpos[4],
				qpos[5],
				qpos[6]
			],
			joints,
			feet,
			contacts: n,
			servo: Math.hypot(fx, fy, fz),
			dots,
			actuator: act ? Array.from(act.slice(6, 18)) : void 0
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
	load(terrain) {
		this.data?.delete();
		this.model?.delete();
		this.model = this.mujoco.MjModel.from_xml_string(go2Xml(terrain));
		this.data = new this.mujoco.MjData(this.model);
		this.mujoco.mj_resetDataKeyframe(this.model, this.data, 0);
		this.mujoco.mj_forward(this.model, this.data);
		const obj = this.mujoco.mjtObj.mjOBJ_GEOM.value;
		this.footGeom = [
			"FL_foot",
			"FR_foot",
			"RL_foot",
			"RR_foot"
		].map((name) => this.mujoco.mj_name2id(this.model, obj, name));
		this.terrain = terrain;
	}
};
function writeSample(qpos, sample) {
	qpos[0] = sample.pos[0];
	qpos[1] = sample.pos[1];
	qpos[2] = sample.pos[2];
	qpos[3] = sample.quat[0];
	qpos[4] = sample.quat[1];
	qpos[5] = sample.quat[2];
	qpos[6] = sample.quat[3];
	for (let i = 0; i < 12; i++) qpos[7 + i] = sample.joints[i];
}
function quatMul(a, b) {
	const [aw, ax, ay, az] = a;
	const [bw, bx, by, bz] = b;
	return [
		aw * bw - ax * bx - ay * by - az * bz,
		aw * bx + ax * bw + ay * bz - az * by,
		aw * by - ax * bz + ay * bw + az * bx,
		aw * bz + ax * by - ay * bx + az * bw
	];
}
function idle(sample) {
	return {
		pos: sample.pos,
		quat: sample.quat,
		joints: sample.joints,
		feet: [
			0,
			0,
			0,
			0
		],
		contacts: 0,
		servo: 0,
		dots: []
	};
}
//#endregion
export { MujocoEngine };
