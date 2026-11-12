import loadMujoco from "@mujoco/mujoco";
import { go2Xml } from "../src/sim/go2mjcf.ts";

const mj = await loadMujoco();
for (const terrain of ["flat", "step"]) {
  const model = mj.MjModel.from_xml_string(go2Xml(terrain));
  const data = new mj.MjData(model);
  mj.mj_resetDataKeyframe(model, data, 0);
  const xf = data.xfrc_applied;
  if (typeof xf.fill !== "function" || xf.length < 12) {
    throw new Error(`xfrc_applied unusable len=${xf?.length}`);
  }
  for (let i = 0; i < 80; i++) mj.mj_step(model, data);
  const contacts = data.contact;
  const n = contacts.size();
  const buf = new mj.DoubleBuffer(6);
  let force = 0;
  for (let i = 0; i < n; i++) {
    const c = contacts.get(i);
    mj.mj_contactForce(model, data, i, buf);
    force += Math.abs(buf.GetView()[0] ?? 0);
    c?.delete();
  }
  contacts.delete();
  console.log(
    terrain,
    "nq",
    model.nq,
    "nu",
    model.nu,
    "z",
    data.qpos[2].toFixed(3),
    "ncon",
    n,
    "fn",
    force.toFixed(1),
  );
  if (terrain === "flat" && (n < 1 || data.qpos[2] < 0.12)) {
    throw new Error("flat stand did not settle on the ground");
  }
  buf.delete();
  data.delete();
  model.delete();
}
console.log("mujoco ok");
