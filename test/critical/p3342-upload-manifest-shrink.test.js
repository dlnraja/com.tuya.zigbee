'use strict';
// P3342: lossless upload app.json shrink (Homey-inert driver keys, locales beyond en/fr/nl/de, empty/schema defaults) + growth ceiling.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = require('../../scripts/maintenance/strip-inert-manifest.cjs');
const ceiling = require('../../scripts/ci/upload-manifest-ceiling.cjs');

const couples = (m) => m.drivers.flatMap((d) => ((d.zigbee && d.zigbee.manufacturerName) || []).flatMap((mf) => ((d.zigbee && d.zigbee.productId) || ['']).map((p) => `${d.id}|${mf}|${p}`))).sort();
const flowIds = (m) => ['triggers', 'conditions', 'actions'].flatMap((k) => ((m.flow || {})[k] || []).map((c) => `${k}:${c.id}`)).sort();
const SYS = require('homey-lib').getCapabilities();
// Effective value of every capability option once Homey applies the capability defaults for absent flags.
// Locales beyond en/fr/nl/de are dropped on purpose (tested separately); compare the rest.
const coreLocales = (v) => JSON.parse(JSON.stringify(v), (k, x) => strip.isLocaleObj(x) ? Object.fromEntries(Object.entries(x).filter(([l]) => strip.CORE_LOCALES.includes(l))) : x);
// capsOf: the capability list to resolve (capabilities + option keys of the ORIGINAL manifest), so an option
// object removed because it only held defaults is compared as "defaults", not as missing.
const capList = (m) => Object.fromEntries(m.drivers.map((d) => [d.id, [...new Set([...Array.isArray(d.capabilities) ? d.capabilities : [], ...Object.keys(d.capabilitiesOptions || {})])]]));
const effectiveCapOptions = (m, capsOf = capList(m)) => m.drivers.flatMap((d) => {
  const opts = d.capabilitiesOptions || {};
  const caps = capsOf[d.id] || [];
  return caps.map((cap) => {
    const def = (m.capabilities || {})[cap.split('.')[0]] || SYS[cap.split('.')[0]];
    const eff = { ...opts[cap] || {} };
    if (def) { for (const [f, dflt] of Object.entries(strip.FLAG_DEFAULTS)) { if (!(f in eff)) { eff[f] = dflt(def); } } }
    return `${d.id}|${cap}|${JSON.stringify(Object.keys(eff).sort().map((k) => [k, coreLocales(eff[k])]))}`;
  });
}).sort();
const shape = (m, capsOf) => ({
  drivers: m.drivers.map((d) => d.id),
  caps: m.drivers.map((d) => [d.id, d.capabilities]),
  capOpts: effectiveCapOptions(m, capsOf),
  maint: m.drivers.map((d) => Object.entries(d.capabilitiesOptions || {}).filter(([, o]) => o && o.maintenanceAction).map(([k]) => k)),
  settings: m.drivers.map((d) => JSON.stringify(d.settings || []).match(/"id":"[^"]+"/g)),
  flows: flowIds(m),
  couples: couples(m),
  appCaps: Object.keys(m.capabilities || {}),
});

test('fixture: drops only maintenanceActions/capabilityOptions and extra locales; en/fr/nl/de, ids, button maintenance caps kept', () => {
  const m = {
    name: { en: 'App', it: 'App IT' },
    drivers: [{
      id: 'd1', capabilities: ['onoff', 'button.ota'],
      capabilitiesOptions: { 'button.ota': { maintenanceAction: true, title: { en: 'OTA', it: 'OTA it' } } },
      capabilityOptions: { onoff: { title: { en: 'x' } } },
      maintenanceActions: [{ id: 'ota_check', title: { en: 'Check' } }],
      settings: [{ id: 's1', type: 'checkbox', label: { en: 'L', fr: 'Lf', nl: 'Ln', de: 'Ld', es: 'Les', sv: 'Lsv' } }],
      zigbee: { manufacturerName: ['_TZ3000_a', '_tz3000_a'], productId: ['TS0001'], endpoints: { 1: { clusters: [6] } } },
      pair: [{ id: 'x', en: 'not-a-locale-object-key-mix', idx: 1 }],
    }],
    flow: { actions: [{ id: 'd1_on', title: { en: 'On', fr: 'Allumer', da: 'Taend' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=d1' }] }] },
  };
  const before = shape(m);
  const r = strip.stripInertManifest(m);
  assert.deepStrictEqual(shape(m), before);
  assert.strictEqual(r.inertDropped, 2);
  assert.strictEqual(r.capOptDropped, 0, 'fixture options carry no default flag');
  assert.strictEqual(r.localeDropped, 4); // it (capOpt title), es, sv, da
  assert.ok(!('maintenanceActions' in m.drivers[0]) && !('capabilityOptions' in m.drivers[0]));
  assert.deepStrictEqual(m.drivers[0].settings[0].label, { en: 'L', fr: 'Lf', nl: 'Ln', de: 'Ld' });
  assert.deepStrictEqual(m.name, { en: 'App', it: 'App IT' }, 'store listing untouched');
  assert.deepStrictEqual(m.drivers[0].pair[0], { id: 'x', en: 'not-a-locale-object-key-mix', idx: 1 }, 'non-locale object untouched');
  assert.ok(r.bytes > 0);
});

test('inert keys are not Homey manifest fields and nothing reads them from the manifest', () => {
  const schema = require(path.join(ROOT, 'node_modules', 'homey-lib', 'assets', 'app', 'schema.json'));
  const drv = schema.properties.drivers.items;
  const props = Object.keys(drv.properties || (schema.definitions[String(drv.$ref || '').split('/').pop()] || {}).properties || {});
  assert.ok(props.includes('capabilitiesOptions') && props.length > 10, 'schema readable');
  for (const k of strip.INERT_DRIVER_KEYS) { assert.ok(!props.includes(k), `${k} is a Homey driver field`); }
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'assets') { walk(p); } } else if (/\.(c?js|mjs)$/.test(e.name)) { files.push(p); } } };
  ['lib', 'drivers'].forEach(walk);
  files.push('app.js');
  for (const f of files) {
    const src = read(f);
    assert.ok(!/maintenanceActions/.test(src), `${f} reads maintenanceActions`);
    assert.ok(!/\.capabilityOptions\b|\['capabilityOptions'\]/.test(src), `${f} reads capabilityOptions`);
  }
});

test('source manifest: strip keeps every driver id, flow card id, capability, setting id and couple', () => {
  const m = JSON.parse(read('app.json'));
  const caps0 = capList(m);
  const before = JSON.stringify(shape(m, caps0));
  const r = strip.stripInertManifest(m);
  assert.ok(JSON.stringify(shape(m, caps0)) === before, 'shape changed (ids, capabilities, effective options, settings, flows, couples)');
  assert.ok(r.inertDropped > 100, `inert keys dropped ${r.inertDropped}`);
  assert.ok(!m.drivers.some((d) => d.maintenanceActions || d.capabilityOptions));
});

test('pipeline wiring: prepare-publish, size-gate and p2842 projections strip; ceiling blocks in prepare-publish and Platform Budget', () => {
  const pp = read('scripts/prepare-publish.js');
  assert.match(pp, /strip-inert-manifest\.cjs'\)\.stripFile\(destAppJson\)/);
  assert.ok(pp.indexOf('strip-inert-manifest') > pp.indexOf("compact-shared-text.cjs').compactFile(destAppJson)"), 'after P3068');
  assert.match(pp, /upload-manifest-ceiling\.cjs'\);[\s\S]{0,200}checkUploadManifest\(destAppJson\)[\s\S]{0,400}process\.exit\(1\)/);
  assert.ok(pp.indexOf('checkUploadManifest(destAppJson)') > pp.indexOf('asciiPublishPayload(destDir'), 'measured after the ASCII pass');
  assert.match(read('scripts/ci/publish-size-gate.cjs'), /strip-inert-manifest\.cjs'\)\.stripFile\(tmp\)/);
  assert.match(read('tools/ci/p2842-flow-publish-self-heal.js'), /strip-inert-manifest\.cjs'\)\)\.stripFile\(tmp\)/);
  const wf = read('.github/workflows/platform-budget.yml');
  assert.match(wf, /run: node scripts\/ci\/upload-manifest-ceiling\.cjs /);
  assert.ok(!/upload-manifest-ceiling[^\n]*\|\|/.test(wf), 'ceiling step must block');
});

test('ceiling policy: at most 3.27 MB (P3360), goal 2.85 MB; over the ceiling fails, under passes', () => {
  const pol = ceiling.policy();
  // P3360: 3270000 is the reviewed cap after graduating 21 drivers (measured ASCII 3255746 B).
  // The gate still fails over the cap; this is not a disable.
  assert.ok(pol.ceilingBytes <= 3270000, `ceiling raised to ${pol.ceilingBytes}`);
  assert.ok(pol.ceilingBytes >= 3250000, `ceiling unexpectedly lowered to ${pol.ceilingBytes}`);
  assert.strictEqual(pol.goalBytes, 2850000);
  const tmp = path.join(os.tmpdir(), `p3342-${process.pid}.json`);
  try {
    fs.writeFileSync(tmp, 'x'.repeat(100));
    assert.strictEqual(ceiling.checkUploadManifest(tmp, { ceilingBytes: 100, goalBytes: 50 }).ok, true);
    assert.strictEqual(ceiling.checkUploadManifest(tmp, { ceilingBytes: 99, goalBytes: 50 }).ok, false);
  } finally { fs.rmSync(tmp, { force: true }); }
});

test('empty Homey-default fields and schema-default token types are dropped; ids and languages kept', () => {
  const m = {
    drivers: [{
      id: 'd1', capabilities: ['onoff', 'button.1'],
      settings: [],
      energy: {},
      ui: {},
      flow: { triggers: [], conditions: [], actions: [] },
      capabilitiesOptions: { 'button.1': { title: { en: 'B1', fr: 'B1f' }, maintenanceAction: true } },
      zigbee: { manufacturerName: ['_TZ3000_a'], productId: ['TS0001'], endpoints: { 1: { clusters: [6], bindings: [] } } },
    }],
    flow: { triggers: [{ id: 't1', title: { en: 'T', fr: 'Tf' }, args: [], tokens: [{ name: 's', title: { en: 'S' }, type: 'string' }, { name: 'n', title: { en: 'N' }, type: 'number' }] }] },
  };
  const caps0 = capList(m);
  const before = JSON.stringify(shape(m, caps0));
  const r = strip.stripInertManifest(m);
  assert.ok(JSON.stringify(shape(m, caps0)) === before, 'shape changed');
  assert.ok(!('flow' in m.drivers[0]));
  assert.ok(!('settings' in m.drivers[0]));
  assert.ok(!('energy' in m.drivers[0]));
  assert.ok(!('ui' in m.drivers[0]));
  assert.ok(!('bindings' in m.drivers[0].zigbee.endpoints['1']));
  assert.deepStrictEqual(m.drivers[0].zigbee.endpoints['1'].clusters, [6]);
  assert.strictEqual(m.drivers[0].capabilitiesOptions['button.1'].maintenanceAction, true);
  assert.deepStrictEqual(m.drivers[0].capabilitiesOptions['button.1'].title, { en: 'B1', fr: 'B1f' });
  assert.ok(!('args' in m.flow.triggers[0]));
  assert.deepStrictEqual(m.flow.triggers[0].tokens[0], { name: 's', title: { en: 'S' } });
  assert.deepStrictEqual(m.flow.triggers[0].tokens[1], { name: 'n', title: { en: 'N' }, type: 'number' });
  assert.ok(r.emptyDropped >= 7, `emptyDropped ${r.emptyDropped}`);
  assert.strictEqual(m.flow.triggers[0].id, 't1');
  assert.strictEqual(m.drivers[0].id, 'd1');
});

test('default capability flags: dropped only when equal to the capability default; differing values and other options kept', () => {
  const m = { capabilities: { my_cap: { type: 'boolean', getable: false } }, drivers: [{ id: 'd', capabilities: ['measure_battery', 'volume_up', 'my_cap', 'onoff'], capabilitiesOptions: {
    measure_battery: { getable: true, preventInsights: false, title: { en: 'Bat' } },
    volume_up: { getable: false, setable: true },
    my_cap: { getable: false },
    onoff: { getable: false, setable: false, preventInsights: true },
  } }] };
  const caps0 = capList(m);
  const before = effectiveCapOptions(m, caps0);
  const r = strip.stripInertManifest(m, { systemCaps: SYS });
  assert.deepStrictEqual(m.drivers[0].capabilitiesOptions.measure_battery, { title: { en: 'Bat' } });
  // P3354: setable and getable:false stay explicit even when equal to the default (runtime readers use them).
  assert.deepStrictEqual(m.drivers[0].capabilitiesOptions.volume_up, { getable: false, setable: true }, 'setable / getable:false kept');
  assert.deepStrictEqual(m.drivers[0].capabilitiesOptions.my_cap, { getable: false }, 'getable:false kept');
  assert.deepStrictEqual(m.drivers[0].capabilitiesOptions.onoff, { getable: false, setable: false, preventInsights: true }, 'non-default kept');
  assert.strictEqual(r.capOptDropped, 2);
  const after = effectiveCapOptions(m, caps0);
  assert.deepStrictEqual(after, before, 'removed entries resolve to the very same defaults');
  const noLib = { drivers: [{ id: 'x', capabilitiesOptions: { measure_battery: { getable: true } } }] };
  strip.stripInertManifest(noLib, { systemCaps: null });
  assert.deepStrictEqual(noLib.drivers[0].capabilitiesOptions, { measure_battery: { getable: true } }, 'no homey-lib: untouched');
});
