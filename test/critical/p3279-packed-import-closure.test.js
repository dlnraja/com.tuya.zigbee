'use strict';
// Build-time inventory of the files a Homey pack can load. Comments are stripped so
// examples in docblocks are not treated as requires. Dynamic template requires stay unknown.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SKIP_TOP = new Set(['node_modules', '.git', 'reports', 'docs', 'test', 'tests', 'scripts', 'tools', '.github', '.archive', 'tmp', 'backups']);

function strip(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_TOP.has(e.name) && path.dirname(p) === ROOT) continue;
      walk(p, out);
    } else if (/\.(js|cjs|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}
function resolveRel(from, spec) {
  const base = path.resolve(path.dirname(from), spec);
  const cands = [base, `${base}.js`, `${base}.json`, `${base}.cjs`, `${base}.mjs`, path.join(base, 'index.js')];
  return cands.find((c) => { try { return fs.statSync(c).isFile(); } catch { return false; } }) || null;
}

test('packed relative requires resolve, and compose images exist on disk', () => {
  const missing = [];
  const REQ = /require\(\s*(['"])(\.[^'"]+)\1\s*\)/g;
  for (const f of walk(ROOT)) {
    const src = strip(fs.readFileSync(f, 'utf8'));
    let m;
    while ((m = REQ.exec(src))) {
      if (!resolveRel(f, m[2])) missing.push(`${path.relative(ROOT, f)} -> ${m[2]}`);
    }
  }
  assert.deepStrictEqual(missing, []);

  const images = [];
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const cf = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
    const refs = [];
    if (c.images) refs.push(c.images.small, c.images.large);
    if (c.zigbee && c.zigbee.learnmode) refs.push(c.zigbee.learnmode.image);
    for (const img of refs) {
      if (typeof img !== 'string') continue;
      const abs = img.startsWith('/')
        ? path.join(ROOT, img.slice(1))
        : path.join(ROOT, 'drivers', id, img.replace('{{driverAssetsPath}}', 'assets'));
      if (!fs.existsSync(abs)) images.push(`${id} ${img}`);
    }
  }
  assert.deepStrictEqual(images, []);
});

test('HEIMAN keyfob declares the IAS ACE cluster it binds', () => {
  const k = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/heiman_keyfob/driver.compose.json'), 'utf8'));
  const ep = k.zigbee.endpoints['1'];
  assert.ok(ep.bindings.includes(1281));
  assert.ok(ep.clusters.includes(1281));
});
