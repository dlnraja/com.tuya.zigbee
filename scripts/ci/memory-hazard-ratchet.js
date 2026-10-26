#!/usr/bin/env node
/**
 * P3068 — memory-hazard ratchet (Homey app heap ~64 MB, Bastien OOM/reboot history).
 * Static scan of app.js, lib/, drivers/ for three patterns that grow the heap or keep it alive:
 *   unbounded-collection  this.X / module-level X = new Map|Set|[] that is filled (set/add/push) in the file
 *                         but never shrunk (delete/clear/shift/splice/pop/length=/size cap/re-assign)
 *   raw-timer             bare setInterval/setTimeout (no owner: not this.homey.*, not a Promise delay)
 *                         — survives device delete, keeps the device and its closures alive
 *   hot-stringify         JSON.stringify(...) inside a report/attribute/DP/frame handler without
 *                         truncation (.slice/.substring) — one big string per incoming frame
 * Pre-existing hits are frozen in .github/memory-hazard-baseline.json: a file may never get MORE hits
 * of a rule than its baseline (absent file = 0). Lower counts are always fine.
 *   node scripts/ci/memory-hazard-ratchet.js [--json] [--update-baseline]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE = path.join(ROOT, '.github', 'memory-hazard-baseline.json');
const SKIP = new Set(['node_modules', '.homeybuild', 'test', 'tests', 'archive', 'assets', 'locales']);
const HOT = /(report|attr|datapoint|(^|_)dp|frame|response|zcl|cluster|oncapability|handle|ondata|onmessage|incoming|received)/i;

function files() {
  const out = fs.existsSync(path.join(ROOT, 'app.js')) ? ['app.js'] : [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
      if (SKIP.has(e.name) || e.name.startsWith('.')) { continue; }
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) { walk(r); } else if (e.name.endsWith('.js')) { out.push(r); }
    }
  };
  for (const d of ['lib', 'drivers']) { if (fs.existsSync(path.join(ROOT, d))) { walk(d); } }
  return out.sort();
}

function parse(src) {
  const espree = require('espree');
  const opt = { ecmaVersion: 'latest', range: true };
  try { return espree.parse(src, { ...opt, sourceType: 'script' }); } catch (_e) { /* try module */ }
  try { return espree.parse(src, { ...opt, sourceType: 'module' }); } catch (_e) { return null; }
}

function walk(node, parents, visit) {
  if (!node || typeof node.type !== 'string') { return; }
  visit(node, parents);
  parents.push(node);
  for (const k of Object.keys(node)) {
    if (k === 'range' || k === 'loc') { continue; }
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) { walk(c, parents, visit); } } else if (v && typeof v.type === 'string') { walk(v, parents, visit); }
  }
  parents.pop();
}

const isFn = (n) => /Function/.test(n.type);
function fnName(fn, parent) {
  if (fn.id && fn.id.name) { return fn.id.name; }
  if (!parent) { return ''; }
  const key = parent.key || (parent.type === 'AssignmentExpression' ? parent.left.property || parent.left : null) || (parent.type === 'VariableDeclarator' ? parent.id : null);
  return key ? key.name || key.value || '' : '';
}
function enclosingFnNames(parents) {
  const names = [];
  for (let i = parents.length - 1; i >= 0; i--) { if (isFn(parents[i])) { names.push(fnName(parents[i], parents[i - 1])); } }
  return names;
}
// setTimeout(resolve, ms) inside `new Promise((resolve) => …)` is a bounded delay, not an owned timer
function isPromiseDelay(call, parents) {
  const a0 = call.arguments[0];
  for (let i = parents.length - 1; i >= 1; i--) {
    const fn = parents[i];
    if (!isFn(fn)) { continue; }
    const p = parents[i - 1];
    const resolver = fn.params[0] && fn.params[0].name;
    if (p.type === 'NewExpression' && p.callee.name === 'Promise' && resolver) {
      return Boolean(a0) && ((a0.type === 'Identifier' && a0.name === resolver) || (isFn(a0) && a0.range[1] - a0.range[0] < 120));
    }
    return false;
  }
  return false;
}
function collectionKind(init) {
  if (init.type === 'NewExpression' && ['Map', 'Set'].includes(init.callee.name)) { return init.callee.name; }
  return init.type === 'ArrayExpression' && init.elements.length === 0 ? 'Array' : null;
}
function collectionName(target) {
  if (target.type === 'Identifier') { return target.name; }
  const own = target.type === 'MemberExpression' && target.object.type === 'ThisExpression' && !target.computed;
  return own ? target.property.name : null;
}
function collectionTarget(n) {
  // this.X = new Map() | X = new Set() | const X = []
  const assign = n.type === 'AssignmentExpression' && n.operator === '=';
  const target = assign ? n.left : n.type === 'VariableDeclarator' ? n.id : null;
  const init = assign ? n.right : n.type === 'VariableDeclarator' ? n.init : null;
  if (!target || !init) { return null; }
  const kind = collectionKind(init);
  const name = kind && collectionName(target);
  return name ? { name, kind } : null;
}
function shrinks(src, name, kind) {
  const e = name.replace(/\$/g, '\\$');
  const grow = kind === 'Map' ? `\\b${e}\\.set\\(` : kind === 'Set' ? `\\b${e}\\.add\\(` : `\\b${e}\\.(push|unshift)\\(`;
  if (!new RegExp(grow).test(src)) { return true; } // never filled in this file → not a growth site
  const resets = (src.match(new RegExp(`\\b${e}\\s*=[^=]`, 'g')) || []).length; // >1 assignment = reset somewhere
  const shrink = new RegExp(`\\b${e}\\.(delete|clear|shift|splice|pop)\\(|\\b${e}\\.length\\s*=[^=]|\\b${e}\\.(size|length)\\s*[<>]=?|\\bLRU|\\bBounded`);
  return resets > 1 || shrink.test(src);
}

