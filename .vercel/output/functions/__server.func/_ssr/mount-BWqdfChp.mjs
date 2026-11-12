import { _ as Scene, a as DirectionalLight, b as Vector3, c as Group, d as Mesh, f as MeshStandardMaterial, g as SRGBColorSpace, h as Quaternion, i as BufferGeometry, l as HemisphereLight, m as PerspectiveCamera, n as BoxGeometry, o as Fog, p as Object3D, r as BufferAttribute, s as GridHelper, t as WebGLRenderer, u as Matrix4, v as SphereGeometry, y as Timer } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mount-BWqdfChp.js
/** MuJoCo (x forward, y left, z up) → three.js (x right, y up, z toward viewer). */
var MJ_TO_THREE = new Matrix4().set(0, -1, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0, 1);
var THREE_TO_MJ = MJ_TO_THREE.clone().transpose();
var _m = new Matrix4();
var _q$1 = new Quaternion();
var _out = new Quaternion();
function mjToThree(x, y, z, target) {
	target.set(-y, z, -x);
	return target;
}
function threeToMj(x, y, z) {
	return [
		-z,
		-x,
		y
	];
}
function mjQuatToThree(w, x, y, z, target) {
	_q$1.set(x, y, z, w);
	_m.makeRotationFromQuaternion(_q$1);
	_m.premultiply(MJ_TO_THREE).multiply(THREE_TO_MJ);
	return target.copy(_out.setFromRotationMatrix(_m));
}
var AXIS_HIP = new Vector3(0, 0, -1);
var AXIS_LEG = new Vector3(-1, 0, 0);
/** Hip-joint origins in the trunk frame (MuJoCo: x forward, y left, z up). */
var HIP = [
	[
		.1934,
		.0465,
		0
	],
	[
		.1934,
		-.0465,
		0
	],
	[
		-.1934,
		.0465,
		0
	],
	[
		-.1934,
		-.0465,
		0
	]
];
var SIDE$1 = [
	1,
	-1,
	1,
	-1
];
var L_HIP = .0955;
var L1 = .213;
var L2 = .213;
var FOOT_Z = .005;
var STAND_Z = .27;
var PERIOD = .46;
var DUTY = .58;
var SWING_H = .055;
var STAND_J = [
	0,
	.9,
	-1.8,
	0,
	.9,
	-1.8,
	0,
	.9,
	-1.8,
	0,
	.9,
	-1.8
];
var LIE_J = [
	0,
	1.45,
	-2.55,
	0,
	1.45,
	-2.55,
	0,
	1.45,
	-2.55,
	0,
	1.45,
	-2.55
];
var SIT_J = [
	0,
	.75,
	-1.45,
	0,
	.75,
	-1.45,
	0,
	1.55,
	-2.45,
	0,
	1.55,
	-2.45
];
function clamp(v, a, b) {
	return Math.max(a, Math.min(b, v));
}
function clampJoint(leg, part, q) {
	if (part === 0) return clamp(q, -1.0472, 1.0472);
	if (part === 2) return clamp(q, -2.7227, -.83776);
	return leg < 2 ? clamp(q, -1.5708, 3.4907) : clamp(q, -.5236, 4.5379);
}
/** Foot position in the hip frame. */
function fkFoot(qhip, qthigh, qcalf, side) {
	const c = Math.cos(qhip);
	const s = Math.sin(qhip);
	const sum = qthigh + qcalf;
	const fx = -.213 * Math.sin(qthigh) - L2 * Math.sin(sum);
	const fz = -.213 * Math.cos(qthigh) - L2 * Math.cos(sum);
	return {
		x: fx,
		y: c * (side * L_HIP) - s * fz,
		z: s * (side * L_HIP) + c * fz
	};
}
function ikLeg(px, py, pz, side) {
	const h2 = py * py + pz * pz - L_HIP * L_HIP;
	if (h2 < 1e-8) return null;
	const qhip = Math.atan2(py, -pz) - Math.atan2(side * L_HIP, Math.sqrt(h2));
	const c = Math.cos(qhip);
	const s = Math.sin(qhip);
	const fx = px;
	const fz = -s * py + c * pz;
	const cosq = (fx * fx + fz * fz - L1 * L1 - L2 * L2) / (2 * L1 * L2);
	if (cosq > 1.02 || cosq < -1.02) return null;
	const qc = -Math.acos(clamp(cosq, -1, 1));
	const A = L1 + L2 * Math.cos(qc);
	const B = L2 * Math.sin(qc);
	const det = A * A + B * B;
	if (det < 1e-10) return null;
	return [
		qhip,
		Math.atan2((-A * fx + B * fz) / det, (-B * fx - A * fz) / det),
		qc
	];
}
function yprQuat(yaw, pitch, roll) {
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
		sz * cy * cx - cz * sy * sx
	];
}
function rotZ(yaw, x, y) {
	const c = Math.cos(yaw);
	const s = Math.sin(yaw);
	return [c * x - s * y, s * x + c * y];
}
function nominalFoot(leg, yaw, x, y, z) {
	const hip = HIP[leg];
	const localX = 0;
	const localY = SIDE$1[leg] * L_HIP;
	const [wx, wy] = rotZ(yaw, hip[0] + localX, hip[1] + localY);
	return {
		x: x + wx,
		y: y + wy,
		z: FOOT_Z
	};
}
function smooth(u) {
	const s = clamp(u, 0, 1);
	return s * s * (3 - 2 * s);
}
var Reference = class {
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
	mode = "pose";
	phase = 0;
	vx = 0;
	vy = 0;
	wz = 0;
	feet = [];
	blend = null;
	gesture = null;
	forced = null;
	settle = 0;
	constructor() {
		this.feet = [
			0,
			1,
			2,
			3
		].map(() => ({
			x: 0,
			y: 0,
			z: FOOT_Z,
			swing: false,
			sx: 0,
			sy: 0,
			lx: 0,
			ly: 0,
			wasSwing: false
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
	forceFor(seconds, vx, vy = 0, wz = 0) {
		this.forced = {
			vx,
			vy,
			wz,
			t: seconds
		};
		this.mode = "trot";
		this.pose = "小跑";
		this.gesture = null;
		this.blend = null;
		this.pitch = 0;
		this.roll = 0;
		this.z = STAND_Z;
		this.plantNominal();
	}
	standUp() {
		this.blendTo(STAND_Z, 0, 0, STAND_J, 1.15, "站立");
	}
	standDown() {
		this.blendTo(.055, 0, 0, LIE_J, 1.15, "趴下");
	}
	sit() {
		this.blendTo(.2, -.42, 0, SIT_J, 1.1, "坐下");
	}
	riseSit() {
		this.standUp();
	}
	balanceStand() {
		this.standUp();
	}
	recoveryStand() {
		this.standUp();
	}
	stopMove() {
		this.forced = null;
		this.vx = this.vy = this.wz = 0;
	}
	hello() {
		this.play("打招呼", 3.1, helloPose);
	}
	stretch() {
		this.play("伸懒腰", 2.7, stretchPose);
	}
	heart() {
		this.play("比心", 2.6, heartPose);
	}
	content() {
		this.play("开心", 2.5, contentPose);
	}
	dance1() {
		this.play("舞蹈", 5.4, dancePose);
	}
	dance2() {
		this.play("舞蹈", 4.2, dancePose);
	}
	wiggle() {
		this.play("扭胯", 2.3, wigglePose);
	}
	scrape() {
		this.play("刨地", 2.2, scrapePose);
	}
	jump() {
		this.play("前跳", .9, jumpPose);
	}
	poseAct() {
		this.play("摆姿势", 2.2, heartPose);
	}
	step(dt, keys) {
		let vx = 0, vy = 0, wz = 0;
		if (this.forced && this.forced.t > 0) {
			vx = this.forced.vx;
			vy = this.forced.vy;
			wz = this.forced.wz;
			this.forced.t -= dt;
			if (this.forced.t <= 0) this.forced = null;
		} else if (!this.gesture) {
			if (keys.has("KeyW") || keys.has("ArrowUp")) vx += .5;
			if (keys.has("KeyS") || keys.has("ArrowDown")) vx -= .32;
			if (keys.has("KeyQ")) vy += .28;
			if (keys.has("KeyE")) vy -= .28;
			if (keys.has("KeyA") || keys.has("ArrowLeft")) wz += 1.35;
			if (keys.has("KeyD") || keys.has("ArrowRight")) wz -= 1.35;
		}
		const k = 1 - Math.exp(-dt * 8);
		this.vx += (vx - this.vx) * k;
		this.vy += (vy - this.vy) * k;
		this.wz += (wz - this.wz) * k;
		const moving = Math.hypot(this.vx, this.vy) > .04 || Math.abs(this.wz) > .08;
		if (moving && !this.gesture && this.z > .22) {
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
				this.blendTo(STAND_Z, 0, 0, STAND_J, .45, "站立");
			}
			return;
		}
		if (this.mode === "trot") {
			this.integrate(dt);
			this.phase = (this.phase + dt / PERIOD) % 1;
			this.trotJoints();
			if (!moving && !this.forced) {
				this.settle += dt;
				if (this.settle > .28) {
					this.mode = "pose";
					this.blendTo(STAND_Z, 0, 0, STAND_J, .35, "站立");
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
			this.joints = this.blend.from.joints.map((q, i) => q + (this.blend.to.joints[i] - q) * u);
			this.pose = this.blend.name;
			if (this.blend.t >= this.blend.dur) this.blend = null;
		}
	}
	sample() {
		const feetBody = [
			0,
			1,
			2,
			3
		].map((leg) => {
			const hip = HIP[leg];
			const f = fkFoot(this.joints[leg * 3], this.joints[leg * 3 + 1], this.joints[leg * 3 + 2], SIDE$1[leg]);
			return [
				hip[0] + f.x,
				hip[1] + f.y,
				hip[2] + f.z
			];
		});
		return {
			pos: [
				this.x,
				this.y,
				this.z
			],
			quat: yprQuat(this.yaw, this.pitch, this.roll),
			joints: this.joints.slice(),
			feetBody,
			pose: this.pose,
			speed: Math.hypot(this.vx, this.vy),
			roll: this.roll,
			pitch: this.pitch,
			yaw: this.yaw,
			height: this.z
		};
	}
	plantNominal() {
		for (let i = 0; i < 4; i++) {
			const f = nominalFoot(i, this.yaw, this.x, this.y, this.z);
			this.feet[i].x = f.x;
			this.feet[i].y = f.y;
			this.feet[i].z = FOOT_Z;
			this.feet[i].swing = false;
			this.feet[i].wasSwing = false;
		}
	}
	integrate(dt) {
		const [wx, wy] = rotZ(this.yaw, this.vx, this.vy);
		this.x += wx * dt;
		this.y += wy * dt;
		this.yaw += this.wz * dt;
		this.z = STAND_Z;
		this.pitch = 0;
		this.roll = 0;
	}
	trotJoints() {
		const next = this.joints.slice();
		for (let leg = 0; leg < 4; leg++) {
			const offset = leg === 0 || leg === 3 ? 0 : .5;
			let p = (this.phase + offset) % 1;
			const swing = p > DUTY;
			const foot = this.feet[leg];
			if (swing && !foot.wasSwing) {
				foot.sx = foot.x;
				foot.sy = foot.y;
				const ahead = .3266;
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
				const u = (p - DUTY) / .42000000000000004;
				const s = smooth(u);
				foot.x = foot.sx + (foot.lx - foot.sx) * s;
				foot.y = foot.sy + (foot.ly - foot.sy) * s;
				foot.z = FOOT_Z + Math.sin(clamp(u, 0, 1) * Math.PI) * SWING_H;
			} else foot.z = FOOT_Z;
			const target = this.worldToHip(leg, foot.x, foot.y, foot.z);
			const solved = ikLeg(target[0], target[1], target[2], SIDE$1[leg]);
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
	worldToHip(leg, fx, fy, fz) {
		const dx = fx - this.x;
		const dy = fy - this.y;
		const dz = fz - this.z;
		const c = Math.cos(this.yaw);
		const s = Math.sin(this.yaw);
		const bx = c * dx + s * dy;
		const by = -s * dx + c * dy;
		const hip = HIP[leg];
		return [
			bx - hip[0],
			by - hip[1],
			dz - hip[2]
		];
	}
	blendTo(z, pitch, roll, joints, dur, name) {
		this.mode = "pose";
		this.gesture = null;
		this.forced = null;
		this.vx = this.vy = this.wz = 0;
		this.blend = {
			from: {
				z: this.z,
				pitch: this.pitch,
				roll: this.roll,
				joints: this.joints.slice()
			},
			to: {
				z,
				pitch,
				roll,
				joints: joints.slice()
			},
			t: 0,
			dur,
			name
		};
	}
	play(name, dur, fn) {
		this.mode = "pose";
		this.forced = null;
		this.vx = this.vy = this.wz = 0;
		this.blend = null;
		this.gesture = {
			name,
			t: 0,
			dur,
			fn
		};
	}
};
function helloPose(u) {
	const j = STAND_J.slice();
	const wave = Math.sin(u * Math.PI * 5);
	j[3] = -.35;
	j[4] = .25;
	j[5] = -1.15 + .45 * wave;
	return {
		z: STAND_Z,
		pitch: .05,
		roll: -.06,
		joints: j
	};
}
function stretchPose(u) {
	const a = Math.sin(Math.min(1, u * 1.4) * Math.PI);
	const j = STAND_J.slice();
	j[1] = .35;
	j[2] = -1.05;
	j[4] = .35;
	j[5] = -1.05;
	j[7] = 1.25;
	j[8] = -2.25;
	j[10] = 1.25;
	j[11] = -2.25;
	return {
		z: STAND_Z - .06 * a,
		pitch: .45 * a,
		roll: 0,
		joints: j
	};
}
function heartPose(u) {
	const a = Math.sin(Math.min(1, u * 1.2) * Math.PI);
	const j = STAND_J.slice();
	j[1] = .4;
	j[2] = -2.2;
	j[4] = .4;
	j[5] = -2.2;
	j[0] = .45 * a;
	j[3] = -.45 * a;
	return {
		z: STAND_Z - .03 * a,
		pitch: -.15 * a,
		roll: 0,
		joints: j
	};
}
function contentPose(u) {
	const hop = Math.abs(Math.sin(u * Math.PI * 4));
	const j = STAND_J.slice();
	for (let i = 0; i < 4; i++) j[i * 3 + 1] = .9 - .25 * hop;
	return {
		z: STAND_Z + .04 * hop,
		pitch: 0,
		roll: 0,
		joints: j
	};
}
function dancePose(u) {
	const j = STAND_J.slice();
	const roll = Math.sin(u * Math.PI * 4) * .18;
	j[0] = .2 * Math.sin(u * Math.PI * 4);
	j[3] = -j[0];
	j[6] = .15 * Math.sin(u * Math.PI * 4 + 1);
	j[9] = -j[6];
	j[2] = -1.8 + .25 * Math.sin(u * Math.PI * 6);
	j[11] = -1.8 + .25 * Math.sin(u * Math.PI * 6 + 2);
	return {
		z: STAND_Z,
		pitch: .08 * Math.sin(u * Math.PI * 2),
		roll,
		joints: j
	};
}
function wigglePose(u) {
	return {
		z: STAND_Z,
		pitch: 0,
		roll: .12 * Math.sin(u * Math.PI * 6),
		joints: STAND_J.slice()
	};
}
function scrapePose(u) {
	const j = STAND_J.slice();
	j[4] = .55 + .35 * Math.sin(u * Math.PI * 6);
	j[5] = -1.7;
	return {
		z: STAND_Z,
		pitch: .12,
		roll: 0,
		joints: j
	};
}
function jumpPose(u) {
	const j = STAND_J.slice();
	const crouch = u < .35 ? u / .35 : u < .55 ? 1 - (u - .35) / .2 : 0;
	for (let i = 0; i < 4; i++) {
		j[i * 3 + 1] = .9 + .45 * crouch;
		j[i * 3 + 2] = -1.8 - .35 * crouch;
	}
	const air = u > .4 && u < .75 ? Math.sin((u - .4) / .35 * Math.PI) : 0;
	return {
		z: STAND_Z - .05 * crouch + .1 * air,
		pitch: -.2 * air,
		roll: 0,
		joints: j
	};
}
var SIDE = [
	1,
	-1,
	1,
	-1
];
var COLOR = {
	base_0: 1842720,
	base_1: 1842720,
	base_2: 1447962,
	base_3: 15986920,
	base_4: 9344934,
	hip_0: 14148324,
	hip_1: 9344934,
	thigh_0: 14148324,
	thigh_1: 9344934,
	thigh_mirror_0: 14148324,
	thigh_mirror_1: 9344934,
	calf_0: 9344934,
	calf_1: 1842720,
	calf_mirror_0: 9344934,
	calf_mirror_1: 1842720,
	foot: 1316376
};
/** Hip visual quaternions from the Menagerie MJCF, (w, x, y, z). */
var HIP_Q = [
	[
		1,
		0,
		0,
		0
	],
	[
		463268e-10,
		1,
		0,
		0
	],
	[
		463268e-10,
		0,
		1,
		0
	],
	[
		2.14617e-9,
		463268e-10,
		463268e-10,
		-1
	]
];
async function loadGeometries(onProgress) {
	const res = await fetch("/models/go2/pack.bin");
	if (!res.ok) throw new Error("外形包加载失败");
	const buf = await res.arrayBuffer();
	onProgress?.(.4);
	const dv = new DataView(buf);
	const bytes = new Uint8Array(buf);
	if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "G2PK") throw new Error("外形包格式不对");
	const count = dv.getUint32(8, true);
	const geos = /* @__PURE__ */ new Map();
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
		const scale = [
			dv.getFloat32(o, true),
			dv.getFloat32(o + 4, true),
			dv.getFloat32(o + 8, true)
		];
		o += 12;
		const offset = [
			dv.getFloat32(o, true),
			dv.getFloat32(o + 4, true),
			dv.getFloat32(o + 8, true)
		];
		o += 12;
		const pos = new Float32Array(vc * 3);
		const nor = new Float32Array(vc * 3);
		for (let i = 0; i < vc; i++) for (let k = 0; k < 3; k++) {
			const q = dv.getInt16(o, true);
			o += 2;
			const t = (q / 32767 + 1) / 2;
			pos[i * 3 + k] = t * scale[k] + offset[k];
		}
		for (let i = 0; i < vc; i++) for (let k = 0; k < 3; k++) {
			nor[i * 3 + k] = dv.getInt8(o) / 127;
			o += 1;
		}
		const idx = new Uint32Array(ic);
		for (let i = 0; i < ic; i++) {
			idx[i] = dv.getUint16(o, true);
			o += 2;
		}
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(pos, 3));
		geo.setAttribute("normal", new BufferAttribute(nor, 3));
		geo.setIndex(new BufferAttribute(idx, 1));
		geo.applyMatrix4(MJ_TO_THREE);
		geos.set(name, geo);
		onProgress?.(.4 + .5 * (p + 1) / count);
	}
	return geos;
}
function material(name, ghost) {
	return new MeshStandardMaterial({
		color: ghost ? 15228164 : COLOR[name] ?? 8947848,
		roughness: ghost ? 1 : .62,
		metalness: ghost ? 0 : .18,
		transparent: ghost,
		opacity: ghost ? .28 : 1,
		depthWrite: !ghost,
		emissive: ghost ? 5907464 : 0,
		emissiveIntensity: ghost ? .35 : 0
	});
}
function mesh(geo, name, ghost, quat) {
	const m = new Mesh(geo, material(name, ghost));
	m.castShadow = !ghost;
	m.receiveShadow = !ghost;
	if (quat) {
		const q = new Quaternion();
		mjQuatToThree(quat[0], quat[1], quat[2], quat[3], q);
		m.quaternion.copy(q);
	}
	return m;
}
function buildRig(geos, ghost) {
	const root = new Group();
	root.name = ghost ? "ghost" : "robot";
	for (const part of [
		"base_0",
		"base_1",
		"base_2",
		"base_3",
		"base_4"
	]) {
		const g = geos.get(part);
		if (g) root.add(mesh(g, part, ghost));
	}
	const hips = [];
	const thighs = [];
	const calves = [];
	const feet = [];
	for (let i = 0; i < 4; i++) {
		const mirror = i === 1 || i === 3;
		const hip = new Group();
		const p = new Vector3();
		mjToThree(HIP[i][0], HIP[i][1], HIP[i][2], p);
		hip.position.copy(p);
		for (const part of ["hip_0", "hip_1"]) {
			const g = geos.get(part);
			if (g) hip.add(mesh(g, part, ghost, HIP_Q[i]));
		}
		const thigh = new Group();
		thigh.position.set(-SIDE[i] * .0955, 0, 0);
		for (const part of mirror ? ["thigh_mirror_0", "thigh_mirror_1"] : ["thigh_0", "thigh_1"]) {
			const g = geos.get(part);
			if (g) thigh.add(mesh(g, part, ghost));
		}
		const calf = new Group();
		calf.position.set(0, -.213, 0);
		for (const part of mirror ? ["calf_mirror_0", "calf_mirror_1"] : ["calf_0", "calf_1"]) {
			const g = geos.get(part);
			if (g) calf.add(mesh(g, part, ghost));
		}
		const foot = new Object3D();
		foot.position.set(0, -.213, 0);
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
	}
	return {
		root,
		hips,
		thighs,
		calves,
		feet
	};
}
var _q = new Quaternion();
var _p = new Vector3();
function poseRig(rig, pos, quat, joints) {
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
var FIXED = .002;
var MAX_STEPS = 10;
var enginePool = /* @__PURE__ */ new Map();
var engineTerrain = /* @__PURE__ */ new Map();
async function createEngine(id, terrain) {
	if (id === "rapier") {
		const { RapierEngine } = await import("./rapierEngine-Bhn2Yovq.mjs");
		return RapierEngine.create(terrain);
	}
	const { MujocoEngine } = await import("./mujocoEngine-BBQ19ZGt.mjs");
	return MujocoEngine.create(terrain);
}
var gestures = {
	stand: (r) => r.standUp(),
	lie: (r) => r.standDown(),
	sit: (r) => r.sit(),
	hello: (r) => r.hello(),
	stretch: (r) => r.stretch(),
	heart: (r) => r.heart(),
	content: (r) => r.content(),
	dance: (r) => r.dance1(),
	jump: (r) => r.jump()
};
async function mountStudio(host, opts) {
	const ref = new Reference();
	const keys = /* @__PURE__ */ new Set();
	let engineId = opts.engine;
	let terrain = "flat";
	let strength = 1;
	let gravComp = true;
	let alive = true;
	let ready = false;
	let message = "正在装外形";
	let error = "";
	let shake = 0;
	let active = null;
	let shownHeight = ref.z;
	let lastState = null;
	let activeContacts = 0;
	let servoNow = 0;
	const feetNow = [
		0,
		0,
		0,
		0
	];
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const renderer = new WebGLRenderer({
		antialias: true,
		alpha: false,
		powerPreference: "high-performance"
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
	renderer.setClearColor(1053714, 1);
	renderer.outputColorSpace = SRGBColorSpace;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = 2;
	renderer.domElement.className = "block h-full w-full touch-none";
	host.appendChild(renderer.domElement);
	const scene = new Scene();
	scene.fog = new Fog(1053714, 7, 16);
	const camera = new PerspectiveCamera(38, 1, .05, 40);
	scene.add(new HemisphereLight(15196888, 1712412, .85));
	const sun = new DirectionalLight(16774376, 2.1);
	sun.position.set(3.2, 6.5, 2.4);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	const shadow = sun.shadow.camera;
	shadow.near = .5;
	shadow.far = 18;
	shadow.left = -4;
	shadow.right = 4;
	shadow.top = 4;
	shadow.bottom = -4;
	scene.add(sun);
	scene.add(sun.target);
	const ground = new Group();
	scene.add(ground);
	const grid = new GridHelper(14, 28, 3820096, 2371626);
	grid.position.y = .004;
	scene.add(grid);
	const dots = [];
	const dotGeo = new SphereGeometry(.018, 8, 6);
	const dotMat = new MeshStandardMaterial({
		color: 15228164,
		emissive: 15228164,
		emissiveIntensity: .6,
		roughness: .4
	});
	for (let i = 0; i < 8; i++) {
		const m = new Mesh(dotGeo, dotMat);
		m.visible = false;
		scene.add(m);
		dots.push(m);
	}
	let ghost = null;
	let solid = null;
	const pBody = new Vector3();
	const qBody = new Quaternion();
	const forward = new Vector3();
	const camOff = new Vector3();
	const look = new Vector3();
	const up = new Vector3(0, 1, 0);
	let orbitYaw = .42;
	let orbitPitch = .38;
	let dist = 2.7;
	let dragging = false;
	let lastX = 0;
	let lastY = 0;
	function resize() {
		const w = host.clientWidth || 1;
		const h = host.clientHeight || 1;
		camera.aspect = w / Math.max(1, h);
		camera.updateProjectionMatrix();
		renderer.setSize(w, h, false);
	}
	const ro = new ResizeObserver(resize);
	ro.observe(host);
	resize();
	const groundMat = new MeshStandardMaterial({
		color: 1845280,
		roughness: .92,
		metalness: 0
	});
	const lowMat = new MeshStandardMaterial({
		color: 1317912,
		roughness: .95,
		metalness: 0
	});
	const lipMat = new MeshStandardMaterial({
		color: 9063204,
		roughness: .7,
		metalness: .05
	});
	function paintGround() {
		for (const child of [...ground.children]) {
			ground.remove(child);
			child.geometry?.dispose();
		}
		const add = (sx, sy, sz, x, y, z, material) => {
			const mesh = new Mesh(new BoxGeometry(sx, sy, sz), material);
			mesh.position.set(x, y, z);
			mesh.receiveShadow = true;
			mesh.castShadow = sy > .12;
			ground.add(mesh);
		};
		if (terrain === "flat") {
			add(16, .1, 16, 0, -.05, 0, groundMat);
			grid.visible = true;
			return;
		}
		grid.visible = false;
		add(3.2, .1, 2.9, 0, -.05, .9, groundMat);
		add(3.2, .2, 4.8, 0, -.29, -2.4, lowMat);
		add(3.2, .19, .045, 0, -.095, -.55, lipMat);
	}
	paintGround();
	function publish() {
		const sample = ref.sample();
		opts.onStatus({
			ready,
			engine: engineId,
			pose: sample.pose,
			speed: sample.speed,
			height: shownHeight,
			contacts: activeContacts,
			feet: feetNow.slice(),
			servo: servoNow,
			terrain,
			message,
			error
		});
	}
	let acc = 0;
	let statusAcc = 0;
	const timer = new Timer();
	timer.connect(document);
	function onKey(e, down) {
		const t = e.target;
		if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
		if ([
			"KeyW",
			"KeyA",
			"KeyS",
			"KeyD",
			"KeyQ",
			"KeyE",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight"
		].includes(e.code)) e.preventDefault();
		if (down) keys.add(e.code);
		else keys.delete(e.code);
	}
	const keyDown = (e) => onKey(e, true);
	const keyUp = (e) => onKey(e, false);
	const blur = () => keys.clear();
	window.addEventListener("keydown", keyDown);
	window.addEventListener("keyup", keyUp);
	window.addEventListener("blur", blur);
	const el = renderer.domElement;
	const pointerDown = (e) => {
		dragging = true;
		lastX = e.clientX;
		lastY = e.clientY;
		el.setPointerCapture(e.pointerId);
	};
	const pointerUp = () => {
		dragging = false;
	};
	const pointerMove = (e) => {
		if (!dragging) return;
		orbitYaw -= (e.clientX - lastX) * .005;
		orbitPitch = Math.max(.08, Math.min(1.15, orbitPitch + (e.clientY - lastY) * .004));
		lastX = e.clientX;
		lastY = e.clientY;
	};
	const wheel = (e) => {
		e.preventDefault();
		dist = Math.max(1.3, Math.min(6.5, dist + Math.sign(e.deltaY) * .18));
	};
	el.addEventListener("pointerdown", pointerDown);
	el.addEventListener("pointerup", pointerUp);
	el.addEventListener("pointermove", pointerMove);
	el.addEventListener("wheel", wheel, { passive: false });
	function frame() {
		if (!alive) return;
		timer.update();
		const dt = Math.min(.05, timer.getDelta());
		ref.step(dt, keys);
		const sample = ref.sample();
		if (ghost) poseRig(ghost, sample.pos, sample.quat, sample.joints);
		if (active && solid) {
			acc += dt;
			let n = 0;
			while (acc >= FIXED && n < MAX_STEPS) {
				lastState = active.step(sample, strength, gravComp);
				acc -= FIXED;
				n += 1;
			}
			if (n === MAX_STEPS) acc = 0;
			const state = lastState;
			if (state) {
				poseRig(solid, state.pos, state.quat, state.joints);
				mjToThree(state.pos[0], state.pos[1], state.pos[2], pBody);
				mjQuatToThree(state.quat[0], state.quat[1], state.quat[2], state.quat[3], qBody);
				shownHeight = state.pos[2];
				activeContacts = state.contacts;
				servoNow = state.servo;
				for (let i = 0; i < 4; i++) feetNow[i] = state.feet[i] ?? 0;
				for (let i = 0; i < dots.length; i++) {
					const o = i * 3;
					const show = o + 2 < state.dots.length;
					dots[i].visible = show;
					if (show) dots[i].position.set(state.dots[o], state.dots[o + 1], state.dots[o + 2]);
				}
			}
		} else if (solid) {
			poseRig(solid, sample.pos, sample.quat, sample.joints);
			mjToThree(sample.pos[0], sample.pos[1], sample.pos[2], pBody);
			mjQuatToThree(sample.quat[0], sample.quat[1], sample.quat[2], sample.quat[3], qBody);
			shownHeight = sample.height;
		}
		forward.set(0, 0, -1).applyQuaternion(qBody);
		camOff.copy(forward).multiplyScalar(-dist * Math.cos(orbitPitch));
		camOff.y += dist * Math.sin(orbitPitch);
		camOff.applyAxisAngle(up, orbitYaw);
		if (!reduceMotion && shake > .001) {
			const elapsed = timer.getElapsed();
			camOff.x += Math.sin(elapsed * 46) * shake * .05;
			camOff.y += Math.cos(elapsed * 37) * shake * .03;
			shake *= Math.exp(-dt * 5);
		}
		camera.position.copy(pBody).add(camOff);
		look.copy(pBody);
		look.y += .12;
		camera.lookAt(look);
		sun.position.set(pBody.x + 3.2, 6.5, pBody.z + 2.4);
		sun.target.position.copy(pBody);
		sun.target.updateMatrixWorld();
		renderer.render(scene, camera);
		statusAcc += dt;
		if (statusAcc > .12) {
			statusAcc = 0;
			publish();
		}
	}
	timer.update();
	renderer.setAnimationLoop(frame);
	async function ensure(id) {
		let pending = enginePool.get(id);
		if (!pending) {
			message = id === "mujoco" ? "正在装载真机模型" : "正在装载课堂刚体";
			publish();
			pending = createEngine(id, terrain);
			enginePool.set(id, pending);
			engineTerrain.set(id, terrain);
		}
		const eng = await pending;
		if (engineTerrain.get(id) !== terrain) {
			eng.setTerrain(terrain);
			engineTerrain.set(id, terrain);
		}
		return eng;
	}
	function settle() {
		lastState = null;
		acc = 0;
		active?.reset(ref.sample());
	}
	function applyTerrain(next) {
		if (terrain === next && engineTerrain.get(engineId) === next) return;
		terrain = next;
		paintGround();
		if (active && engineTerrain.get(active.id) !== next) {
			active.setTerrain(next);
			engineTerrain.set(active.id, next);
		}
	}
	const handle = {
		async setEngine(id) {
			if (!alive) return;
			error = "";
			engineId = id;
			ready = false;
			publish();
			try {
				active = await ensure(id);
				if (!alive) return;
				settle();
				ready = true;
				message = id === "mujoco" ? "真机模型 · 十二个关节在追参考轨迹" : "课堂刚体 · 身子是刚体，腿照着参考走";
				publish();
			} catch (err) {
				if (!alive) return;
				error = err instanceof Error ? err.message : "物理引擎没有起来";
				message = "加载失败";
				ready = false;
				publish();
			}
		},
		setStrength(n) {
			strength = Math.max(.15, Math.min(1.4, n));
		},
		setGravComp(on) {
			gravComp = on;
		},
		scenario(name) {
			shake = name === "push" ? .55 : .3;
			if (name === "step") {
				applyTerrain("step");
				ref.resetStand();
				settle();
				ref.forceFor(2.5, .46);
				return;
			}
			applyTerrain("flat");
			ref.resetStand();
			settle();
			const sample = ref.sample();
			if (name === "push") active?.push(sample);
			else active?.lift();
		},
		gesture(name) {
			gestures[name]?.(ref);
		},
		reset() {
			applyTerrain("flat");
			ref.resetStand();
			settle();
		},
		hold(key, down) {
			if (down) keys.add(key);
			else keys.delete(key);
		},
		setKeys(codes) {
			keys.clear();
			for (const code of codes) keys.add(code);
		},
		walk(seconds, vx) {
			ref.forceFor(Math.max(.2, seconds), vx);
		},
		flat() {
			applyTerrain("flat");
			settle();
		},
		destroy() {
			if (!alive) return;
			alive = false;
			renderer.setAnimationLoop(null);
			timer.disconnect();
			window.removeEventListener("keydown", keyDown);
			window.removeEventListener("keyup", keyUp);
			window.removeEventListener("blur", blur);
			el.removeEventListener("pointerdown", pointerDown);
			el.removeEventListener("pointerup", pointerUp);
			el.removeEventListener("pointermove", pointerMove);
			el.removeEventListener("wheel", wheel);
			ro.disconnect();
			if (window.__controlsTest?.setKeys === handle.setKeys) delete window.__controlsTest;
			renderer.dispose();
			dotGeo.dispose();
			dotMat.dispose();
			groundMat.dispose();
			lowMat.dispose();
			lipMat.dispose();
			if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
		}
	};
	window.__controlsTest = {
		getYaw: () => ref.yaw,
		getSpeed: () => ref.sample().speed,
		setKeys: (codes) => handle.setKeys(codes)
	};
	publish();
	try {
		const geos = await loadGeometries();
		if (!alive) return handle;
		ghost = buildRig(geos, true);
		solid = buildRig(geos, false);
		scene.add(ghost.root);
		scene.add(solid.root);
		const sample = ref.sample();
		poseRig(ghost, sample.pos, sample.quat, sample.joints);
		poseRig(solid, sample.pos, sample.quat, sample.joints);
		mjToThree(sample.pos[0], sample.pos[1], sample.pos[2], pBody);
		await handle.setEngine(engineId);
	} catch (err) {
		if (!alive) return handle;
		error = err instanceof Error ? err.message : "外形没有装上";
		message = "加载失败";
		publish();
	}
	return handle;
}
//#endregion
export { mountStudio, mjToThree as n, threeToMj as r, mjQuatToThree as t };
