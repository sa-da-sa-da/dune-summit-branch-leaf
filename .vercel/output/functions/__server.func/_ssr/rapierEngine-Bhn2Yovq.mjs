import { b as Vector3, h as Quaternion, u as Matrix4 } from "../_libs/three.mjs";
import { n as mjToThree, r as threeToMj, t as mjQuatToThree } from "./mount-BWqdfChp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rapierEngine-Bhn2Yovq.js
var RapierEngine = class RapierEngine {
	id = "rapier";
	R;
	world;
	body;
	feet = [];
	terrain = "flat";
	liftT = 0;
	pushT = 0;
	pushF = {
		x: 1,
		y: 0,
		z: 0
	};
	last = emptyState();
	qRef = new Quaternion();
	qCur = new Quaternion();
	qErr = new Quaternion();
	qInv = new Quaternion();
	refP = new Vector3();
	right = new Vector3();
	at = new Vector3();
	mjM = new Matrix4().set(0, -1, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0, 1);
	mjMt = new Matrix4().set(0, 0, -1, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
	qTmp = new Quaternion();
	mTmp = new Matrix4();
	static async create(terrain) {
		const R = (await import("../_libs/dimforge__rapier3d-compat.mjs").then((n) => n.t)).default;
		await R.init();
		const engine = new RapierEngine();
		engine.R = R;
		engine.boot(terrain);
		return engine;
	}
	boot(terrain) {
		const R = this.R;
		this.terrain = terrain;
		this.world = new R.World({
			x: 0,
			y: -9.81,
			z: 0
		});
		this.world.timestep = .002;
		this.addGround(terrain);
		const desc = R.RigidBodyDesc.dynamic().setTranslation(0, .27, 0).setCanSleep(false).setCcdEnabled(true).setLinearDamping(.15).setAngularDamping(.35).setAdditionalMassProperties(15.2, {
			x: 0,
			y: 0,
			z: 0
		}, {
			x: .16,
			y: .28,
			z: .22
		}, {
			w: 1,
			x: 0,
			y: 0,
			z: 0
		});
		this.body = this.world.createRigidBody(desc);
		this.world.createCollider(R.ColliderDesc.cuboid(.09, .055, .2).setDensity(0).setFriction(.7).setRestitution(.02), this.body);
		this.feet = [];
		for (let i = 0; i < 4; i++) this.feet.push(this.world.createCollider(R.ColliderDesc.ball(.018).setDensity(0).setFriction(1.2).setRestitution(0), this.body));
	}
	setTerrain(terrain) {
		const t = this.body.translation();
		const r = this.body.rotation();
		this.world.free();
		this.boot(terrain);
		this.body.setTranslation({
			x: t.x,
			y: t.y,
			z: t.z
		}, true);
		this.body.setRotation({
			x: r.x,
			y: r.y,
			z: r.z,
			w: r.w
		}, true);
	}
	reset(sample) {
		mjToThree(sample.pos[0], sample.pos[1], sample.pos[2], this.refP);
		mjQuatToThree(sample.quat[0], sample.quat[1], sample.quat[2], sample.quat[3], this.qRef);
		this.body.setTranslation({
			x: this.refP.x,
			y: this.refP.y,
			z: this.refP.z
		}, true);
		this.body.setRotation({
			x: this.qRef.x,
			y: this.qRef.y,
			z: this.qRef.z,
			w: this.qRef.w
		}, true);
		this.body.setLinvel({
			x: 0,
			y: 0,
			z: 0
		}, true);
		this.body.setAngvel({
			x: 0,
			y: 0,
			z: 0
		}, true);
		this.liftT = 0;
		this.pushT = 0;
		this.placeFeet(sample);
	}
	push(sample) {
		mjQuatToThree(sample.quat[0], sample.quat[1], sample.quat[2], sample.quat[3], this.qRef);
		this.right.set(1, 0, 0).applyQuaternion(this.qRef);
		const p = this.body.translation();
		this.at.set(0, .16, 0).applyQuaternion(this.qRef).add(this.refP.set(p.x, p.y, p.z));
		const scale = 11;
		this.body.applyImpulseAtPoint({
			x: this.right.x * scale,
			y: this.right.y * scale,
			z: this.right.z * scale
		}, {
			x: this.at.x,
			y: this.at.y,
			z: this.at.z
		}, true);
		this.pushF = {
			x: this.right.x * 70,
			y: 0,
			z: this.right.z * 70
		};
		this.pushT = .22;
	}
	lift() {
		this.liftT = .55;
	}
	step(sample, strength, _gravComp = true) {
		const s = Math.max(.08, Math.min(1.5, strength));
		this.placeFeet(sample);
		const p = this.body.translation();
		const v = this.body.linvel();
		const w = this.body.angvel();
		const r = this.body.rotation();
		mjToThree(sample.pos[0], sample.pos[1], sample.pos[2], this.refP);
		mjQuatToThree(sample.quat[0], sample.quat[1], sample.quat[2], sample.quat[3], this.qRef);
		this.qCur.set(r.x, r.y, r.z, r.w);
		const kp = 640 * s;
		const kd = 130 * s;
		let fx = (this.refP.x - p.x) * kp - v.x * kd;
		let fy = (this.refP.y - p.y) * kp - v.y * kd;
		let fz = (this.refP.z - p.z) * kp - v.z * kd;
		const cap = 95 * s;
		const mag = Math.hypot(fx, fy, fz) || 1;
		if (mag > cap) {
			const k = cap / mag;
			fx *= k;
			fy *= k;
			fz *= k;
		}
		this.qErr.copy(this.qRef).multiply(this.qInv.copy(this.qCur).invert());
		if (this.qErr.w < 0) this.qErr.set(-this.qErr.x, -this.qErr.y, -this.qErr.z, -this.qErr.w);
		const akp = 26 * s;
		const akd = 5.5 * s;
		let tx = this.qErr.x * 2 * akp - w.x * akd;
		let ty = this.qErr.y * 2 * akp - w.y * akd;
		let tz = this.qErr.z * 2 * akp - w.z * akd;
		const tmag = Math.hypot(tx, ty, tz) || 1;
		const tcap = 14 * s;
		if (tmag > tcap) {
			const k = tcap / tmag;
			tx *= k;
			ty *= k;
			tz *= k;
		}
		this.body.resetForces(true);
		this.body.addForce({
			x: fx,
			y: fy,
			z: fz
		}, true);
		this.body.addTorque({
			x: tx,
			y: ty,
			z: tz
		}, true);
		if (this.liftT > 0) {
			this.body.addForce({
				x: 0,
				y: 230,
				z: 0
			}, true);
			this.liftT -= .002;
		}
		if (this.pushT > 0) {
			this.body.addForce(this.pushF, true);
			this.pushT -= .002;
		}
		this.world.step();
		const feet = this.last.feet;
		feet[0] = feet[1] = feet[2] = feet[3] = 0;
		const dots = this.last.dots;
		dots.length = 0;
		let contacts = 0;
		for (let i = 0; i < 4; i++) this.world.contactPairsWith(this.feet[i], (other) => {
			this.world.contactPair(this.feet[i], other, (manifold) => {
				const n = manifold.numSolverContacts();
				for (let k = 0; k < n; k++) {
					const imp = manifold.contactImpulse(k);
					feet[i] += Math.abs(imp) / .002;
					contacts += 1;
					const pt = manifold.solverContactPoint(k);
					if (pt && dots.length < 24) dots.push(pt.x, pt.y, pt.z);
				}
			});
		});
		const nt = this.body.translation();
		const nr = this.body.rotation();
		this.qCur.set(nr.x, nr.y, nr.z, nr.w);
		const mj = threeToMj(nt.x, nt.y, nt.z);
		const quat = this.quatToMj(this.qCur);
		const last = this.last;
		last.pos[0] = mj[0];
		last.pos[1] = mj[1];
		last.pos[2] = mj[2];
		last.quat[0] = quat[0];
		last.quat[1] = quat[1];
		last.quat[2] = quat[2];
		last.quat[3] = quat[3];
		const joints = last.joints;
		for (let i = 0; i < 12; i++) joints[i] = sample.joints[i];
		last.contacts = contacts;
		last.servo = Math.min(mag, cap);
		return last;
	}
	dispose() {
		this.world.free();
	}
	placeFeet(sample) {
		for (let i = 0; i < 4; i++) {
			const f = sample.feetBody[i];
			this.feet[i].setTranslationWrtParent({
				x: -f[1],
				y: f[2],
				z: -f[0]
			});
		}
	}
	addGround(terrain) {
		const R = this.R;
		const friction = 1.15;
		if (terrain === "flat") {
			this.world.createCollider(R.ColliderDesc.cuboid(8, .05, 8).setTranslation(0, -.05, 0).setFriction(friction).setRestitution(.02));
			return;
		}
		this.world.createCollider(R.ColliderDesc.cuboid(1.6, .05, 1.45).setTranslation(0, -.05, .9).setFriction(friction).setRestitution(.02));
		this.world.createCollider(R.ColliderDesc.cuboid(1.6, .1, 2.4).setTranslation(0, -.29, -2.4).setFriction(friction).setRestitution(.02));
	}
	quatToMj(q) {
		this.mTmp.makeRotationFromQuaternion(q);
		this.mTmp.premultiply(this.mjMt).multiply(this.mjM);
		this.qTmp.setFromRotationMatrix(this.mTmp);
		const out = this.last.quat;
		out[0] = this.qTmp.w;
		out[1] = this.qTmp.x;
		out[2] = this.qTmp.y;
		out[3] = this.qTmp.z;
		return out;
	}
};
function emptyState() {
	return {
		pos: [
			0,
			0,
			.27
		],
		quat: [
			1,
			0,
			0,
			0
		],
		joints: new Array(12).fill(0),
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
export { RapierEngine };
