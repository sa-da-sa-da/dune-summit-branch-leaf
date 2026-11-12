import { Link } from "@tanstack/react-router";
import { ArrowUp, Box, Cpu, Footprints, Hand, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { EngineId } from "@/sim/phys";
import { runMiniPyAsync } from "@/sim/minipy.js";
import type { MountHandle, StudioStatus, Terrain } from "@/sim/mount";

const EMPTY: StudioStatus = {
  ready: false,
  engine: "rapier",
  pose: "站立",
  speed: 0,
  height: 0.27,
  contacts: 0,
  feet: [0, 0, 0, 0],
  servo: 0,
  terrain: "flat",
  message: "正在把机器狗装进教室",
  error: "",
};

const ACTIONS = [
  ["stand", "站立"],
  ["lie", "趴下"],
  ["sit", "坐下"],
  ["hello", "打招呼"],
  ["stretch", "伸懒腰"],
  ["heart", "比心"],
  ["content", "开心"],
  ["jump", "前跳"],
  ["dance", "舞蹈"],
] as const;

const SCRIPTS = [
  { id: "push", label: "推一把", src: "print('站好，从侧面推')\nstand()\npush()\n" },
  { id: "lift", label: "拉起来", src: "print('向上拎一下')\nstand()\nlift()\n" },
  { id: "miss", label: "踩空", src: "print('走向台阶边缘')\nhome()\nmiss()\n" },
] as const;

const PADS = [
  ["KeyQ", "左移"],
  ["KeyW", "前进"],
  ["KeyE", "右移"],
  ["KeyA", "左转"],
  ["KeyS", "后退"],
  ["KeyD", "右转"],
] as const;

export function Studio({ initial }: { initial: EngineId }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<MountHandle | null>(null);
  const [status, setStatus] = useState<StudioStatus>({ ...EMPTY, engine: initial });
  const [strength, setStrength] = useState(1);
  const [grav, setGrav] = useState(true);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [src, setSrc] = useState<string>(SCRIPTS[0].src);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.current?.setStrength(strength);
    api.current?.setGravComp(grav);
  }, [status.ready, strength, grav]);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let handle: MountHandle | null = null;
    let cancel = false;
    void import("@/sim/mount").then(async (mod) => {
      const mounted = await mod.mountStudio(node, {
        engine: initial,
        onStatus: (next) => {
          if (!cancel) setStatus(next);
        },
      });
      if (cancel) {
        mounted.destroy();
        return;
      }
      handle = mounted;
      api.current = mounted;
    });
    return () => {
      cancel = true;
      handle?.destroy();
      api.current = null;
    };
  }, [initial]);

  function runScript(text: string) {
    const live = api.current;
    if (!live || running) return;
    setRunning(true);
    setLog([]);
    void runMiniPyAsync(text, {}, {
      builtins: {
        print: (...args: unknown[]) => setLog((lines) => [...lines, args.map(String).join(" ")].slice(-6)),
        sleep: (seconds: number) =>
          new Promise((resolve) => {
            window.setTimeout(resolve, Math.max(0, Math.min(6, Number(seconds) || 0)) * 1000);
          }),
        stand: () => live.gesture("stand"),
        lie: () => live.gesture("lie"),
        sit: () => live.gesture("sit"),
        hello: () => live.gesture("hello"),
        jump: () => live.gesture("jump"),
        dance: () => live.gesture("dance"),
        push: () => live.scenario("push"),
        lift: () => live.scenario("lift"),
        miss: () => live.scenario("step"),
        home: () => live.reset(),
        flat: () => live.flat(),
        walk: (seconds: number, vx: number) => live.walk(Number(seconds) || 1, Number(vx) || 0.4),
      },
    })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "脚本停了";
        setLog((lines) => [...lines, msg].slice(-6));
      })
      .finally(() => setRunning(false));
  }

  const engine = status.engine;
  return (
    <main className="flex h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="font-display text-xl leading-none text-fg">Go2 物理课堂</p>
          <p className="mt-1 truncate text-sm text-muted">参考轨迹照旧走，刚体和接触叠在上面</p>
        </div>
        <nav className="ml-auto flex gap-2">
          <Entry to="/" active={initial === "rapier"} icon={<Box size={16} />} title="课堂刚体" hint="Rapier" />
          <Entry to="/mujoco" active={initial === "mujoco"} icon={<Cpu size={16} />} title="真机模型" hint="MuJoCo" />
        </nav>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={host} className="absolute inset-0" />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-3 p-3">
          <section className="pointer-events-auto max-w-sm rounded-xl border border-line bg-surface/90 p-3 backdrop-blur-sm">
            <p className="text-sm text-muted">{status.error || status.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Scenario icon={<Hand size={16} />} label="推一把" onClick={() => api.current?.scenario("push")} disabled={!status.ready} />
              <Scenario icon={<ArrowUp size={16} />} label="拉起来" onClick={() => api.current?.scenario("lift")} disabled={!status.ready} />
              <Scenario icon={<Footprints size={16} />} label="踩空台阶" onClick={() => api.current?.scenario("step")} disabled={!status.ready} />
            </div>
          </section>
          <StatusCard status={status} engine={engine} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3">
          <div className="pointer-events-auto flex gap-2 overflow-x-auto">
            {ACTIONS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                disabled={!status.ready}
                onClick={() => api.current?.gesture(id)}
                className="h-11 shrink-0 rounded-full border border-line bg-surface px-4 text-sm text-fg disabled:opacity-40"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => api.current?.reset()}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-raised px-4 text-sm text-fg"
            >
              <RotateCcw size={15} />
              复位
            </button>
            <button
              type="button"
              onClick={() => setScriptOpen((v) => !v)}
              className="h-11 shrink-0 rounded-full border border-line bg-raised px-4 text-sm text-fg"
            >
              {scriptOpen ? "收起脚本" : "课堂脚本"}
            </button>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="pointer-events-auto grid grid-cols-3 gap-2 sm:hidden">
              {PADS.map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  className="h-11 rounded-lg border border-line bg-surface text-sm text-fg"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    api.current?.hold(code, true);
                  }}
                  onPointerUp={() => api.current?.hold(code, false)}
                  onPointerLeave={() => api.current?.hold(code, false)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="pointer-events-auto ml-auto flex min-w-64 flex-1 flex-col gap-2 rounded-xl border border-line bg-surface/90 p-3 sm:max-w-sm">
              <label className="flex items-center justify-between gap-3 text-sm text-muted">
                伺服强度
                <span className="text-fg">{strength.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0.2}
                max={1.4}
                step={0.05}
                value={strength}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setStrength(n);
                  api.current?.setStrength(n);
                }}
                className="accent-accent"
              />
              <label className="flex items-center justify-between gap-3 text-sm text-muted">
                重力补偿
                <span className="text-fg">{engine === "mujoco" ? (grav ? "开" : "关") : "仅真机模型"}</span>
              </label>
              <button
                type="button"
                disabled={engine !== "mujoco"}
                onClick={() => {
                  const next = !grav;
                  setGrav(next);
                  api.current?.setGravComp(next);
                }}
                className="h-11 rounded-lg bg-accent text-sm font-medium text-accent-ink disabled:opacity-40"
              >
                {grav ? "补偿开着" : "补偿关着"}
              </button>
            </div>
          </div>

          {scriptOpen ? (
            <section className="pointer-events-auto rounded-xl border border-line bg-surface p-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {SCRIPTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="h-11 rounded-full border border-line px-4 text-sm text-fg"
                    onClick={() => {
                      setSrc(item.src);
                      runScript(item.src);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={running || !status.ready}
                  onClick={() => runScript(src)}
                  className="ml-auto h-11 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink disabled:opacity-40"
                >
                  {running ? "在跑" : "运行"}
                </button>
              </div>
              <textarea
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                spellCheck={false}
                className="h-28 w-full resize-none rounded-lg border border-line bg-bg p-3 font-sans text-sm text-fg outline-none"
              />
              <p className="mt-2 min-h-5 text-sm text-muted">{log.join("  ·  ") || "print、stand、push、lift、miss、walk(秒, 速度)"}</p>
            </section>
          ) : null}
        </div>

        {!status.ready && !status.error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/70">
            <p className="font-display text-2xl text-fg">{status.message}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Scenario({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  );
}

function Entry({
  to,
  active,
  icon,
  title,
  hint,
}: {
  to: "/" | "/mujoco";
  active: boolean;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className={`flex h-11 items-center gap-2 rounded-full border px-3 text-sm ${
        active ? "border-accent bg-accent text-accent-ink" : "border-line bg-raised text-fg"
      }`}
    >
      {icon}
      <span className="font-medium">{title}</span>
      <span className={`hidden sm:inline ${active ? "text-accent-ink/80" : "text-muted"}`}>{hint}</span>
    </Link>
  );
}

function StatusCard({ status, engine }: { status: StudioStatus; engine: EngineId }) {
  const terrain: Record<Terrain, string> = { flat: "平地", step: "台阶" };
  return (
    <section className="pointer-events-none hidden min-w-52 rounded-xl border border-line bg-surface/90 p-3 text-sm backdrop-blur-sm sm:block">
      <p className="text-muted">{engine === "mujoco" ? "MuJoCo WASM" : "Rapier 刚体"}</p>
      <p className="mt-1 font-display text-2xl leading-none">{status.pose}</p>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-muted">
        <dt>高度</dt>
        <dd className="text-right text-fg">{status.height.toFixed(2)} m</dd>
        <dt>速度</dt>
        <dd className="text-right text-fg">{status.speed.toFixed(2)}</dd>
        <dt>接触</dt>
        <dd className="text-right text-fg">{status.contacts}</dd>
        <dt>地面</dt>
        <dd className="text-right text-fg">{terrain[status.terrain]}</dd>
        <dt>伺服</dt>
        <dd className="text-right text-fg">{status.servo.toFixed(0)} N</dd>
      </dl>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {["FL", "FR", "RL", "RR"].map((name, i) => (
          <div key={name} className="rounded-md bg-raised px-1 py-1 text-center">
            <div className="text-muted">{name}</div>
            <div className="text-fg">{Math.round(status.feet[i] ?? 0)}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-muted">W 前进 · A 左转 · D 右转 · 拖拽转视角</p>
    </section>
  );
}
