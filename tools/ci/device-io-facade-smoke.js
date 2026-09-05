#!/usr/bin/env node
'use strict';

/**
 * P102 DeviceIOFacade smoke — full API + compensation + fusion hooks.
 * Run: npm run io:smoke
 */

const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..', '..');
const {
  DeviceIOFacade,
  installDeviceIO,
  DEFAULT_CHANNELS,
  HomeyCompensationLayer,
  ProtocolFallbackChain,
} = require(path.join(ROOT, 'lib', 'io', 'DeviceIOFacade'));

function makeStubDevice() {
  const logs = [];
  const device = {
    _destroyed: false,
    zclNode: null,
    tuyaEF00Manager: null,
    log: (...a) => { logs.push(['log', ...a]); },
    error: (...a) => { logs.push(['error', ...a]); },
    getSetting: () => null,
    getData: () => ({}),
    hasCapability: () => false,
    getCapabilityValue: () => null,
    setCapabilityValue: async () => {},
    safeSetCapabilityValue: async () => {},
    setStoreValue: async () => {},
    getStoreValue: () => null,
    homey: {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id),
      setInterval: (fn, ms) => setInterval(fn, ms),
      clearInterval: (id) => clearInterval(id),
      isDestroyed: false,
    },
    _logs: logs,
  };
  return device;
}

async function main() {
  assert.strictEqual(typeof DeviceIOFacade, 'function');
  assert.strictEqual(typeof installDeviceIO, 'function');
  assert.ok(DEFAULT_CHANNELS.tuya_dp === true);
  assert.strictEqual(typeof HomeyCompensationLayer, 'function');
  assert.strictEqual(typeof ProtocolFallbackChain, 'function');

  const device = makeStubDevice();
  const io = installDeviceIO(device);
  assert.strictEqual(device.io, io);
  assert.ok(io instanceof DeviceIOFacade);

  assert.strictEqual(io.attach(null), true);
  assert.ok(io.compensation || device.homeyCompensation);
  assert.ok(io.fallbackChain || device.protocolFallbackChain);

  const proto = await io.pickProtocol(null, '_TZ3000_test', 'TS0001');
  assert.ok(typeof proto === 'string' && proto.length > 0);
  assert.ok(device._protocolInfo);
  assert.ok(device.ioChannels);

  const methods = [
    ['sendDP', [1, true, { type: 'bool', skipFallback: true }], false],
    ['requestDP', [1], false],
    ['queryAllDPs', [], false],
    ['readZcl', [1, 'onOff', ['onOff']], null],
    ['writeZcl', [1, 'onOff', { onOff: true }], false],
    ['configureReporting', [1, 'onOff', {}], false],
    ['bindCluster', [1, 'onOff'], false],
    ['sendRaw', [0xEF00, Buffer.from([0])], false],
    ['magicHandshake', [], false],
    ['ensureTuyaCluster', [{ tryMagic: false }], false],
    ['ensureIasEnrolled', [], false],
    ['ensureIasWd', [], false],
    ['startWarning', [{ skipFallback: true }], false],
    ['stopWarning', [], false],
    ['writeE00x', ['switchMode', 0], false],
    ['subscribeIrBinder', [], false],
    ['coverCalibration', ['start', {}], false],
  ];

  for (const [name, args, expected] of methods) {
    const result = await io[name](...args);
    assert.strictEqual(
      result,
      expected,
      `${name} expected ${expected}, got ${result}`,
    );
  }

  const scanned = await io.scanUnknownClusters(null);
  assert.ok(Array.isArray(scanned));

  for (const hook of ['fuseBattery', 'fuseButton', 'fuseSos', 'fuseScene', 'applyExoticProfile']) {
    assert.strictEqual(typeof io[hook], 'function');
  }
  assert.strictEqual(await io.fuseBattery(), false);
  assert.strictEqual(await io.fuseButton(), false);
  assert.strictEqual(await io.fuseSos(), false);
  assert.strictEqual(await io.fuseScene(), false);
  // Profile apply succeeds (opt-in armed); IR subscribe soft-fails without cluster
  assert.strictEqual(await io.applyExoticProfile('zosung_ir'), true);
  assert.strictEqual(await io.applyExoticProfile('no_such_profile'), false);

  const interview = await io.runInterviewCompensation({
    pollFallback: false,
    mcu: false,
    ensureIas: false,
    tryMagic: false,
  });
  assert.ok(interview && typeof interview === 'object');

  const tx = await io.transmitWithFallback({ kind: 'dp', dp: 1, value: 1 });
  assert.ok(tx && typeof tx.ok === 'boolean');
  const rx = await io.receiveWithFallback({ kind: 'dp', dp: 1 });
  assert.ok(rx && typeof rx.ok === 'boolean');
  assert.strictEqual(typeof io.resolveWifi, 'function');
  const wifi = await io.resolveWifi({});
  assert.ok(wifi && typeof wifi.ok === 'boolean');

  const { buildPhysicalFlowCandidates, resolveFlowCardId } = require(path.join(ROOT, 'lib', 'flow', 'FlowCardHeuristics'));
  const cands = buildPhysicalFlowCandidates('switch_2gang', 1, 'on', { gangCount: 2 });
  assert.ok(Array.isArray(cands) && cands.length > 0);
  assert.strictEqual(typeof resolveFlowCardId(cands, new Set(cands)), 'string');

  // Battery fuse with capability present — still safe without UBH profile crash
  device.hasCapability = (c) => c === 'measure_battery';
  const bat = await io.fuseBattery(4, 80, { source: 'smoke' });
  assert.strictEqual(typeof bat, 'boolean');

  const TuyaEF00Manager = require(path.join(ROOT, 'lib', 'tuya', 'TuyaEF00Manager'));
  assert.strictEqual(typeof TuyaEF00Manager.prototype.requestAllDPs, 'function');
  assert.strictEqual(typeof TuyaEF00Manager.prototype.queryAllDatapoints, 'function');
  const ef00 = new TuyaEF00Manager(device);
  device.tuyaEF00Manager = ef00;
  assert.strictEqual(await ef00.requestAllDPs(), false);
  assert.strictEqual(await ef00.queryAllDatapoints(), false);
  assert.strictEqual(await io.queryAllDPs(), false);

  const MCU = require(path.join(ROOT, 'lib', 'tuya', 'TuyaMCUManager'));
  const mcu = new MCU(device);
  assert.strictEqual(typeof mcu.negotiate, 'function');
  const neg = await mcu.negotiate();
  assert.ok(neg && neg.format);

  console.log('device-io-facade-smoke: OK');
  console.log('  protocol picked:', proto);
  console.log('  compensation:', !!io.compensation, 'fallbackChain:', !!io.fallbackChain);
  console.log('  API methods verified:', methods.map((m) => m[0]).concat(['scanUnknownClusters', 'runInterviewCompensation']).join(', '));
  console.log('  fusion + exotic hooks present');
  console.log('  EF00 aliases: requestAllDPs ≡ queryAllDatapoints');
}

main().catch((err) => {
  console.error('device-io-facade-smoke: FAIL', err);
  process.exit(1);
});
