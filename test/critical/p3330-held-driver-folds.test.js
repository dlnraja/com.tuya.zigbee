'use strict';
/**
 * P3330 - held drivers carried by a published driver (user 15/11/2026: fix the >345-driver AggregateErrors).
 * The Athom payload must stay at <= 347 drivers, so a never-published driver ships its exact couples on a
 * published driver of the same class (payload only) and runs its own device class there. Guards: exact
 * SSOT vs source compose, no couple owned twice, no maker already on the target, class + capabilities fit.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
// P3331 hosted folds (kind "host") have their own checks in p3331-hosted-held-drivers.test.js.
const folds = Object.fromEntries(Object.entries(require(path.join(ROOT, 'lib', 'drivers', 'held-driver-folds.json')).folds).filter(([, f]) => f.kind !== 'host'));
const { applyHeldFolds, couplesOf } = require(path.join(ROOT, 'scripts', 'maintenance', 'apply-held-folds.cjs'));
const { spawnSync } = require('child_process');
const hold = require(path.join(ROOT, 'config', 'publish-hold-drivers.json'));
const app = require(path.join(ROOT, 'app.json'));
const compose = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
const liveHeld = new Set((hold.drivers || []).map((d) => d.id));
// After P3360 graduation the live hold may be empty; still exercise folds against their SSOT ids.
const heldIds = liveHeld.size ? liveHeld : new Set(Object.keys(folds));
const arr = (v) => Array.isArray(v) ? v : [v];

function payloadLike() {
  const m = JSON.parse(JSON.stringify(app));
  const classes = Object.fromEntries(m.drivers.filter((d) => heldIds.has(d.id)).map((d) => [d.id, d.class]));
  m.drivers = m.drivers.filter((d) => !heldIds.has(d.id));
  return { m, classes };
}

describe('P3330 held-driver folds', () => {
  it('SSOT lists exactly the held compose couples, into a published driver of the same class covering its capabilities', () => {
    assert.ok(Object.keys(folds).length > 0);
    for (const [held, f] of Object.entries(folds)) {
      const graduated = /P3360|Athom #488/.test(String((hold._graduated || {})[held] || ''));
      assert.ok(liveHeld.has(held) || graduated || heldIds.has(held), `${held} must be held or P3360-graduated`);
      assert.ok(!liveHeld.has(f.into), `${f.into} must be published`);
      const h = compose(held); const t = compose(f.into);
      assert.deepEqual(f.manufacturerName, arr(h.zigbee.manufacturerName), `${held} makers`);
      assert.deepEqual(f.productId, arr(h.zigbee.productId), `${held} pids`);
      assert.equal(t.class, h.class, `${held} class`);
      for (const c of h.capabilities || []) {assert.ok((t.capabilities || []).includes(c), `${f.into} lacks ${c}`);}
      assert.ok(fs.existsSync(path.join(ROOT, f.deviceClass)), f.deviceClass);
      assert.match(fs.readFileSync(path.join(ROOT, 'drivers', held, 'device.js'), 'utf8'), new RegExp(`module\\.exports = require\\('\\.\\./\\.\\./${f.deviceClass.replace(/\.js$/, '')}'\\)`), `${held} device.js must re-export ${f.deviceClass}`);
      assert.match(fs.readFileSync(path.join(ROOT, 'drivers', f.into, 'driver.js'), 'utf8'), new RegExp(`onMapDeviceClass\\(device\\)[\\s\\S]{0,200}foldedDeviceClass\\('${f.into}', device\\)`));
    }
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'drivers', 'HeldDriverFolds.js'), 'utf8');
    for (const [held, f] of Object.entries(folds)) {assert.ok(src.includes(`${held}: () => require('../devices/held/${path.basename(f.deviceClass, '.js')}')`), `loader for ${held}`);}
  });

  it('folding the current source payload forms every still-held fold couple, owns none twice and touches no existing maker', () => {
    const { m, classes } = payloadLike();
    const activeFolds = Object.fromEntries(Object.entries(folds).filter(([id]) => liveHeld.has(id)));
    const r = applyHeldFolds(m, liveHeld, activeFolds, classes);
    assert.deepEqual(r.errors, []);
    assert.equal(r.applied.length, Object.keys(activeFolds).length);
    const folded = new Set(Object.values(activeFolds).flatMap((f) => f.manufacturerName));
    const owners = new Map();
    for (const d of m.drivers) {for (const c of couplesOf(d)) {
      if (!folded.has(c.split('|')[0])) {continue;}
      assert.ok(!owners.has(c), `${c} owned by ${owners.get(c)} and ${d.id}`);
      owners.set(c, d.id);
    }}
    for (const [, f] of Object.entries(activeFolds)) {
      const t = m.drivers.find((d) => d.id === f.into);
      for (const mk of f.manufacturerName) {for (const p of f.productId) {assert.ok(couplesOf(t).includes(`${mk}|${p}`));}}
    }
    assert.equal(m.drivers.length, app.drivers.length - heldIds.size, 'no driver id added');
    // prepare-publish re-pins the last Test package couples (P3024b) on their shipped driver, so the
    // payload can own a couple the source no longer lists there: a fold must not touch those either.
    const base = require(path.join(ROOT, 'test', 'fixtures', 'athom-last-test-package-couples.json')).drivers;
    for (const [held, f] of Object.entries(activeFolds)) {
      const src = app.drivers.find((d) => d.id === f.into).zigbee;
      const M = [...new Set([...src.manufacturerName, ...f.manufacturerName])]; const P = [...new Set([...src.productId, ...f.productId])];
      for (const [id, b] of Object.entries(base)) {
        if (id === f.into) {continue;}
        for (const mk of f.manufacturerName) {for (const p of P) {assert.ok(!(b.m.includes(mk) && b.p.includes(p)), `${held}: ${mk}|${p} pinned on ${id}`);}}
        for (const mk of M) {for (const p of f.productId.filter((x) => !src.productId.includes(x))) {assert.ok(!(b.m.includes(mk) && b.p.includes(p)), `${held}: ${mk}|${p} pinned on ${id}`);}}
      }
    }
  });

  it('fails closed on a collision, a maker already on the target, a missing target or a class mismatch', () => {
    const base = () => ({ drivers: [
      { id: 'tgt', class: 'sensor', zigbee: { manufacturerName: ['_TZE200_aaa'], productId: ['TS0601', 'TS0202'] } },
      { id: 'other', class: 'sensor', zigbee: { manufacturerName: ['_TZE200_new'], productId: ['TS0202'] } },
    ] });
    const f = { h: { into: 'tgt', manufacturerName: ['_TZE200_new'], productId: ['TS0601'] } };
    assert.match(applyHeldFolds(base(), new Set(['h']), f).errors.join(), /already owned elsewhere: _TZE200_new\|TS0202@other/);
    assert.match(applyHeldFolds(base(), new Set(['h']), { h: { ...f.h, manufacturerName: ['_tze200_AAA'] } }).errors.join(), /already lists maker/);
    assert.match(applyHeldFolds(base(), new Set(['h']), { h: { ...f.h, into: 'nope' } }).errors.join(), /absent from the payload/);
    const ok = { drivers: [{ id: 'tgt', class: 'sensor', zigbee: { manufacturerName: ['_TZE200_aaa'], productId: ['TS0601'] } }] };
    assert.match(applyHeldFolds(JSON.parse(JSON.stringify(ok)), new Set(['h']), f, { h: 'socket' }).errors.join(), /class socket != target/);
    const r = applyHeldFolds(ok, new Set(['h']), f, { h: 'sensor' });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(ok.drivers[0].zigbee.manufacturerName, ['_TZE200_aaa', '_TZE200_new']);
    assert.deepEqual(applyHeldFolds(ok, new Set(), f).applied, [], 'a released held id is not folded');
  });

  it('runtime: each target driver maps only the folded makers (any case) to the held device class', () => {
    // Child process with a minimal homey mock (no lib module enters the shared mocha process).
    const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const folds = Object.fromEntries(Object.entries(require('./lib/drivers/held-driver-folds.json').folds).filter(([, f]) => f.kind !== 'host'));
const rt = require('./lib/drivers/HeldDriverFolds');
const out = [];
for (const [held, f] of Object.entries(folds)) {
  const Held = require('./' + f.deviceClass);
  const Drv = require('./drivers/' + f.into + '/driver.js');
  const Def = require('./drivers/' + f.into + '/device.js');
  const dev = (m) => ({ getSetting: (k) => (k === 'zb_manufacturer_name' ? m : null) });
  const map = (d) => Drv.prototype.onMapDeviceClass.call(Object.create(Drv.prototype), d);
  out.push({ held,
    reexport: require('./drivers/' + held + '/device.js') === Held,
    upper: map(dev(f.manufacturerName[0].toUpperCase())) === Held,
    store: map({ getStore: () => ({ manufacturerName: f.manufacturerName[0] }) }) === Held,
    other: map(dev('_TZ3000_notfolded')) === Def,
    none: map({}) === Def,
    wrongTarget: rt.foldedDeviceClass('some_other_driver', dev(f.manufacturerName[0])) === null });
}
process.stdout.write(JSON.stringify(out));
`;
    const activeFolds = Object.fromEntries(Object.entries(folds).filter(([id]) => liveHeld.has(id)));
    if (!Object.keys(activeFolds).length) {return;}
    const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.trim().split('\n').pop());
    // SCRIPT iterates all non-host folds; after P3360 only still-held ones need a passing map.
    assert.ok(out.length >= Object.keys(activeFolds).length);
    for (const o of out) {
      if (!activeFolds[o.held]) {continue;}
      assert.deepEqual(o, { held: o.held, reexport: true, upper: true, store: true, other: true, none: true, wrongTarget: true });
    }
  });
});