function timerHit(n, parents) {
  const cal = n.callee;
  const glob = cal.type === 'MemberExpression' && !cal.computed && cal.object.type === 'Identifier' && ['global', 'globalThis', 'window'].includes(cal.object.name);
  const bare = cal.type === 'Identifier' ? cal.name : glob ? cal.property.name : null;
  if ((bare !== 'setInterval' && bare !== 'setTimeout') || isPromiseDelay(n, parents)) { return null; }
  return `${bare} @${enclosingFnNames(parents)[0] || '<module>'}`;
}
function stringifyHit(n, parents) {
  const cal = n.callee;
  if (cal.type !== 'MemberExpression' || cal.object.name !== 'JSON' || cal.property.name !== 'stringify') { return null; }
  const hot = enclosingFnNames(parents).find((x) => HOT.test(x));
  const p = parents[parents.length - 1];
  const truncated = p && p.type === 'MemberExpression' && ['slice', 'substring', 'substr'].includes(p.property.name);
  const a0 = n.arguments[0];
  const small = !a0 || /Literal/.test(a0.type);
  return hot && !truncated && !small ? `@${hot}` : null;
}

function scanSource(src) {
  const ast = parse(src);
  const hits = { 'unbounded-collection': [], 'raw-timer': [], 'hot-stringify': [] };
  if (!ast) { return { hits, parseError: true }; }
  const seen = new Set();
  const push = (rule, h) => { if (h) { hits[rule].push(h); } };
  walk(ast, [], (n, parents) => {
    const c = n.type === 'VariableDeclarator' && parents.some(isFn) ? null : collectionTarget(n); // function locals die with the call
    if (c && !seen.has(c.name) && !shrinks(src, c.name, c.kind)) { seen.add(c.name); hits['unbounded-collection'].push(`${c.kind} ${c.name}`); }
    if (n.type !== 'CallExpression') { return; }
    push('raw-timer', timerHit(n, parents));
    push('hot-stringify', stringifyHit(n, parents));
  });
  return { hits, parseError: false };
}

function scanAll() {
  const res = {}; const parseErrors = [];
  for (const f of files()) {
    const { hits, parseError } = scanSource(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    if (parseError) { parseErrors.push(f); continue; }
    const counts = {};
    for (const [r, l] of Object.entries(hits)) { if (l.length) { counts[r] = l.length; } }
    if (Object.keys(counts).length) { res[f] = counts; }
  }
  return { files: res, parseErrors };
}

function regressions(current, baseline) {
  const out = [];
  for (const [f, counts] of Object.entries(current)) {
    for (const [r, n] of Object.entries(counts)) {
      const b = (baseline[f] || {})[r] || 0;
      if (n > b) { out.push(`${f}: ${r} ${b} -> ${n}`); }
    }
  }
  return out;
}

module.exports = { scanSource, scanAll, regressions, BASELINE };

if (require.main === module) {
  const cur = scanAll();
  if (process.argv.includes('--update-baseline')) {
    const totals = {};
    for (const c of Object.values(cur.files)) { for (const [r, n] of Object.entries(c)) { totals[r] = (totals[r] || 0) + n; } }
    fs.writeFileSync(BASELINE, `${JSON.stringify({ note: 'P3068 memory-hazard ratchet baseline — counts may only go down', totals, files: cur.files }, null, 1)}\n`);
    console.log('baseline written', totals);
    process.exit(0);
  }
  const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).files : {};
  const reg = regressions(cur.files, base);
  if (process.argv.includes('--json')) { console.log(JSON.stringify({ regressions: reg, parseErrors: cur.parseErrors }, null, 1)); }
  if (reg.length) { console.error(`memory-hazard ratchet: ${reg.length} regression(s)\n  ${reg.join('\n  ')}`); process.exit(1); }
  console.log(`memory-hazard ratchet OK (${Object.keys(cur.files).length} files with frozen hits, ${cur.parseErrors.length} unparsed)`);
}
