import { i as __toESM } from "../_runtime.mjs";
import { q as require_react, x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Cpu, i as Footprints, n as RotateCcw, o as Box, r as Hand, s as ArrowUp } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/studio-BMx8fINf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function lex(src) {
	const out = [];
	let i = 0;
	const isDigit = (c) => c >= "0" && c <= "9";
	const isAlpha = (c) => c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "_";
	while (i < src.length) {
		const c = src[i];
		if (c === " " || c === "	") {
			i++;
			continue;
		}
		if (isDigit(c) || c === "." && isDigit(src[i + 1])) {
			let j = i;
			while (j < src.length && (isDigit(src[j]) || src[j] === ".")) j++;
			out.push({
				t: "num",
				v: parseFloat(src.slice(i, j))
			});
			i = j;
			continue;
		}
		if (isAlpha(c)) {
			let j = i;
			while (j < src.length && (isAlpha(src[j]) || isDigit(src[j]))) j++;
			out.push({
				t: "name",
				v: src.slice(i, j)
			});
			i = j;
			continue;
		}
		if (c === "\"" || c === "'") {
			let j = i + 1, s = "";
			while (j < src.length && src[j] !== c) {
				s += src[j];
				j++;
			}
			out.push({
				t: "str",
				v: s
			});
			i = j + 1;
			continue;
		}
		const two = src.substr(i, 2);
		if ([
			"==",
			"!=",
			"<=",
			">=",
			"//",
			"**"
		].indexOf(two) >= 0) {
			out.push({
				t: "op",
				v: two
			});
			i += 2;
			continue;
		}
		out.push({
			t: "op",
			v: c
		});
		i++;
	}
	return out;
}
var BIN = {
	"or": 1,
	"and": 2,
	"==": 3,
	"!=": 3,
	"<": 3,
	">": 3,
	"<=": 3,
	">=": 3,
	"is": 3,
	"+": 4,
	"-": 4,
	"*": 5,
	"/": 5,
	"//": 5,
	"%": 5,
	"**": 6
};
function parseExpr(tokens) {
	let pos = 0;
	const peek = () => tokens[pos];
	const next = () => tokens[pos++];
	function primary() {
		const tk = next();
		if (!tk) throw new Error("表达式不完整");
		if (tk.t === "num") return {
			type: "num",
			v: tk.v
		};
		if (tk.t === "str") return {
			type: "str",
			v: tk.v
		};
		if (tk.t === "name") {
			if (tk.v === "True") return {
				type: "num",
				v: 1
			};
			if (tk.v === "False") return {
				type: "num",
				v: 0
			};
			if (tk.v === "None") return { type: "none" };
			let node = {
				type: "name",
				n: tk.v
			};
			while (peek() && peek().t === "op" && (peek().v === "(" || peek().v === ".")) if (peek().v === ".") {
				next();
				const attr = next();
				if (!attr || attr.t !== "name") throw new Error("属性名不对");
				node = {
					type: "attr",
					obj: node,
					name: attr.v
				};
			} else {
				next();
				const args = [];
				if (peek() && !(peek().t === "op" && peek().v === ")")) {
					args.push(bin(0));
					while (peek() && peek().t === "op" && peek().v === ",") {
						next();
						if (peek() && peek().t === "op" && peek().v === ")") break;
						args.push(bin(0));
					}
				}
				if (peek() && peek().v === ")") next();
				node = {
					type: "call",
					callee: node,
					args
				};
			}
			return node;
		}
		if (tk.v === "(") {
			const e = bin(0);
			if (peek() && peek().v === ")") next();
			return e;
		}
		if (tk.v === "-") return {
			type: "un",
			op: "-",
			e: primary()
		};
		if (tk.v === "not") return {
			type: "un",
			op: "not",
			e: primary()
		};
		throw new Error("看不懂这个符号：" + tk.v);
	}
	function bin(minPrec) {
		let left = primary();
		for (;;) {
			const tk = peek();
			if (!tk) break;
			let op = null;
			if (tk.t === "op" && BIN[tk.v] !== void 0) op = tk.v;
			if (tk.t === "name" && (tk.v === "and" || tk.v === "or" || tk.v === "is")) op = tk.v;
			if (!op) break;
			const prec = BIN[op];
			if (prec < minPrec) break;
			next();
			if (op === "is" && peek() && peek().t === "name" && peek().v === "not") {
				next();
				op = "is not";
			}
			const right = bin(prec + (op === "**" ? 0 : 1));
			left = {
				type: "bin",
				op,
				l: left,
				r: right
			};
		}
		return left;
	}
	return bin(0);
}
function truthy(v) {
	if (v === null || v === void 0) return false;
	if (typeof v === "number") return v !== 0;
	if (typeof v === "string") return v.length > 0;
	return true;
}
function evaluate(node, env, b) {
	switch (node.type) {
		case "num": return node.v;
		case "str": return node.v;
		case "none": return null;
		case "name":
			if (Object.prototype.hasOwnProperty.call(env, node.n)) return env[node.n];
			throw new Error("变量 " + node.n + " 没有定义");
		case "un":
			if (node.op === "-") return -evaluate(node.e, env, b);
			return truthy(evaluate(node.e, env, b)) ? 0 : 1;
		case "bin": {
			const a = evaluate(node.l, env, b);
			if (node.op === "and") return truthy(a) ? truthy(evaluate(node.r, env, b)) ? 1 : 0 : 0;
			if (node.op === "or") return truthy(a) ? 1 : truthy(evaluate(node.r, env, b)) ? 1 : 0;
			const c = evaluate(node.r, env, b);
			switch (node.op) {
				case "+": return typeof a === "string" || typeof c === "string" ? String(a) + String(c) : a + c;
				case "-": return a - c;
				case "*": return a * c;
				case "/": return a / c;
				case "//": return Math.floor(a / c);
				case "%": return a % c;
				case "**": return Math.pow(a, c);
				case "==": return a == c ? 1 : 0;
				case "!=": return a != c ? 1 : 0;
				case "<": return a < c ? 1 : 0;
				case ">": return a > c ? 1 : 0;
				case "<=": return a <= c ? 1 : 0;
				case ">=": return a >= c ? 1 : 0;
				case "is": return a === c ? 1 : 0;
				case "is not": return a !== c ? 1 : 0;
			}
			return 0;
		}
		case "attr":
			evaluate(node.obj, env, b);
			throw new Error("不能读取属性 " + node.name);
		case "call": {
			const args = node.args.map((a) => evaluate(a, env, b));
			if (node.callee.type === "name") {
				const fn = b.builtins[node.callee.n];
				if (!fn) throw new Error("没有这个函数：" + node.callee.n);
				return fn.apply(null, args);
			}
			if (node.callee.type === "attr") {
				const obj = evaluate(node.callee.obj, env, b);
				const m = obj && obj[node.callee.name];
				if (typeof m !== "function") throw new Error("这个对象没有方法 " + node.callee.name);
				return m.apply(obj, args);
			}
			throw new Error("这个调用看不懂");
		}
	}
	return 0;
}
function stripComment(s) {
	let q = null;
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (q) {
			if (c === q) q = null;
			continue;
		}
		if (c === "\"" || c === "'") {
			q = c;
			continue;
		}
		if (c === "#") return s.slice(0, i);
	}
	return s;
}
function prepare(src) {
	const lines = [];
	src.split("\n").forEach((r, i) => {
		const clean = stripComment(r).replace(/\s+$/, "");
		if (!clean.trim()) return;
		let ind = 0;
		for (const ch of clean) if (ch === " ") ind++;
		else if (ch === "	") ind += 4;
		else break;
		lines.push({
			ind,
			text: clean.trim(),
			line: i + 1
		});
	});
	return lines;
}
function parseChild(lines, i, parentIndent, lineNo) {
	if (i >= lines.length || lines[i].ind <= parentIndent) throw new Error("第 " + lineNo + " 行：冒号后面要缩进");
	return parseBlock(lines, i, lines[i].ind);
}
function parseBlock(lines, i, indent) {
	const stmts = [];
	while (i < lines.length && lines[i].ind >= indent) {
		const L = lines[i];
		if (L.ind > indent) throw new Error("第 " + L.line + " 行：缩进多了");
		const t = L.text;
		if (t.startsWith("if ") && t.endsWith(":")) {
			const branches = [];
			let r = parseChild(lines, i + 1, indent, L.line);
			branches.push({
				cond: parseExpr(lex(t.slice(3, -1))),
				body: r.stmts
			});
			i = r.i;
			let elseBody = null;
			while (i < lines.length && lines[i].ind === indent && (lines[i].text.startsWith("elif ") || lines[i].text === "else:")) {
				const T = lines[i].text;
				if (T.startsWith("elif ")) {
					const r2 = parseChild(lines, i + 1, indent, lines[i].line);
					branches.push({
						cond: parseExpr(lex(T.slice(5, -1))),
						body: r2.stmts
					});
					i = r2.i;
				} else {
					const r3 = parseChild(lines, i + 1, indent, lines[i].line);
					elseBody = r3.stmts;
					i = r3.i;
					break;
				}
			}
			stmts.push({
				type: "if",
				branches,
				elseBody
			});
			continue;
		}
		if (t.startsWith("while ") && t.endsWith(":")) {
			const r = parseChild(lines, i + 1, indent, L.line);
			stmts.push({
				type: "while",
				cond: parseExpr(lex(t.slice(6, -1))),
				body: r.stmts,
				line: L.line
			});
			i = r.i;
			continue;
		}
		if (t.startsWith("for ") && t.endsWith(":")) {
			const m = t.slice(4, -1).match(/^([A-Za-z_]\w*)\s+in\s+range\s*\((.*)\)$/);
			if (!m) throw new Error("第 " + L.line + " 行：for 只能写成 for i in range(...)");
			const args = m[2].trim() ? m[2].split(",").map((s) => parseExpr(lex(s))) : [];
			const r = parseChild(lines, i + 1, indent, L.line);
			stmts.push({
				type: "for",
				name: m[1],
				args,
				body: r.stmts,
				line: L.line
			});
			i = r.i;
			continue;
		}
		if (t === "break") {
			stmts.push({
				type: "break",
				line: L.line
			});
			i++;
			continue;
		}
		if (t === "continue") {
			stmts.push({
				type: "continue",
				line: L.line
			});
			i++;
			continue;
		}
		if (t === "pass") {
			stmts.push({
				type: "pass",
				line: L.line
			});
			i++;
			continue;
		}
		const asg = t.match(/^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/);
		if (asg) {
			stmts.push({
				type: "assign",
				name: asg[1],
				expr: parseExpr(lex(asg[2])),
				line: L.line
			});
			i++;
			continue;
		}
		stmts.push({
			type: "expr",
			expr: parseExpr(lex(t)),
			line: L.line
		});
		i++;
	}
	return {
		stmts,
		i
	};
}
async function execAsync(stmts, env, b) {
	for (const st of stmts) {
		if (--b.budget < 0) throw new Error("程序跑太久了 —— 检查循环能不能停");
		if (b.signal && b.signal.aborted) return;
		if (st.line) b.line = st.line;
		if (st.type === "expr") {
			const v = evaluate(st.expr, env, b);
			if (v && typeof v.then === "function") await v;
			continue;
		}
		if (st.type === "assign") {
			env[st.name] = evaluate(st.expr, env, b);
			continue;
		}
		if (st.type === "pass") continue;
		if (st.type === "break") throw { signal: "break" };
		if (st.type === "continue") throw { signal: "continue" };
		if (st.type === "if") {
			let done = false;
			for (const br of st.branches) if (truthy(evaluate(br.cond, env, b))) {
				await execAsync(br.body, env, b);
				done = true;
				break;
			}
			if (!done && st.elseBody) await execAsync(st.elseBody, env, b);
			continue;
		}
		if (st.type === "while") {
			let n = 0;
			while (truthy(evaluate(st.cond, env, b))) {
				if (b.signal && b.signal.aborted) return;
				if (++n > 5e3) throw new Error("while 循环次数太多，条件可能永远为真");
				try {
					await execAsync(st.body, env, b);
				} catch (e) {
					if (e && e.signal === "break") break;
					if (e && e.signal === "continue") continue;
					throw e;
				}
			}
			continue;
		}
		if (st.type === "for") {
			const v = st.args.map((a) => evaluate(a, env, b));
			let a0 = 0, b0 = 0, step = 1;
			if (v.length === 1) b0 = v[0];
			else if (v.length === 2) {
				a0 = v[0];
				b0 = v[1];
			} else {
				a0 = v[0];
				b0 = v[1];
				step = v[2] || 1;
			}
			for (let k = a0; step > 0 ? k < b0 : k > b0; k += step) {
				if (b.signal && b.signal.aborted) return;
				env[st.name] = k;
				try {
					await execAsync(st.body, env, b);
				} catch (e) {
					if (e && e.signal === "break") break;
					if (e && e.signal === "continue") continue;
					throw e;
				}
			}
		}
	}
}
async function runMiniPyAsync(src, env, opts) {
	const b = {
		budget: opts && opts.budget || 6e4,
		line: 0,
		builtins: opts && opts.builtins || {},
		signal: opts && opts.signal || null
	};
	const lines = prepare(src);
	if (!lines.length) throw new Error("还没有写代码");
	await execAsync(parseBlock(lines, 0, lines[0].ind).stmts, env, b);
	return b;
}
var EMPTY = {
	ready: false,
	engine: "rapier",
	pose: "站立",
	speed: 0,
	height: .27,
	contacts: 0,
	feet: [
		0,
		0,
		0,
		0
	],
	servo: 0,
	terrain: "flat",
	message: "正在把机器狗装进教室",
	error: ""
};
var ACTIONS = [
	["stand", "站立"],
	["lie", "趴下"],
	["sit", "坐下"],
	["hello", "打招呼"],
	["stretch", "伸懒腰"],
	["heart", "比心"],
	["content", "开心"],
	["jump", "前跳"],
	["dance", "舞蹈"]
];
var SCRIPTS = [
	{
		id: "push",
		label: "推一把",
		src: "print('站好，从侧面推')\nstand()\npush()\n"
	},
	{
		id: "lift",
		label: "拉起来",
		src: "print('向上拎一下')\nstand()\nlift()\n"
	},
	{
		id: "miss",
		label: "踩空",
		src: "print('走向台阶边缘')\nhome()\nmiss()\n"
	}
];
var PADS = [
	["KeyQ", "左移"],
	["KeyW", "前进"],
	["KeyE", "右移"],
	["KeyA", "左转"],
	["KeyS", "后退"],
	["KeyD", "右转"]
];
function Studio({ initial }) {
	const host = (0, import_react.useRef)(null);
	const api = (0, import_react.useRef)(null);
	const [status, setStatus] = (0, import_react.useState)({
		...EMPTY,
		engine: initial
	});
	const [strength, setStrength] = (0, import_react.useState)(1);
	const [grav, setGrav] = (0, import_react.useState)(true);
	const [scriptOpen, setScriptOpen] = (0, import_react.useState)(false);
	const [src, setSrc] = (0, import_react.useState)(SCRIPTS[0].src);
	const [log, setLog] = (0, import_react.useState)([]);
	const [running, setRunning] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		api.current?.setStrength(strength);
		api.current?.setGravComp(grav);
	}, [
		status.ready,
		strength,
		grav
	]);
	(0, import_react.useEffect)(() => {
		const node = host.current;
		if (!node) return;
		let handle = null;
		let cancel = false;
		import("./mount-BWqdfChp.mjs").then(async (mod) => {
			const mounted = await mod.mountStudio(node, {
				engine: initial,
				onStatus: (next) => {
					if (!cancel) setStatus(next);
				}
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
	function runScript(text) {
		const live = api.current;
		if (!live || running) return;
		setRunning(true);
		setLog([]);
		runMiniPyAsync(text, {}, { builtins: {
			print: (...args) => setLog((lines) => [...lines, args.map(String).join(" ")].slice(-6)),
			sleep: (seconds) => new Promise((resolve) => {
				window.setTimeout(resolve, Math.max(0, Math.min(6, Number(seconds) || 0)) * 1e3);
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
			walk: (seconds, vx) => live.walk(Number(seconds) || 1, Number(vx) || .4)
		} }).catch((err) => {
			const msg = err instanceof Error ? err.message : "脚本停了";
			setLog((lines) => [...lines, msg].slice(-6));
		}).finally(() => setRunning(false));
	}
	const engine = status.engine;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex h-dvh flex-col bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex items-center gap-3 border-b border-line px-4 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-xl leading-none text-fg",
					children: "Go2 物理课堂"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 truncate text-sm text-muted",
					children: "参考轨迹照旧走，刚体和接触叠在上面"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "ml-auto flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Entry, {
					to: "/",
					active: initial === "rapier",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { size: 16 }),
					title: "课堂刚体",
					hint: "Rapier"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Entry, {
					to: "/mujoco",
					active: initial === "mujoco",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { size: 16 }),
					title: "真机模型",
					hint: "MuJoCo"
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative min-h-0 flex-1",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: host,
					className: "absolute inset-0"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute inset-x-0 top-0 flex justify-between gap-3 p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "pointer-events-auto max-w-sm rounded-xl border border-line bg-surface/90 p-3 backdrop-blur-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: status.error || status.message
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scenario, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hand, { size: 16 }),
									label: "推一把",
									onClick: () => api.current?.scenario("push"),
									disabled: !status.ready
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scenario, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { size: 16 }),
									label: "拉起来",
									onClick: () => api.current?.scenario("lift"),
									disabled: !status.ready
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scenario, {
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footprints, { size: 16 }),
									label: "踩空台阶",
									onClick: () => api.current?.scenario("step"),
									disabled: !status.ready
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusCard, {
						status,
						engine
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pointer-events-auto flex gap-2 overflow-x-auto",
							children: [
								ACTIONS.map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !status.ready,
									onClick: () => api.current?.gesture(id),
									className: "h-11 shrink-0 rounded-full border border-line bg-surface px-4 text-sm text-fg disabled:opacity-40",
									children: label
								}, id)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => api.current?.reset(),
									className: "flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-raised px-4 text-sm text-fg",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { size: 15 }), "复位"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setScriptOpen((v) => !v),
									className: "h-11 shrink-0 rounded-full border border-line bg-raised px-4 text-sm text-fg",
									children: scriptOpen ? "收起脚本" : "课堂脚本"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-end justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "pointer-events-auto grid grid-cols-3 gap-2 sm:hidden",
								children: PADS.map(([code, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-11 rounded-lg border border-line bg-surface text-sm text-fg",
									onPointerDown: (e) => {
										e.preventDefault();
										api.current?.hold(code, true);
									},
									onPointerUp: () => api.current?.hold(code, false),
									onPointerLeave: () => api.current?.hold(code, false),
									children: label
								}, code))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pointer-events-auto ml-auto flex min-w-64 flex-1 flex-col gap-2 rounded-xl border border-line bg-surface/90 p-3 sm:max-w-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center justify-between gap-3 text-sm text-muted",
										children: ["伺服强度", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-fg",
											children: strength.toFixed(2)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "range",
										min: .2,
										max: 1.4,
										step: .05,
										value: strength,
										onChange: (e) => {
											const n = Number(e.target.value);
											setStrength(n);
											api.current?.setStrength(n);
										},
										className: "accent-accent"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center justify-between gap-3 text-sm text-muted",
										children: ["重力补偿", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-fg",
											children: engine === "mujoco" ? grav ? "开" : "关" : "仅真机模型"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: engine !== "mujoco",
										onClick: () => {
											const next = !grav;
											setGrav(next);
											api.current?.setGravComp(next);
										},
										className: "h-11 rounded-lg bg-accent text-sm font-medium text-accent-ink disabled:opacity-40",
										children: grav ? "补偿开着" : "补偿关着"
									})
								]
							})]
						}),
						scriptOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "pointer-events-auto rounded-xl border border-line bg-surface p-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-2 flex flex-wrap gap-2",
									children: [SCRIPTS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "h-11 rounded-full border border-line px-4 text-sm text-fg",
										onClick: () => {
											setSrc(item.src);
											runScript(item.src);
										},
										children: item.label
									}, item.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: running || !status.ready,
										onClick: () => runScript(src),
										className: "ml-auto h-11 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink disabled:opacity-40",
										children: running ? "在跑" : "运行"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									value: src,
									onChange: (e) => setSrc(e.target.value),
									spellCheck: false,
									className: "h-28 w-full resize-none rounded-lg border border-line bg-bg p-3 font-sans text-sm text-fg outline-none"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 min-h-5 text-sm text-muted",
									children: log.join("  ·  ") || "print、stand、push、lift、miss、walk(秒, 速度)"
								})
							]
						}) : null
					]
				}),
				!status.ready && !status.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-0 flex items-center justify-center bg-bg/70",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl text-fg",
						children: status.message
					})
				}) : null
			]
		})]
	});
}
function Scenario({ icon, label, onClick, disabled }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		disabled,
		onClick,
		className: "flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink disabled:opacity-40",
		children: [icon, label]
	});
}
function Entry({ to, active, icon, title, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to,
		className: `flex h-11 items-center gap-2 rounded-full border px-3 text-sm ${active ? "border-accent bg-accent text-accent-ink" : "border-line bg-raised text-fg"}`,
		children: [
			icon,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-medium",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: active ? "text-accent-ink/80" : "text-muted",
				children: hint
			})
		]
	});
}
function StatusCard({ status, engine }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "pointer-events-none hidden min-w-52 rounded-xl border border-line bg-surface/90 p-3 text-sm backdrop-blur-sm sm:block",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: engine === "mujoco" ? "MuJoCo WASM" : "Rapier 刚体"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-display text-2xl leading-none",
				children: status.pose
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-3 grid grid-cols-2 gap-y-1 text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "高度" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
						className: "text-right text-fg",
						children: [status.height.toFixed(2), " m"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "速度" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-right text-fg",
						children: status.speed.toFixed(2)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "接触" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-right text-fg",
						children: status.contacts
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "地面" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-right text-fg",
						children: {
							flat: "平地",
							step: "台阶"
						}[status.terrain]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "伺服" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
						className: "text-right text-fg",
						children: [status.servo.toFixed(0), " N"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid grid-cols-4 gap-1",
				children: [
					"FL",
					"FR",
					"RL",
					"RR"
				].map((name, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md bg-raised px-1 py-1 text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-muted",
						children: name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-fg",
						children: Math.round(status.feet[i] ?? 0)
					})]
				}, name))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-muted",
				children: "W 前进 · A 左转 · D 右转 · 拖拽转视角"
			})
		]
	});
}
//#endregion
export { Studio as t };
