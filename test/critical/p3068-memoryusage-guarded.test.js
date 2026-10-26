'use strict';
// P3068: process.memoryUsage() throws ENOENT (uv_resident_set_memory) on Homey (P2927 crash 17/10, P2940, P3045).
// Every call in app.js / lib / drivers must sit inside a try block (the catch falls back to v8 heap stats / null).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const espree = require('espree');

const ROOT = path.resolve(__dirname, '..', '..');
const SKIP = new Set(['node_modules', '.homeybuild', 'test', 'tests', 'archive', 'assets', 'locales']);

function jsFiles() {
  const out = ['app.js'];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
      if (SKIP.has(e.name) || e.name.startsWith('.')) { continue; }
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) { walk(r); } else if (e.name.endsWith('.js')) { out.push(r); }
    }
  };
  walk('lib'); walk('drivers');
  return out;
}
const isMemCall = (n) => n.type === 'CallExpression' && n.callee.type === 'MemberExpression'
  && n.callee.object.name === 'process' && n.callee.property.name === 'memoryUsage';

function unguarded(src) {
  let ast;
  try { ast = espree.parse(src, { ecmaVersion: 'latest', loc: true }); } catch (_e) {
    try { ast = espree.parse(src, { ecmaVersion: 'latest', loc: true, sourceType: 'module' }); } catch (_e2) { return []; }
  }
  const bad = [];
  const visit = (n, tryDepth) => {
    if (!n || typeof n.type !== 'string') { return; }
    if (isMemCall(n) && tryDepth === 0) { bad.push(n.loc.start.line); }
    for (const k of Object.keys(n)) {
      if (k === 'loc') { continue; }
      const v = n[k];
      const d = n.type === 'TryStatement' && k === 'block' ? tryDepth + 1 : /Function/.test(n.type) && k === 'body' ? 0 : tryDepth;
      if (Array.isArray(v)) { v.forEach((c) => visit(c, d)); } else if (v && typeof v.type === 'string') { visit(v, d); }
    }
  };
  visit(ast, 0);
  return bad;
}

test('detector flags a bare call and accepts a try-wrapped one', () => {
  assert.deepStrictEqual(unguarded('const m = process.memoryUsage();'), [1]);
  assert.deepStrictEqual(unguarded('let m; try { m = process.memoryUsage(); } catch (e) { m = null; }'), []);
  assert.deepStrictEqual(unguarded('try { setTimeout(() => process.memoryUsage(), 1); } catch (e) {}'), [1], 'a callback escapes the try');
});

test('every process.memoryUsage() call in the app is inside a try block (ENOENT on Homey)', () => {
  const bad = [];
  for (const f of jsFiles()) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (!src.includes('memoryUsage')) { continue; }
    for (const line of unguarded(src)) { bad.push(`${f}:${line}`); }
  }
  assert.deepStrictEqual(bad, []);
});
