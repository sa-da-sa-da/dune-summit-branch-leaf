import * as THREE from "three";
import { mjQuatToThree, mjToThree } from "@/sim/frame";
import { buildRig, loadGeometries, poseRig, type Rig } from "@/sim/meshes";
import type { EngineId, PhysEngine, PhysState } from "@/sim/phys";
import { Reference } from "@/sim/reference";

export type Terrain = "flat" | "step";

export type StudioStatus = {
  ready: boolean;
  engine: EngineId;
  pose: string;
  speed: number;
  height: number;
  contacts: number;
  feet: number[];
  servo: number;
  terrain: Terrain;
  message: string;
  error: string;
};

export type MountHandle = {
  setEngine(id: EngineId): Promise<void>;
  setStrength(n: number): void;
  setGravComp(on: boolean): void;
  scenario(name: "push" | "lift" | "step"): void;
  gesture(name: string): void;
  reset(): void;
  hold(key: string, down: boolean): void;
  setKeys(codes: string[]): void;
  walk(seconds: number, vx: number): void;
  flat(): void;
  destroy(): void;
};

type Probe = {
  getYaw: () => number;
  getSpeed: () => number;
  setKeys: (codes: string[]) => void;
};

declare global {
  interface Window {
    __controlsTest?: Probe;
  }
}

const FIXED = 0.002;
const MAX_STEPS = 10;
const enginePool = new Map<EngineId, Promise<PhysEngine>>();
const engineTerrain = new Map<EngineId, Terrain>();

async function createEngine(id: EngineId, terrain: Terrain) {
  if (id === "rapier") {
    const { RapierEngine } = await import("@/sim/rapierEngine");
    return RapierEngine.create(terrain);
  }
  const { MujocoEngine } = await import("@/sim/mujocoEngine");
  return MujocoEngine.create(terrain);
}

const gestures: Record<string, (ref: Reference) => void> = {
  stand: (r) => r.standUp(),
  lie: (r) => r.standDown(),
  sit: (r) => r.sit(),
  hello: (r) => r.hello(),
  stretch: (r) => r.stretch(),
  heart: (r) => r.heart(),
  content: (r) => r.content(),
  dance: (r) => r.dance1(),
  jump: (r) => r.jump(),
};

