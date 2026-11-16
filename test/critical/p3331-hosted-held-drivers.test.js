'use strict';
/**
 * P3331 - held drivers hosted in dormant published drivers (owner decision 16/11/2026: fit everything,
 * held ones included, in the uploaded set without adding a driver id). The free exact couples of 18 held
 * drivers ship inside 4 published drivers whose own couples are fake (no real device paired); the exact
 * manufacturerName + productId selects the held device class, which migrates its class once and keeps the
 * held capability set. Guards: SSOT vs composes, no couple owned twice, no maker already on a host,
 * no driver id added, P3024b pins untouched, every hosted couple resolves to its profile at runtime.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const doc = require(path.join(ROOT, 'lib', 'drivers', 'held-driver-folds.json'));
const { applyHeldFolds, couplesOf, retargetHostedCards } = require(path.join(ROOT, 'scripts', 'maintenance', 'apply-held-folds.cjs'));
const { render } = require(path.join(ROOT, 'scripts', 'maintenance', 'build-held-host-profiles.cjs'));
const hold = require(path.join(ROOT, 'config', 'publish-hold-drivers.json'));
const app = require(path.join(ROOT, 'app.json'));
const published1574 = new Set(require(path.join(ROOT, 'test', 'fixtures', 'athom-test-9.0.1574-driver-ids.json')).ids);
const compose = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
const heldIds = new Set(hold.drivers.map((d) => d.id));
const hosted = Object.fromEntries(Object.entries(doc.folds).filter(([, f]) => f.kind === 'host'));
const lc = (s) => String(s).trim().toLowerCase();

const EXPECTED = [
  'air_conditioner_aetz01', 'curtain_sonoff_mini_zbrbs', 'energy_meter_3ch_bidirectional', 'gpo_double_light_mg_au03',
  'gpo_double_mg_gpo02z', 'heiman_siren', 'keypad_alarm_wke502z', 'presence_radar_aoyan_ay204t', 'siren_moes_mg_bjq002',
  'smoke_sensor_ts0601_dp', 'switch_2gang_ts0002', 'switch_wall_6gang_metering', 'thermostat_vrf_bvrf_l001',
  'ufh_controller_ch8z', 'ufh_controller_pro_line_x10', 'valve_novato_zpv01', 'water_leak_aoyan_ay222z', 'water_leak_blitzwolf_bw_is9',
];
const NOT_HOSTED = ['heiman_keyfob', 'wall_switch_rf_ews1154z', 'co_sensor_dcr_co', 'fan_light_tuya_5_levels', 'motion_sensor_excellux_zg104plv', 'vibration_sensor_excellux_zg103v'];

function payloadLike() {
  const m = JSON.parse(JSON.stringify(app));
  const held = m.drivers.filter((d) => heldIds.has(d.id));
  const classes = Object.fromEntries(held.map((d) => [d.id, d.class]));
  const heldEntries = Object.fromEntries(held.map((d) => [d.id, d]));
  m.drivers = m.drivers.filter((d) => !heldIds.has(d.id));
  return { m, classes, heldEntries };
}

describe('P3331 held drivers hosted in dormant published drivers', () => {
  it('SSOT hosts exactly the 18 free held drivers in declared dormant published hosts, with their compose couples', () => {
    assert.deepEqual(Object.keys(hosted).sort(), EXPECTED);
    for (const id of NOT_HOSTED) {assert.ok(!hosted[id], `${id} must not be hosted`);}
    for (const id of NOT_HOSTED.filter((x) => x !== 'wall_switch_rf_ews1154z')) {assert.ok(doc.notHosted[id], `${id} needs a notHosted reason`);}
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'drivers', 'HeldDriverFolds.js'), 'utf8');
    for (const [held, f] of Object.entries(hosted)) {
      assert.ok(heldIds.has(held), `${held} must be held`);
      assert.ok(doc.hosts[f.into], `${f.into} must be a declared dormant host`);
      assert.ok(!heldIds.has(f.into) && published1574.has(f.into), `${f.into} must be a published id`);
      const h = compose(held); const t = compose(f.into);
      assert.deepEqual(f.productId, h.zigbee.productId, `${held} pids`);
      for (const mk of f.manufacturerName) {assert.ok(h.zigbee.manufacturerName.includes(mk), `${held}: ${mk} not in its compose`);}
      const hostMakers = new Set(t.zigbee.manufacturerName.map(lc));
      for (const mk of f.manufacturerName) {assert.ok(!hostMakers.has(lc(mk)), `${held}: ${mk} already on host ${f.into}`);}
      assert.equal(f.deviceClass, `drivers/${held}/device.js`);
      for (const file of ['device', ...f.flowRegistrar ? ['driver'] : []]) {
        assert.equal(fs.readFileSync(path.join(ROOT, 'lib', 'hosted', held, `${file}.js`), 'utf8'),
          `'use strict';\n\n// P3331 shim: replaced in the Athom payload by drivers/${held}/${file}.js (see docs/rules/HOSTED_HELD_DRIVERS.md).\nmodule.exports = require('../../../drivers/${held}/${file}');\n`, `${held} ${file} shim`);
      }
      assert.ok(src.includes(`${held}: () => require('../hosted/${held}/device')`), `literal loader for ${held}`);
      assert.match(fs.readFileSync(path.join(ROOT, 'drivers', f.into, 'driver.js'), 'utf8'), new RegExp(`onMapDeviceClass\\(device\\)[\\s\\S]{0,200}foldedDeviceClass\\('${f.into}', device\\)`));
      if (f.flowRegistrar) {
        assert.ok(src.includes(`${held}: () => require('../hosted/${held}/driver')`), `flow registrar for ${held}`);
        assert.match(fs.readFileSync(path.join(ROOT, f.flowRegistrar), 'utf8'), /static registerFlowCards\(driver\)/);
        assert.match(fs.readFileSync(path.join(ROOT, 'drivers', f.into, 'driver.js'), 'utf8'), new RegExp(`registerHostedFlows\\(this, '${f.into}'\\)`));
      }
    }
    // smoke_sensor_ts0601_dp: only its 3 free makers (5 ship on switch_wireless / socket_power_strip_four_three).
    assert.deepEqual([...new Set(hosted.smoke_sensor_ts0601_dp.manufacturerName.map(lc))].length, 3);
    assert.equal(fs.readFileSync(path.join(ROOT, 'lib', 'drivers', 'held-host-profiles.json'), 'utf8'), render(ROOT), 'held-host-profiles.json is stale');
  });

  it('hosting the source payload forms every hosted couple, owns none twice, adds no driver id and leaves P3024b pins alone', () => {
    const { m, classes, heldEntries } = payloadLike();
    const before = m.drivers.length;
    const r = applyHeldFolds(m, heldIds, doc.folds, classes, { heldEntries, hosts: doc.hosts });
    assert.deepEqual(r.errors, []);
    assert.equal(r.applied.filter((a) => a.kind === 'host').length, EXPECTED.length);
    assert.equal(m.drivers.length, before, 'no driver id added');
    assert.deepEqual(r.keepDirs.sort(), EXPECTED);
    // Every couple a host carries after hosting (exact + cartesian) is owned by no other driver.
    const owners = new Map();
    for (const d of m.drivers) {if (!doc.hosts[d.id]) {for (const c of couplesOf(d)) {const [mk, p] = c.split('|'); owners.set(`${lc(mk)}|${lc(p)}`, d.id);}}}
    for (const host of Object.keys(doc.hosts)) {
      for (const c of couplesOf(m.drivers.find((d) => d.id === host))) {
        const [mk, p] = c.split('|');
        assert.ok(!owners.has(`${lc(mk)}|${lc(p)}`), `${host}: ${c} also owned by ${owners.get(`${lc(mk)}|${lc(p)}`)}`);
      }
    }
    for (const [held, f] of Object.entries(hosted)) {
      const t = m.drivers.find((d) => d.id === f.into);
      for (const mk of f.manufacturerName) {for (const p of f.productId) {assert.ok(couplesOf(t).includes(`${mk}|${p}`), `${held}: ${mk}|${p}`);}}
    }
    const base = require(path.join(ROOT, 'test', 'fixtures', 'athom-last-test-package-couples.json')).drivers;
    for (const host of Object.keys(doc.hosts)) {
      const t = m.drivers.find((d) => d.id === host).zigbee;
      for (const [id, b] of Object.entries(base)) {
        if (id === host) {continue;}
        const bm = new Set(b.m.map(lc)); const bp = new Set(b.p.map(lc));
        for (const mk of t.manufacturerName) {for (const p of t.productId) {assert.ok(!(bm.has(lc(mk)) && bp.has(lc(p))), `${host}: ${mk}|${p} pinned on ${id}`);}}
      }
      const ids = []; const walk = (l) => (l || []).forEach((s) => { if (s.id) {ids.push(s.id);} walk(s.children); });
      walk(m.drivers.find((d) => d.id === host).settings);
      assert.equal(new Set(ids).size, ids.length, `${host}: setting ids unique`);
    }
    // Held cards keep their ids and name the host, so prepare-publish ships them. The root app.json holds no
    // driver cards (Homey compose adds them from driver.flow.compose.json with a driver_id device filter).
    const flow = { triggers: [], conditions: [], actions: [] };
    for (const held of Object.keys(hosted)) {
      const f = path.join(ROOT, 'drivers', held, 'driver.flow.compose.json');
      const fc = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
      for (const k of Object.keys(flow)) {
        for (const c of fc[k] || []) {flow[k].push({ ...c, args: [{ type: 'device', name: 'device', filter: `driver_id=${held}` }, ...c.args || []] });}
      }
    }
    m.flow = flow;
    const n = retargetHostedCards(m, r.hostOf);
    assert.equal(n, 40, 're-targeted cards (heiman_siren 3, switch_wall_6gang_metering 18, switch_2gang_ts0002 19)');
    const all = Object.values(m.flow).flat();
    for (const c of all) {
      const held = Object.keys(hosted).find((h) => c.id.startsWith(`${h}_`));
      assert.equal(c.args[0].filter, `driver_id=${hosted[held].into}`, c.id);
    }
  });

  it('fails closed: undeclared host, maker already on the host before hosting', () => {
    const base = () => ({ drivers: [
      { id: 'dorm', class: 'other', zigbee: { manufacturerName: ['_TZE200_fake'], productId: ['TS0601_fake'] } },
    ] });
    const f = { h: { kind: 'host', into: 'dorm', manufacturerName: ['_TZE200_new'], productId: ['TS0601'] } };
    assert.match(applyHeldFolds(base(), new Set(['h']), f, { h: 'sensor' }, { hosts: {} }).errors.join(), /not a declared dormant host/);
    assert.match(applyHeldFolds(base(), new Set(['h']), { h: { ...f.h, manufacturerName: [' _tze200_FAKE'] } }, {}, { hosts: { dorm: 'x' } }).errors.join(), /already lists maker/);
    const two = { a: { ...f.h, manufacturerName: ['AOYAN  '], productId: ['AY204T'] }, b: { ...f.h, manufacturerName: ['AOYAN'], productId: ['AY222Z'] } };
    const m = base(); const r = applyHeldFolds(m, new Set(['a', 'b']), two, { a: 'sensor', b: 'sensor' }, { hosts: { dorm: 'x' } });
    assert.deepEqual(r.errors, [], 'two hosted drivers may share a maker on one host (resolved by productId)');
    assert.equal(m.drivers.length, 1);
  });

  it('runtime: every hosted couple resolves to its held class on its host; parasites and unknown devices keep the host class', () => {
    const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const { folds, hosts } = require('./lib/drivers/held-driver-folds.json');
const rt = require('./lib/drivers/HeldDriverFolds');
const out = { couples: 0, bad: [], parasites: 0, flows: {} };
const dev = (m, p) => ({ getSetting: (k) => (k === 'zb_manufacturer_name' ? m : k === 'zb_model_id' ? p : null) });
for (const host of Object.keys(hosts)) {
  const Drv = require('./drivers/' + host + '/driver.js');
  const Def = require('./drivers/' + host + '/device.js');
  const map = (d) => Drv.prototype.onMapDeviceClass.call(Object.create(Drv.prototype), d);
  const mine = Object.entries(folds).filter(([, f]) => f.kind === 'host' && f.into === host);
  for (const [held, f] of mine) {
    const Held = rt.LOADERS[held]();
    for (const m of f.manufacturerName) for (const p of f.productId) {
      for (const [mm, pp] of [[m, p], [m.toUpperCase(), p.toLowerCase()]]) {
        const C = map(dev(mm, pp));
        out.couples++;
        if (!(C.prototype instanceof Held) || C.name !== 'Hosted_' + held) out.bad.push(held + ' ' + mm + '|' + pp + ' -> ' + (C && C.name));
      }
    }
    const store = map({ getStore: () => ({ manufacturerName: f.manufacturerName[0], productId: f.productId[0] }) });
    if (!(store.prototype instanceof Held)) out.bad.push(held + ' via store');
    // A pid of this profile with another hosted maker of the same host (cartesian parasite) keeps the host class.
    for (const [o, g] of mine) {
      if (o === held) continue;
      const m = g.manufacturerName.find((x) => !f.manufacturerName.some((y) => y.trim().toLowerCase() === x.trim().toLowerCase()));
      if (!m || f.productId.some((p) => g.productId.includes(p))) continue;
      out.parasites++;
      if (map(dev(m, f.productId[0])) !== Def) out.bad.push('parasite ' + m + '|' + f.productId[0] + ' on ' + host);
    }
  }
  if (map(dev('_TZ3000_unknown', 'TS0601')) !== Def || map({}) !== Def) out.bad.push(host + ' default');
  const reg = [];
  const fake = { homey: { manifest: { drivers: [{ id: host }] }, flow: new Proxy({}, { get: () => (id) => ({ registerRunListener: () => reg.push(id) }) }) }, log() {}, error() {} };
  out.flows[host] = { done: rt.registerHostedFlows(fake, host), cards: reg.length };
  const shipped = { ...fake, homey: { ...fake.homey, manifest: { drivers: mine.map(([h]) => ({ id: h })) } } };
  if (rt.registerHostedFlows(shipped, host).length) out.bad.push(host + ' registered flows of a shipped driver');
}
process.stdout.write(JSON.stringify(out));
`;
    const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.deepEqual(out.bad, []);
    const exact = Object.values(hosted).reduce((n, f) => n + f.manufacturerName.length * f.productId.length, 0);
    assert.equal(out.couples, 2 * exact);
    assert.ok(out.parasites > 0);
    assert.deepEqual(out.flows.smart_rcbo, { done: ['heiman_siren'], cards: 3 });
    assert.deepEqual(out.flows.switch_plug_1.done, ['switch_2gang_ts0002']);
    assert.ok(out.flows.switch_plug_1.cards >= 13);
  });

  it('runtime profile: class migrates once from the host class and the device keeps exactly the held capabilities', async () => {
    const { syncHostedProfile } = require(path.join(ROOT, 'lib', 'drivers', 'HeldDriverFolds.js'));
    const caps = new Set(['onoff', 'measure_power', 'meter_power', 'button.1']);
    const store = {}; const opts = {}; let cls = 'socket';
    const device = {
      driver: { manifest: { capabilities: ['onoff', 'measure_power', 'meter_power', 'button.1'] } },
      getClass: () => cls, setClass: async (c) => { cls = c; }, getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; },
      hasCapability: (c) => caps.has(c), addCapability: async (c) => { caps.add(c); }, removeCapability: async (c) => { caps.delete(c); },
      getCapabilities: () => [...caps], setCapabilityOptions: async (c, o) => { opts[c] = o; }, log() {}, error() {},
    };
    const profile = { class: 'sensor', hostClass: 'socket', capabilities: ['alarm_water', 'measure_battery'], capabilitiesOptions: { alarm_water: { title: { en: 'Leak' } } } };
    await syncHostedProfile(device, profile);
    assert.equal(cls, 'sensor');
    assert.deepEqual([...caps].sort(), ['alarm_water', 'measure_battery']);
    assert.deepEqual(opts.alarm_water, { title: { en: 'Leak' } });
    cls = 'socket'; await syncHostedProfile(device, profile);
    assert.equal(cls, 'socket', 'class migration is one-shot');
  });
});
