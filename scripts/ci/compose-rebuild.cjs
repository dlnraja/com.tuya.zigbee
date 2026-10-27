#!/usr/bin/env node
/**
 * P3079 — rebuild app.json from compose sources the way Homey CLI does, without touching the repo.
 *
 * WHY: driver.settings.compose.json REPLACES the settings of driver.compose.json (homey HomeyCompose
 * _composeDrivers), so a setting written only into app.json, or only into driver.compose.json while a
 * driver.settings.compose.json exists, vanishes the next time the bot runs `homey app validate` (which
 * re-composes app.json). 399155aae2 lost adaptive_lighting on 23 lights that way.
 *
 * rebuildFromCompose(root) copies app.json, .homeycompose and drivers/<id>/*.compose.json into a temp dir,
 * runs the CLI composer there and returns the composed manifest (the temp dir is always removed).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

function loadComposer(root) {
  const cands = [path.join(root, 'node_modules/homey/lib/HomeyCompose.js')];
  try { cands.push(require.resolve('homey/lib/HomeyCompose.js', { paths: [root] })); } catch (_e) { /* optional */ }
  for (const c of cands) { if (fs.existsSync(c)) { return require(c); } }
  throw new Error('homey CLI (HomeyCompose) not found in node_modules');
}

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name); const d = path.join(dst, e.name);
    if (e.isDirectory()) { copyTree(s, d); } else if (e.isFile()) { fs.copyFileSync(s, d); }
  }
}

async function rebuildFromCompose(root = process.cwd()) {
  const HomeyCompose = loadComposer(root);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3079-compose-'));
  try {
    fs.copyFileSync(path.join(root, 'app.json'), path.join(tmp, 'app.json'));
    copyTree(path.join(root, '.homeycompose'), path.join(tmp, '.homeycompose'));
    const dr = path.join(root, 'drivers');
    for (const id of fs.readdirSync(dr)) {
      const src = path.join(dr, id);
      if (id.startsWith('.') || !fs.statSync(src).isDirectory()) { continue; }
      const files = fs.readdirSync(src).filter((f) => /^driver\..*compose\.json$|^driver\.compose\.json$/.test(f));
      if (!files.length) { continue; }
      fs.mkdirSync(path.join(tmp, 'drivers', id), { recursive: true });
      for (const f of files) { fs.copyFileSync(path.join(src, f), path.join(tmp, 'drivers', id, f)); }
    }
    const c = new HomeyCompose(tmp, false);
    const log = console.log; console.log = () => {}; // composer logs one line per capability
    try { await c.run(); } finally { console.log = log; }
    return JSON.parse(fs.readFileSync(path.join(tmp, 'app.json'), 'utf8'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const flatSettings = (s) => (s || []).flatMap((x) => x && Array.isArray(x.children) ? x.children : [x]).filter(Boolean);

/** Things the next re-compose would DROP: driver ids, capabilities, setting ids present in app.json only. */
function lostOnRecompose(committed, composed) {
  const byId = new Map((composed.drivers || []).map((d) => [d.id, d]));
  const out = [];
  for (const d of committed.drivers || []) {
    const c = byId.get(d.id);
    if (!c) { out.push({ driver: d.id, kind: 'driver' }); continue; }
    const caps = new Set(c.capabilities || []);
    for (const cap of d.capabilities || []) { if (!caps.has(cap)) { out.push({ driver: d.id, kind: 'capability', id: cap }); } }
    const ids = new Set(flatSettings(c.settings).map((x) => x.id));
    for (const st of flatSettings(d.settings)) {
      if (st.id && !ids.has(st.id)) { out.push({ driver: d.id, kind: 'setting', id: st.id }); }
    }
  }
  return out;
}

module.exports = { rebuildFromCompose, lostOnRecompose, flatSettings };

if (require.main === module) {
  rebuildFromCompose(process.cwd()).then((composed) => {
    const committed = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    const lost = lostOnRecompose(committed, composed);
    if (process.argv.includes('--write')) { fs.writeFileSync(process.argv[process.argv.indexOf('--write') + 1], JSON.stringify(composed)); }
    if (process.argv.includes('--json')) { console.log(JSON.stringify(lost)); } else {
      const drivers = new Set(lost.map((l) => l.driver));
      console.log(`[compose-rebuild] ${lost.length} entr(ies) in app.json only, on ${drivers.size} driver(s)`);
      for (const l of lost.slice(0, 40)) { console.log(`  ${l.driver} ${l.kind} ${l.id || ''}`); }
    }
    process.exitCode = lost.length ? 1 : 0;
  }).catch((e) => { console.error('[compose-rebuild]', e.message); process.exitCode = 2; });
}
