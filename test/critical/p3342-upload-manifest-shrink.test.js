'use strict';
// P3342: lossless upload app.json shrink (Homey-inert driver keys, locales beyond en/fr/nl/de) + growth ceiling.
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
const shape = (m) => ({
  drivers: m.drivers.map((d) => d.id),
  caps: m.drivers.map((d) => [d.id, d.capabilities, Object.keys(d.capabilitiesOptions || {})]),
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
  const before = shape(m);
  const r = strip.stripInertManifest(m);
  assert.deepStrictEqual(shape(m), before);
  assert.ok(r.inertDropped > 100, `inert keys dropped ${r.inertDropped}`);
  assert.ok(!m.drivers.some((d) => d.maintenanceActions || d.capabilityOptions));
});

test('pipeline wiring: prepare-publish, size-gate and p2842 projections strip; ceiling blocks in prepare-publish and Platform Budget', () => {
  const pp = read('scripts/prepare-publish.js');
  assert.match(pp, /strip-inert-manifest\.cjs'\)\.stripFile\(destAppJson\)/);
  assert.ok(pp.indexOf('strip-inert-manifest') > pp.indexOf("compact-shared-text.cjs').compactFile(destAppJson)"), 'after P3068');
  assert.match(pp, /upload-manifest-ceiling\.cjs'\);[\s\S]{0,200}checkUploadManifest\(destAppJson\)[\s\S]{0,400}process\.exit\(1\)/);
  assert.ok(pp.indexOf('checkUploadManifest(destAppJson)') > pp.indexOf('asciiPublishPayload(destDir)'), 'measured after the ASCII pass');
  assert.match(read('scripts/ci/publish-size-gate.cjs'), /strip-inert-manifest\.cjs'\)\.stripFile\(tmp\)/);
  assert.match(read('tools/ci/p2842-flow-publish-self-heal.js'), /strip-inert-manifest\.cjs'\)\)\.stripFile\(tmp\)/);
  const wf = read('.github/workflows/platform-budget.yml');
  assert.match(wf, /run: node scripts\/ci\/upload-manifest-ceiling\.cjs /);
  assert.ok(!/upload-manifest-ceiling[^\n]*\|\|/.test(wf), 'ceiling step must block');
});

test('ceiling policy: at most 3.3 MB, goal 2.85 MB; over the ceiling fails, under passes', () => {
  const pol = ceiling.policy();
  assert.ok(pol.ceilingBytes <= 3300000, `ceiling raised to ${pol.ceilingBytes}`);
  assert.strictEqual(pol.goalBytes, 2850000);
  const tmp = path.join(os.tmpdir(), `p3342-${process.pid}.json`);
  try {
    fs.writeFileSync(tmp, 'x'.repeat(100));
    assert.strictEqual(ceiling.checkUploadManifest(tmp, { ceilingBytes: 100, goalBytes: 50 }).ok, true);
    assert.strictEqual(ceiling.checkUploadManifest(tmp, { ceilingBytes: 99, goalBytes: 50 }).ok, false);
  } finally { fs.rmSync(tmp, { force: true }); }
});
