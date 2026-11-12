/* 迷你 Python 解释器：变量、if/elif/else、while、for..in range、print、算术与比较 */
// @ts-nocheck
'use strict';

  function lex(src) {
    const out = [];
    let i = 0;
    const isDigit = c => c >= '0' && c <= '9';
    const isAlpha = c => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
    while (i < src.length) {
      const c = src[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
        let j = i;
        while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j++;
        out.push({ t: 'num', v: parseFloat(src.slice(i, j)) });
        i = j; continue;
      }
      if (isAlpha(c)) {
        let j = i;
        while (j < src.length && (isAlpha(src[j]) || isDigit(src[j]))) j++;
        out.push({ t: 'name', v: src.slice(i, j) });
        i = j; continue;
      }
      if (c === '"' || c === "'") {
        let j = i + 1, s = '';
        while (j < src.length && src[j] !== c) { s += src[j]; j++; }
        out.push({ t: 'str', v: s });
        i = j + 1; continue;
      }
      const two = src.substr(i, 2);
      if (['==', '!=', '<=', '>=', '//', '**'].indexOf(two) >= 0) {
        out.push({ t: 'op', v: two }); i += 2; continue;
      }
      out.push({ t: 'op', v: c });
      i++;
    }
    return out;
  }

  const BIN = {
    'or': 1, 'and': 2,
    '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3, 'is': 3,
    '+': 4, '-': 4, '*': 5, '/': 5, '//': 5, '%': 5, '**': 6
  };

  function parseExpr(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    function primary() {
      const tk = next();
      if (!tk) throw new Error('表达式不完整');
      if (tk.t === 'num') return { type: 'num', v: tk.v };
      if (tk.t === 'str') return { type: 'str', v: tk.v };
      if (tk.t === 'name') {
        if (tk.v === 'True') return { type: 'num', v: 1 };
        if (tk.v === 'False') return { type: 'num', v: 0 };
        if (tk.v === 'None') return { type: 'none' };
        let node = { type: 'name', n: tk.v };
        while (peek() && peek().t === 'op' && (peek().v === '(' || peek().v === '.')) {
          if (peek().v === '.') {
            next();
            const attr = next();
            if (!attr || attr.t !== 'name') throw new Error('属性名不对');
            node = { type: 'attr', obj: node, name: attr.v };
          } else {
            next();
            const args = [];
            if (peek() && !(peek().t === 'op' && peek().v === ')')) {
              args.push(bin(0));
              while (peek() && peek().t === 'op' && peek().v === ',') {
                next();
                if (peek() && peek().t === 'op' && peek().v === ')') break;
                args.push(bin(0));
              }
            }
            if (peek() && peek().v === ')') next();
            node = { type: 'call', callee: node, args: args };
          }
        }
        return node;
      }
      if (tk.v === '(') {
        const e = bin(0);
        if (peek() && peek().v === ')') next();
        return e;
      }
      if (tk.v === '-') return { type: 'un', op: '-', e: primary() };
      if (tk.v === 'not') return { type: 'un', op: 'not', e: primary() };
      throw new Error('看不懂这个符号：' + tk.v);
    }

    function bin(minPrec) {
      let left = primary();
      for (;;) {
        const tk = peek();
        if (!tk) break;
        let op = null;
        if (tk.t === 'op' && BIN[tk.v] !== undefined) op = tk.v;
        if (tk.t === 'name' && (tk.v === 'and' || tk.v === 'or' || tk.v === 'is')) op = tk.v;
        if (!op) break;
        const prec = BIN[op];
        if (prec < minPrec) break;
        next();
        if (op === 'is' && peek() && peek().t === 'name' && peek().v === 'not') { next(); op = 'is not'; }
        const right = bin(prec + (op === '**' ? 0 : 1));
        left = { type: 'bin', op: op, l: left, r: right };
      }
      return left;
    }

    return bin(0);
  }

  function truthy(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v.length > 0;
    return true;
  }

  function evaluate(node, env, b) {
    switch (node.type) {
      case 'num': return node.v;
      case 'str': return node.v;
      case 'none': return null;
      case 'name':
        if (Object.prototype.hasOwnProperty.call(env, node.n)) return env[node.n];
        throw new Error('变量 ' + node.n + ' 没有定义');
      case 'un':
        if (node.op === '-') return -evaluate(node.e, env, b);
        return truthy(evaluate(node.e, env, b)) ? 0 : 1;
      case 'bin': {
        const a = evaluate(node.l, env, b);
        if (node.op === 'and') return truthy(a) ? (truthy(evaluate(node.r, env, b)) ? 1 : 0) : 0;
        if (node.op === 'or') return truthy(a) ? 1 : (truthy(evaluate(node.r, env, b)) ? 1 : 0);
        const c = evaluate(node.r, env, b);
        switch (node.op) {
          case '+': return (typeof a === 'string' || typeof c === 'string') ? String(a) + String(c) : a + c;
          case '-': return a - c;
          case '*': return a * c;
          case '/': return a / c;
          case '//': return Math.floor(a / c);
          case '%': return a % c;
          case '**': return Math.pow(a, c);
          case '==': return a == c ? 1 : 0;
          case '!=': return a != c ? 1 : 0;
          case '<': return a < c ? 1 : 0;
          case '>': return a > c ? 1 : 0;
          case '<=': return a <= c ? 1 : 0;
          case '>=': return a >= c ? 1 : 0;
          case 'is': return a === c ? 1 : 0;
          case 'is not': return a !== c ? 1 : 0;
        }
        return 0;
      }
      case 'attr': {
        const o = evaluate(node.obj, env, b);
        throw new Error('不能读取属性 ' + node.name);
      }
      case 'call': {
        const args = node.args.map(a => evaluate(a, env, b));
        if (node.callee.type === 'name') {
          const fn = b.builtins[node.callee.n];
          if (!fn) throw new Error('没有这个函数：' + node.callee.n);
          return fn.apply(null, args);
        }
        if (node.callee.type === 'attr') {
          const obj = evaluate(node.callee.obj, env, b);
          const m = obj && obj[node.callee.name];
          if (typeof m !== 'function') throw new Error('这个对象没有方法 ' + node.callee.name);
          return m.apply(obj, args);
        }
        throw new Error('这个调用看不懂');
      }
    }
    return 0;
  }

  function stripComment(s) {
    let q = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '#') return s.slice(0, i);
    }
    return s;
  }

  function prepare(src) {
    const lines = [];
    src.split('\n').forEach((r, i) => {
      const clean = stripComment(r).replace(/\s+$/, '');
      if (!clean.trim()) return;
      let ind = 0;
      for (const ch of clean) {
        if (ch === ' ') ind++;
        else if (ch === '\t') ind += 4;
        else break;
      }
      lines.push({ ind: ind, text: clean.trim(), line: i + 1 });
    });
    return lines;
  }

  function parseChild(lines, i, parentIndent, lineNo) {
    if (i >= lines.length || lines[i].ind <= parentIndent) {
      throw new Error('第 ' + lineNo + ' 行：冒号后面要缩进');
    }
    return parseBlock(lines, i, lines[i].ind);
  }

  function parseBlock(lines, i, indent) {
    const stmts = [];
    while (i < lines.length && lines[i].ind >= indent) {
      const L = lines[i];
      if (L.ind > indent) throw new Error('第 ' + L.line + ' 行：缩进多了');
      const t = L.text;

      if (t.startsWith('if ') && t.endsWith(':')) {
        const branches = [];
        let r = parseChild(lines, i + 1, indent, L.line);
        branches.push({ cond: parseExpr(lex(t.slice(3, -1))), body: r.stmts });
        i = r.i;
        let elseBody = null;
        while (i < lines.length && lines[i].ind === indent &&
               (lines[i].text.startsWith('elif ') || lines[i].text === 'else:')) {
          const T = lines[i].text;
          if (T.startsWith('elif ')) {
            const r2 = parseChild(lines, i + 1, indent, lines[i].line);
            branches.push({ cond: parseExpr(lex(T.slice(5, -1))), body: r2.stmts });
            i = r2.i;
          } else {
            const r3 = parseChild(lines, i + 1, indent, lines[i].line);
            elseBody = r3.stmts;
            i = r3.i;
            break;
          }
        }
        stmts.push({ type: 'if', branches: branches, elseBody: elseBody });
        continue;
      }

      if (t.startsWith('while ') && t.endsWith(':')) {
        const r = parseChild(lines, i + 1, indent, L.line);
        stmts.push({ type: 'while', cond: parseExpr(lex(t.slice(6, -1))), body: r.stmts, line: L.line });
        i = r.i;
        continue;
      }

      if (t.startsWith('for ') && t.endsWith(':')) {
        const head = t.slice(4, -1);
        const m = head.match(/^([A-Za-z_]\w*)\s+in\s+range\s*\((.*)\)$/);
        if (!m) throw new Error('第 ' + L.line + ' 行：for 只能写成 for i in range(...)');
        const args = m[2].trim() ? m[2].split(',').map(s => parseExpr(lex(s))) : [];
        const r = parseChild(lines, i + 1, indent, L.line);
        stmts.push({ type: 'for', name: m[1], args: args, body: r.stmts, line: L.line });
        i = r.i;
        continue;
      }

      if (t === 'break') { stmts.push({ type: 'break', line: L.line }); i++; continue; }
      if (t === 'continue') { stmts.push({ type: 'continue', line: L.line }); i++; continue; }
      if (t === 'pass') { stmts.push({ type: 'pass', line: L.line }); i++; continue; }

      const asg = t.match(/^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/);
      if (asg) {
        stmts.push({ type: 'assign', name: asg[1], expr: parseExpr(lex(asg[2])), line: L.line });
        i++;
        continue;
      }

      stmts.push({ type: 'expr', expr: parseExpr(lex(t)), line: L.line });
      i++;
    }
    return { stmts: stmts, i: i };
  }

  function exec(stmts, env, b) {
    for (const st of stmts) {
      if (--b.budget < 0) throw new Error('程序跑太久了 —— 检查循环能不能停');
      if (st.line) b.line = st.line;
      if (st.type === 'expr') { evaluate(st.expr, env, b); continue; }
      if (st.type === 'assign') { env[st.name] = evaluate(st.expr, env, b); continue; }
      if (st.type === 'pass') continue;
      if (st.type === 'break') throw { signal: 'break' };
      if (st.type === 'continue') throw { signal: 'continue' };
      if (st.type === 'if') {
        let done = false;
        for (const br of st.branches) {
          if (truthy(evaluate(br.cond, env, b))) { exec(br.body, env, b); done = true; break; }
        }
        if (!done && st.elseBody) exec(st.elseBody, env, b);
        continue;
      }
      if (st.type === 'while') {
        let n = 0;
        while (truthy(evaluate(st.cond, env, b))) {
          if (++n > 5000) throw new Error('while 循环次数太多，条件可能永远为真');
          try { exec(st.body, env, b); }
          catch (e) {
            if (e && e.signal === 'break') break;
            if (e && e.signal === 'continue') continue;
            throw e;
          }
        }
        continue;
      }
      if (st.type === 'for') {
        const v = st.args.map(a => evaluate(a, env, b));
        let a0 = 0, b0 = 0, step = 1;
        if (v.length === 1) b0 = v[0];
        else if (v.length === 2) { a0 = v[0]; b0 = v[1]; }
        else { a0 = v[0]; b0 = v[1]; step = v[2] || 1; }
        for (let k = a0; (step > 0 ? k < b0 : k > b0); k += step) {
          env[st.name] = k;
          try { exec(st.body, env, b); }
          catch (e) {
            if (e && e.signal === 'break') break;
            if (e && e.signal === 'continue') continue;
            throw e;
          }
        }
        continue;
      }
    }
  }

  async function execAsync(stmts, env, b) {
    for (const st of stmts) {
      if (--b.budget < 0) throw new Error('程序跑太久了 —— 检查循环能不能停');
      if (b.signal && b.signal.aborted) return;
      if (st.line) b.line = st.line;
      if (st.type === 'expr') {
        const v = evaluate(st.expr, env, b);
        if (v && typeof v.then === 'function') await v;
        continue;
      }
      if (st.type === 'assign') { env[st.name] = evaluate(st.expr, env, b); continue; }
      if (st.type === 'pass') continue;
      if (st.type === 'break') throw { signal: 'break' };
      if (st.type === 'continue') throw { signal: 'continue' };
      if (st.type === 'if') {
        let done = false;
        for (const br of st.branches) {
          if (truthy(evaluate(br.cond, env, b))) { await execAsync(br.body, env, b); done = true; break; }
        }
        if (!done && st.elseBody) await execAsync(st.elseBody, env, b);
        continue;
      }
      if (st.type === 'while') {
        let n = 0;
        while (truthy(evaluate(st.cond, env, b))) {
          if (b.signal && b.signal.aborted) return;
          if (++n > 5000) throw new Error('while 循环次数太多，条件可能永远为真');
          try { await execAsync(st.body, env, b); }
          catch (e) {
            if (e && e.signal === 'break') break;
            if (e && e.signal === 'continue') continue;
            throw e;
          }
        }
        continue;
      }
      if (st.type === 'for') {
        const v = st.args.map(a => evaluate(a, env, b));
        let a0 = 0, b0 = 0, step = 1;
        if (v.length === 1) b0 = v[0];
        else if (v.length === 2) { a0 = v[0]; b0 = v[1]; }
        else { a0 = v[0]; b0 = v[1]; step = v[2] || 1; }
        for (let k = a0; (step > 0 ? k < b0 : k > b0); k += step) {
          if (b.signal && b.signal.aborted) return;
          env[st.name] = k;
          try { await execAsync(st.body, env, b); }
          catch (e) {
            if (e && e.signal === 'break') break;
            if (e && e.signal === 'continue') continue;
            throw e;
          }
        }
      }
    }
  }

export async function runMiniPyAsync(src, env, opts) {
  const b = {
    budget: (opts && opts.budget) || 60000,
    line: 0,
    builtins: (opts && opts.builtins) || {},
    signal: (opts && opts.signal) || null,
  };
  const lines = prepare(src);
  if (!lines.length) throw new Error('还没有写代码');
  const prog = parseBlock(lines, 0, lines[0].ind);
  await execAsync(prog.stmts, env, b);
  return b;
}

export function runMiniPy(src, env, opts) {
  const b = { budget: (opts && opts.budget) || 60000, line: 0, builtins: (opts && opts.builtins) || {} };
  const lines = prepare(src);
  if (!lines.length) throw new Error('还没有写代码');
  const prog = parseBlock(lines, 0, lines[0].ind);
  exec(prog.stmts, env, b);
  return b;
}

