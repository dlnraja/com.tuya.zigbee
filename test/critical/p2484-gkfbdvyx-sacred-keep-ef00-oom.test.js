'use strict';

/**
 * P2484 — Contre quoi:
 * 1) Athom compact drops `_TZE204_gkfbdvyx` from presence_sensor_radar → Homey Unknown Zigbee (#547)
 * 2) TuyaEF00Manager.initialize() re-entrancy stacks listeners → heap OOM
 *    (#548 Wuma 97413373 @ 9.0.908; Peter #2235 8278ec79 @ 9.0.908 SOS / 375def7f @ 9.0.895)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

const ROOT = path.join(__dirname, '..', '..');

const keep = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'),
  'utf8'
));
const couples = keep.couples || [];
assert.ok(
  couples.some((c) => /gkfbdvyx/i.test(c.mfr) && c.pid === 'TS0601' && c.driverId === 'presence_sensor_radar'),
  'sacred-keep must pin gkfbdvyx+TS0601 → presence_sensor_radar'
);

const { compactManifestFile } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
const tmp = path.join(os.tmpdir(), `p2484-compact-${process.pid}.json`);
fs.copyFileSync(path.join(ROOT, 'app.json'), tmp);
compactManifestFile(tmp, {
  maxTotalCombos: 17000,
  maxDriverCombos: 2000,
  maxCaseForms: 2,
});
const after = JSON.parse(fs.readFileSync(tmp, 'utf8'));
try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }

const radar = (after.drivers || []).find((d) => d.id === 'presence_sensor_radar');
assert.ok(radar, 'presence_sensor_radar in compacted manifest');
const mfrs = (radar.zigbee && radar.zigbee.manufacturerName) || [];
const pids = (radar.zigbee && radar.zigbee.productId) || [];
assert.ok(mfrs.some((m) => /_TZE204_gkfbdvyx/i.test(m)), 'compact keeps _TZE204_gkfbdvyx');
assert.ok(pids.includes('TS0601'), 'compact keeps TS0601 on radar');

const TuyaEF00Manager = require('../../lib/tuya/TuyaEF00Manager');

class FakeCluster extends EventEmitter {
  constructor() {
    super();
    this.id = 61184;
    this.constructor.COMMANDS = { dataReport: {} };
  }
}

function countListeners(cluster) {
  return ['dp', 'dataReport', 'response', 'data', 'command', 'report', 'datapoint', 'reporting']
    .reduce((n, ev) => n + cluster.listenerCount(ev), 0);
}

async function runIdempotency() {
  const cluster = new FakeCluster();
  const settings = {
    zb_model_id: 'TS0601',
    zb_manufacturer_name: '_TZE204_gkfbdvyx',
  };
  const fakeDevice = {
    getName: () => 'P2484',
    getData: () => ({ id: 'p2484' }),
    getStoreValue: () => null,
    setStoreValue: async () => {},
    hasCapability: () => false,
    getSettings: () => settings,
    getSetting: (k) => settings[k],
    zclNode: {
      endpoints: {
        1: {
          clusters: { tuya: cluster },
          on() {},
          bind: async () => {},
        },
      },
    },
    homey: {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout,
      isDestroyed: false,
    },
    _destroyed: false,
  };

  const mgr = new TuyaEF00Manager(fakeDevice);
  mgr._log = () => {};
  mgr._error = () => {};
  mgr.sendTimeSync = async () => true;
  mgr.scheduleDailySync = () => {};
  mgr._startWatchdogPing = () => {};
  mgr.requestDP = async () => false;

  const zclNode = fakeDevice.zclNode;
  await mgr.initialize(zclNode);
  const listenersAfterFirst = countListeners(cluster);

  await mgr.initialize(zclNode);
  await mgr.initialize(zclNode);
  const listenersAfterRepeat = countListeners(cluster);

  assert.ok(mgr._initialized, 'manager marks _initialized');
  assert.strictEqual(listenersAfterRepeat, listenersAfterFirst, 'repeat initialize must not stack listeners');
  assert.ok(listenersAfterFirst > 0, 'first initialize wires at least one listener');
}

runIdempotency()
  .then(() => {
    console.log('P2484 gkfbdvyx sacred-keep + EF00 idempotent: PASS');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
