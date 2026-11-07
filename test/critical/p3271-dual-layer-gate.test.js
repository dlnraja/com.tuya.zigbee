'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { missingComposeManufacturers, collectLayerWipes } = require('../../scripts/automation/pre-push-dual-layer-gate');

test('compose manufacturer kept in app.json is not a wipe', () => {
  const compose = { zigbee: { manufacturerName: ['_TZ3000_abc12345'] } };
  const app = { id: 'contact_sensor', zigbee: { manufacturerName: ['_TZ3000_abc12345'] } };
  assert.deepStrictEqual(missingComposeManufacturers(app, compose), []);
});

test('app.json dropping a compose manufacturer is a wipe', () => {
  const compose = { zigbee: { manufacturerName: ['_TZ3000_abc12345', '_TZ3000_keepme01'] } };
  const app = { id: 'contact_sensor', zigbee: { manufacturerName: ['_TZ3000_keepme01'] } };
  assert.deepStrictEqual(missingComposeManufacturers(app, compose), ['_TZ3000_abc12345']);
  const errors = collectLayerWipes([app], { contact_sensor: compose });
  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /contact_sensor/);
});

test('authored empty manufacturerName in both layers is not a wipe', () => {
  const compose = { zigbee: { manufacturerName: [], productId: ['TS0203'] } };
  const app = { id: 'doorwindowsensor', zigbee: { manufacturerName: [], productId: ['TS0203'] }, deprecated: true };
  assert.deepStrictEqual(missingComposeManufacturers(app, compose), []);
  assert.deepStrictEqual(collectLayerWipes([app], { doorwindowsensor: compose }), []);
});

test('a zigbee driver with no compose entry is not invented into an error', () => {
  const app = { id: 'orphan_shell', zigbee: { manufacturerName: [] } };
  assert.deepStrictEqual(collectLayerWipes([app], {}), []);
});

test('a real contact_sensor manufacturer missing from app.json is a wipe', () => {
  const root = path.join(__dirname, '../..');
  const compose = JSON.parse(fs.readFileSync(path.join(root, 'drivers/contact_sensor/driver.compose.json'), 'utf8'));
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const appDriver = (app.drivers || []).find((d) => d.id === 'contact_sensor');
  assert.ok(appDriver, 'contact_sensor is in app.json');
  assert.deepStrictEqual(missingComposeManufacturers(appDriver, compose), []);
  const real = (compose.zigbee.manufacturerName || []).find((m) => typeof m === 'string' && m.startsWith('_T'));
  assert.ok(real, 'contact_sensor compose has a real _T manufacturer');
  const stripped = JSON.parse(JSON.stringify(appDriver));
  stripped.zigbee.manufacturerName = stripped.zigbee.manufacturerName.filter((m) => String(m).toLowerCase() !== real.toLowerCase());
  const missing = missingComposeManufacturers(stripped, compose);
  assert.ok(missing.some((m) => m.toLowerCase() === real.toLowerCase()), real);
});
