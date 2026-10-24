'use strict';
// P3025 — lossless app.json: sanitize keeps valid [[device]] titleFormatted, root never stripped,
// and the compose drift gate detects + fixes fingerprint / titleFormatted drift deterministically.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const san = require(path.join(ROOT, 'scripts/maintenance/sanitize-manifest.cjs'));
const gate = require(path.join(ROOT, 'scripts/ci/appjson-compose-drift-gate.js'));

const unfiltered = { id: 'inferred_button_action', args: [{ name: 'device', type: 'device' }, { name: 'action', type: 'dropdown' }], titleFormatted: { en: 'Action [[action]] on [[device]]' } };
const implicit = { id: 'presence_zone_occupied', args: [{ name: 'device', type: 'device', filter: 'driver_id=presence_detector' }], titleFormatted: { en: 'Zone occupied ([[device]])' } };

test('homey-lib rule: unfiltered device arg may appear, implicit driver_id arg may not', () => {
  assert.strictEqual(san.deviceTitleFormattedValid(unfiltered), true);
  assert.strictEqual(san.deviceTitleFormattedValid(implicit), false);
  assert.strictEqual(gate.titleFormattedValid(unfiltered, unfiltered.titleFormatted), true);
  assert.strictEqual(gate.titleFormattedValid(implicit, implicit.titleFormatted), false);
});

test('stripDeviceTitleFormatted keeps valid [[device]] (P3019b) and strips only rejected ones', () => {
  const m = { flow: { triggers: [JSON.parse(JSON.stringify(unfiltered))], conditions: [JSON.parse(JSON.stringify(implicit))] } };
  assert.strictEqual(san.stripDeviceTitleFormatted(m), 1);
  assert.deepStrictEqual(m.flow.triggers[0].titleFormatted, unfiltered.titleFormatted);
  assert.strictEqual(m.flow.conditions[0].titleFormatted, undefined);
});

test('sanitize never strips titleFormatted from the tracked root app.json (dry-run)', () => {
  const rootApp = path.join(ROOT, 'app.json');
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'p3025-san-')), 'app.json');
  fs.copyFileSync(rootApp, tmp);
  let rootChanges = 0; let tmpChanges = 0;
  san.sanitizeManifestFile(rootApp, { dryRun: true, onChanges: n => { rootChanges = n; } });
  san.sanitizeManifestFile(tmp, { dryRun: true, onChanges: n => { tmpChanges = n; } });
  const m = JSON.parse(fs.readFileSync(rootApp, 'utf8'));
  const stripped = san.stripDeviceTitleFormatted(m);
  const comment = m._comment !== undefined ? 1 : 0;
  assert.strictEqual(tmpChanges - rootChanges, stripped + comment);
});

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3025-drift-'));
  fs.mkdirSync(path.join(dir, 'drivers/plug'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.homeycompose/flow/actions'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'drivers/plug/driver.compose.json'), JSON.stringify({ zigbee: { manufacturerName: ['_TZ3000_aaaa', '_TZ3000_bbbb'], productId: ['TS011F'] } }));
  fs.writeFileSync(path.join(dir, '.homeycompose/flow/actions/plug_set.json'), JSON.stringify({ id: 'plug_set', args: [{ name: 'device', type: 'device' }, { name: 'v', type: 'number' }], titleFormatted: { en: 'Set [[device]] to [[v]]' } }));
  const app = { id: 'x', keep: { deep: [1, 2] }, drivers: [{ id: 'plug', name: { en: 'Plug' }, zigbee: { manufacturerName: ['_TZ3000_aaaa'], productId: ['TS011F'], endpoints: { 1: {} } } }], flow: { actions: [{ id: 'plug_set', title: { en: 'Set' }, args: [{ name: 'device', type: 'device' }, { name: 'v', type: 'number' }] }] } };
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify(app) + '\n');
  return dir;
}

test('drift gate detects fp + titleFormatted drift and --fix is lossless, deterministic, keeps compact style', () => {
  const dir = fixture();
  const d = gate.check(dir);
  assert.deepStrictEqual(d.map(x => x.kind).sort(), ['fp', 'tf']);
  gate.check(dir, { fix: true });
  const raw1 = fs.readFileSync(path.join(dir, 'app.json'), 'utf8');
  assert.strictEqual(raw1.trimEnd().includes('\n'), false, 'compact preserved');
  const app = JSON.parse(raw1);
  assert.deepStrictEqual(app.keep, { deep: [1, 2] });
  assert.deepStrictEqual(app.drivers[0].zigbee.endpoints, { 1: {} });
  assert.deepStrictEqual(app.drivers[0].zigbee.manufacturerName, ['_TZ3000_aaaa', '_TZ3000_bbbb']);
  assert.deepStrictEqual(app.flow.actions[0].titleFormatted, { en: 'Set [[device]] to [[v]]' });
  assert.deepStrictEqual(gate.check(dir), []);
  gate.check(dir, { fix: true });
  assert.strictEqual(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'), raw1, 'idempotent');
});

test('this branch: tracked app.json has no compose drift', () => {
  assert.deepStrictEqual(gate.check(ROOT), []);
});