export async function mountStudio(
  host: HTMLElement,
  opts: { engine: EngineId; onStatus: (s: StudioStatus) => void },
): Promise<MountHandle> {
  const ref = new Reference();
  const keys = new Set<string>();
  let engineId: EngineId = opts.engine;
  let terrain: Terrain = "flat";
  let strength = 1;
  let gravComp = true;
  let alive = true;
  let ready = false;
  let message = "正在装外形";
  let error = "";
  let shake = 0;
  let active: PhysEngine | null = null;
  let shownHeight = ref.z;
  let lastState: PhysState | null = null;
  let activeContacts = 0;
  let servoNow = 0;
  const feetNow = [0, 0, 0, 0];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x101412, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.domElement.className = "block h-full w-full touch-none";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x101412, 7, 16);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 40);
  scene.add(new THREE.HemisphereLight(0xe7e2d8, 0x1a211c, 0.85));
  const sun = new THREE.DirectionalLight(0xfff4e8, 2.1);
  sun.position.set(3.2, 6.5, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const shadow = sun.shadow.camera;
  shadow.near = 0.5;
  shadow.far = 18;
  shadow.left = -4;
  shadow.right = 4;
  shadow.top = 4;
  shadow.bottom = -4;
  scene.add(sun);
  scene.add(sun.target);

  const ground = new THREE.Group();
  scene.add(ground);
  const grid = new THREE.GridHelper(14, 28, 0x3a4a40, 0x24302a);
  grid.position.y = 0.004;
  scene.add(grid);

  const dots: THREE.Mesh[] = [];
  const dotGeo = new THREE.SphereGeometry(0.018, 8, 6);
  const dotMat = new THREE.MeshStandardMaterial({
    color: 0xe85d04,
    emissive: 0xe85d04,
    emissiveIntensity: 0.6,
    roughness: 0.4,
  });
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(dotGeo, dotMat);
    m.visible = false;
    scene.add(m);
    dots.push(m);
  }

  let ghost: Rig | null = null;
  let solid: Rig | null = null;
  const pBody = new THREE.Vector3();
  const qBody = new THREE.Quaternion();
  const forward = new THREE.Vector3();
  const camOff = new THREE.Vector3();
  const look = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let orbitYaw = 0.42;
  let orbitPitch = 0.38;
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

  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1c2820, roughness: 0.92, metalness: 0 });
  const lowMat = new THREE.MeshStandardMaterial({ color: 0x141c18, roughness: 0.95, metalness: 0 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0x8a4b24, roughness: 0.7, metalness: 0.05 });

  function paintGround() {
    for (const child of [...ground.children]) {
      ground.remove(child);
      (child as THREE.Mesh).geometry?.dispose();
    }
    const add = (sx: number, sy: number, sz: number, x: number, y: number, z: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = sy > 0.12;
      ground.add(mesh);
    };
    if (terrain === "flat") {
      add(16, 0.1, 16, 0, -0.05, 0, groundMat);
      grid.visible = true;
      return;
    }
    grid.visible = false;
    add(3.2, 0.1, 2.9, 0, -0.05, 0.9, groundMat);
    add(3.2, 0.2, 4.8, 0, -0.29, -2.4, lowMat);
    add(3.2, 0.19, 0.045, 0, -0.095, -0.55, lipMat);
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
      error,
    });
  }

  let acc = 0;
  let statusAcc = 0;
  const timer = new THREE.Timer();
  timer.connect(document);

  function onKey(e: KeyboardEvent, down: boolean) {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    if (down) keys.add(e.code);
    else keys.delete(e.code);
  }
  const keyDown = (e: KeyboardEvent) => onKey(e, true);
  const keyUp = (e: KeyboardEvent) => onKey(e, false);
  const blur = () => keys.clear();
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", blur);

  const el = renderer.domElement;
  const pointerDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    el.setPointerCapture(e.pointerId);
  };
  const pointerUp = () => {
    dragging = false;
  };
  const pointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    orbitYaw -= (e.clientX - lastX) * 0.005;
    orbitPitch = Math.max(0.08, Math.min(1.15, orbitPitch + (e.clientY - lastY) * 0.004));
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    dist = Math.max(1.3, Math.min(6.5, dist + Math.sign(e.deltaY) * 0.18));
  };
  el.addEventListener("pointerdown", pointerDown);
  el.addEventListener("pointerup", pointerUp);
  el.addEventListener("pointermove", pointerMove);
  el.addEventListener("wheel", wheel, { passive: false });

  function frame() {
    if (!alive) return;
    timer.update();
    const dt = Math.min(0.05, timer.getDelta());
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
    if (!reduceMotion && shake > 0.001) {
      const elapsed = timer.getElapsed();
      camOff.x += Math.sin(elapsed * 46) * shake * 0.05;
      camOff.y += Math.cos(elapsed * 37) * shake * 0.03;
      shake *= Math.exp(-dt * 5);
    }
    camera.position.copy(pBody).add(camOff);
    look.copy(pBody);
    look.y += 0.12;
    camera.lookAt(look);
    sun.position.set(pBody.x + 3.2, 6.5, pBody.z + 2.4);
    sun.target.position.copy(pBody);
    sun.target.updateMatrixWorld();
    renderer.render(scene, camera);
    window.__controlsTest = liveProbe;
    statusAcc += dt;
    if (statusAcc > 0.12) {
      statusAcc = 0;
      publish();
    }
  }
  const liveProbe: Probe = {
    getYaw: () => ref.yaw,
    getSpeed: () => ref.sample().speed,
    setKeys: (codes) => {
      keys.clear();
      for (const code of codes) keys.add(code);
    },
  };
  window.__controlsTest = liveProbe;
  timer.update();
  renderer.setAnimationLoop(frame);

  async function ensure(id: EngineId) {
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

  function applyTerrain(next: Terrain) {
    if (terrain === next && engineTerrain.get(engineId) === next) return;
    terrain = next;
    paintGround();
    if (active && engineTerrain.get(active.id) !== next) {
      active.setTerrain(next);
      engineTerrain.set(active.id, next);
    }
  }

  const handle: MountHandle = {
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
      strength = Math.max(0.15, Math.min(1.4, n));
    },
    setGravComp(on) {
      gravComp = on;
    },
    scenario(name) {
      shake = name === "push" ? 0.55 : 0.3;
      if (name === "step") {
        applyTerrain("step");
        ref.resetStand();
        settle();
        ref.forceFor(2.5, 0.46);
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
      ref.forceFor(Math.max(0.2, seconds), vx);
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
      if (window.__controlsTest === liveProbe) delete window.__controlsTest;
      renderer.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      groundMat.dispose();
      lowMat.dispose();
      lipMat.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    },
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
