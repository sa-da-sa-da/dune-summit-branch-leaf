export type EngineId = "rapier" | "mujoco";

export type PhysState = {
  pos: [number, number, number];
  quat: [number, number, number, number];
  joints: number[];
  feet: number[];
  contacts: number;
  servo: number;
  /** Contact points in three.js world space, xyz triples. */
  dots: number[];
  /** MuJoCo actuator torque, 12 values. Rapier leaves this empty. */
  actuator?: number[];
};

export interface PhysEngine {
  readonly id: EngineId;
  setTerrain(terrain: "flat" | "step"): void;
  reset(sample: import("@/sim/reference").Sample): void;
  step(sample: import("@/sim/reference").Sample, strength: number, gravComp: boolean): PhysState;
  push(sample: import("@/sim/reference").Sample): void;
  lift(): void;
  dispose(): void;
}
