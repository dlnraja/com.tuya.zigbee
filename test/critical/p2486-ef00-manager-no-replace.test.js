'use strict';

/**
 * P2486b — Contre quoi:
 * Several TuyaEF00Manager instances may exist, but only ONE may launch
 * (initialize + bind EF00 listeners). Salvagr ed0de063 / Wuma 97413373.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const TuyaEF00Manager = require('../../lib/tuya/TuyaEF00Manager');

const bootstrap = fs.readFileSync(
  path.join(ROOT, 'lib/layers/UniversalLayerBootstrap.js'),
  'utf8'
);
assert.ok(
  /launchOnce\s*\(/.test(bootstrap),
  'UniversalLayerBootstrap must use launchOnce'
);

const cover = fs.readFileSync(
  path.join(ROOT, 'lib/devices/UnifiedCoverBase.js'),
  'utf8'
);
assert.ok(/launchOnce\s*\(/.test(cover), 'UnifiedCoverBase must use launchOnce');

const src = fs.readFileSync(
  path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'),
  'utf8'
);
assert.ok(/static async launchOnce/.test(src), 'launchOnce helper exists');
assert.ok(/findLaunched/.test(src) && /_skippedAsPeerLaunch/.test(src), 'peer-skip gate exists');

// Behavioral: two instances — second initialize must skip when peer already launched
const device = {
  getName: () => 'P2486b',
  getData: () => ({ id: 'p2486b' }),
  getStoreValue: () => null,
  setStoreValue: async () => {},
  hasCapability: () => false,
  getSettings: () => ({}),
  getSetting: () => null,
  log: () => {},
  error: () => {},
};

const a = new TuyaEF00Manager(device);
const b = new TuyaEF00Manager(device);
device.tuyaEF00Manager = a;
device._tuyaEF00Manager = b; // second instance allowed

assert.strictEqual(TuyaEF00Manager.isAnyLaunched(device), false);
a._initialized = true;
device.__ef00LaunchedManager = a;
assert.ok(TuyaEF00Manager.isAnyLaunched(device));

(async () => {
  const ok = await b.initialize(null);
  assert.strictEqual(ok, true);
  assert.ok(b._initialized, 'second instance marked done');
  assert.ok(b._skippedAsPeerLaunch, 'second instance skipped peer launch');
  assert.strictEqual(TuyaEF00Manager.findLaunched(device), a);

  const once = await TuyaEF00Manager.launchOnce(device, null);
  assert.strictEqual(once, a, 'launchOnce reuses launched peer');

  // Soft-create primary when empty
  const d2 = { ...device, tuyaEF00Manager: null, _tuyaEF00Manager: null, __ef00LaunchedManager: null };
  const primary = TuyaEF00Manager.attachPrimary(d2);
  assert.ok(primary);
  assert.strictEqual(d2.tuyaEF00Manager, primary);
  const again = TuyaEF00Manager.attachPrimary(d2);
  assert.strictEqual(again, primary, 'attachPrimary does not replace');

  console.log('P2486b multi-instance / single-launch: PASS');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
