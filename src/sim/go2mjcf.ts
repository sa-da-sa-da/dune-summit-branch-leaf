/** Collision-only Go2. Masses, axes, ranges and torque limits match
 *  mujoco_menagerie unitree_go2. Visuals stay in three.js. */

const LEGS = [
  { name: "FL", hip: "0.1934 0.0465 0", side: 1, thigh: "front_hip" },
  { name: "FR", hip: "0.1934 -0.0465 0", side: -1, thigh: "front_hip" },
  { name: "RL", hip: "-0.1934 0.0465 0", side: 1, thigh: "back_hip" },
  { name: "RR", hip: "-0.1934 -0.0465 0", side: -1, thigh: "back_hip" },
];

function leg(spec: (typeof LEGS)[number]) {
  const y = spec.side * 0.0955;
  const hy = spec.side * 0.08;
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

export function go2Xml(terrain: "flat" | "step") {
  const ground = terrain === "step"
    ? `
    <geom name="pad" type="box" pos="-0.9 0 -0.05" size="1.45 1.6 0.05" friction="1.05 0.02 0.01" condim="3" rgba="0.16 0.2 0.17 1"/>
    <geom name="low" type="box" pos="2.4 0 -0.29" size="2.4 1.6 0.1" friction="1.05 0.02 0.01" condim="3" rgba="0.1 0.12 0.11 1"/>
    <geom name="face" type="box" pos="0.55 0 -0.09" size="0.012 1.6 0.09" rgba="0.55 0.28 0.12 1" contype="0" conaffinity="0"/>`
    : `
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
