'use strict';
// P3034 (2026-10-25): master red since P3023 17fde689ff on two push gates, which blocked trial 0.
//  1. Syntax Check (TITAN v2 #6): lib/memory/CatalogStore.js used JSON.parse(fs.readFileSync(..., 'utf8')).
//     Fix: parse the Buffer (same result, no utf8 decode to a JS string first).
//  2. Unified CI/CD -> l99-dual-app-enrich-gates:
//     a) check-energy-divisor only read device.js; switch_wall_6gang_metering (P3013) keeps its explicit
//        divisors in lib/tuya/profiles/P3013DedicatedZ2MProfiles.js. The gate now also reads required profiles.
//     b) flows-integrity: switch_wall_6gang_metering had an empty driver.flow.compose.json, so the generic
//        `${driverId}_physical_gang${n}_on/off` triggers (PhysicalButtonMixin, TuyaSpecificClusterDevice)
//        had no card. Added the 12 physical + 6 scene cards (copied from switch_wall_6gang under its own id).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const node = (rel) => spawnSync(process.execPath, [path.join(ROOT, rel)], { cwd: ROOT, encoding: 'utf8' });

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {walk(p, out);} else if (e.name.endsWith('.js')) {out.push(p);}
  }
  return out;
}

test('TITAN v2 #6: no lib/ file parses JSON from a utf8 readFileSync string', () => {
  const re = /JSON\.parse\(fs\.readFileSync.*'utf8'/;
  const bad = walk(path.join(ROOT, 'lib')).filter((f) => re.test(fs.readFileSync(f, 'utf8')));
  assert.deepStrictEqual(bad.map((f) => path.relative(ROOT, f)), []);
});

test('CatalogStore still resolves shards after the Buffer parse', () => {
  const cs = require(path.join(ROOT, 'lib/memory/CatalogStore.js'));
  cs._reset && cs._reset();
  assert.ok(fs.existsSync(path.join(cs.SHARD_DIR, 'index.json')));
  const idx = JSON.parse(fs.readFileSync(path.join(cs.SHARD_DIR, 'index.json')));
  assert.strictEqual(idx.v, 1);
  const snap = cs.snapshot();
  assert.ok(snap && typeof snap === 'object');
});

test('check-energy-divisor passes and reads the P3013 profile divisors', () => {
  const r = node('scripts/validation/check-energy-divisor.js');
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const src = fs.readFileSync(path.join(ROOT, 'scripts/validation/check-energy-divisor.js'), 'utf8');
  assert.match(src, /requiredProfileSources/);
  const prof = fs.readFileSync(path.join(ROOT, 'lib/tuya/profiles/P3013DedicatedZ2MProfiles.js'), 'utf8');
  assert.match(prof, /20: \{ capability: 'meter_power', divisor: 100 \}/);
});

test('flows integrity + flow L99 orchestrator are green', () => {
  const a = node('scripts/validation/verify_flows_integrity.js');
  assert.strictEqual(a.status, 0, a.stdout.split('\n').filter((l) => l.includes('MISSING')).join('\n'));
});

test('switch_wall_6gang_metering declares its own physical + scene trigger cards', () => {
  const f = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/switch_wall_6gang_metering/driver.flow.compose.json')));
  const ids = new Set(f.triggers.map((t) => t.id));
  for (let g = 1; g <= 6; g++) {
    for (const s of ['on', 'off']) {assert.ok(ids.has(`switch_wall_6gang_metering_physical_gang${g}_${s}`), `gang${g} ${s}`);}
    assert.ok(ids.has(`switch_wall_6gang_metering_gang${g}_scene`), `gang${g} scene`);
  }
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/switch_wall_6gang/driver.flow.compose.json')));
  assert.strictEqual(base.triggers.length, 56, 'base driver cards untouched');
});

test('switch_wall_6gang device triggers its own driver card first, then the historical id', () => {
  const before = new Set(Object.keys(require.cache));
  const orig = Module._load;
  Module._load = function (req, parent, isMain) {
    if (req === 'homey') {return { Device: class {}, Driver: class {}, App: class {} };}
    if (req === 'homey-zigbeedriver') {return { ZigBeeDevice: class {}, ZigBeeDriver: class {}, ZigBeeLightDevice: class {} };}
    return orig.call(this, req, parent, isMain);
  };
  let Dev;
  try { Dev = require(path.join(ROOT, 'drivers/switch_wall_6gang/device.js')); } finally {
    Module._load = orig;
    for (const k of Object.keys(require.cache)) {if (!before.has(k)) {delete require.cache[k];}}
  }
  const pick = Dev.prototype._p3034OwnTriggerCard;
  assert.strictEqual(typeof pick, 'function');
  const mk = (driverId, declared) => ({
    driver: { id: driverId },
    homey: { flow: { getDeviceTriggerCard: (id) => { if (!declared.includes(id)) {throw new Error('Invalid Flow Card ID');} return { id }; } } },
  });
  assert.strictEqual(pick.call(mk('switch_wall_6gang_metering', ['switch_wall_6gang_metering_physical_gang1_on']), 'switch_wall_6gang_physical_gang1_on').id,
    'switch_wall_6gang_metering_physical_gang1_on');
  assert.strictEqual(pick.call(mk('switch_wall_6gang', ['switch_wall_6gang_physical_gang1_on']), 'switch_wall_6gang_physical_gang1_on').id,
    'switch_wall_6gang_physical_gang1_on');
  assert.strictEqual(pick.call(mk('switch_wall_6gang_metering', ['switch_wall_6gang_gang2_scene']), 'switch_wall_6gang_gang2_scene').id,
    'switch_wall_6gang_gang2_scene', 'fallback to historical id');
  assert.strictEqual(pick.call(mk('x', []), 'switch_wall_6gang_gang2_scene'), null);
});
