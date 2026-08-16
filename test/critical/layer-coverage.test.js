'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P206 universal layer coverage', () => {
  it('bootstrap module exports bootstrapUniversalLayers', () => {
    const mod = require('../../lib/layers/UniversalLayerBootstrap');
    assert.equal(typeof mod.bootstrapUniversalLayers, 'function');
  });

  it('spine bases extend TuyaZigbeeDevice', () => {
    assert.match(read('lib/TuyaZigBeeLightDevice.js'), /extends TuyaZigbeeDevice/);
    assert.match(read('lib/tuya/TuyaSpecificClusterDevice.js'), /extends TuyaZigbeeDevice/);
    assert.match(read('lib/TuyaSpecificClusterDevice.js'), /extends TuyaZigbeeDevice/);
    assert.match(read('drivers/generic_diy/device.js'), /extends TuyaZigbeeDevice/);
    assert.match(read('drivers/ir_blaster/device.js'), /extends TuyaZigbeeDevice/);
  });

  it('TuyaZigbeeDevice wires UniversalLayerBootstrap', () => {
    assert.match(read('lib/tuya/TuyaZigbeeDevice.js'), /UniversalLayerBootstrap/);
    assert.match(read('lib/tuya/TuyaZigbeeDevice.js'), /bootstrapUniversalLayers/);
  });

  it('layer-coverage-gate passes', () => {
    const r = spawnSync(process.execPath, ['tools/ci/layer-coverage-gate.js', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000,
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const j = JSON.parse(r.stdout);
    assert.equal(j.ok, true);
  });

  it('CrossLayerRedundancy attaches confirmInbound helpers', async () => {
    const { attachCrossLayerRedundancy } = require('../../lib/layers/CrossLayerRedundancy');
    const fake = {
      _destroyed: false,
      hasCapability: (c) => c === 'measure_battery' || c === 'onoff',
      getCapabilityValue: () => null,
      getStoreValue: () => null,
      setStoreValue: async () => {},
      log() {},
      safeSetCapabilityValue: async () => true,
    };
    const out = await attachCrossLayerRedundancy(fake, { endpoints: { 1: { clusters: {} } } });
    assert.equal(out.skipped, undefined);
    assert.equal(typeof fake.confirmInbound, 'function');
    assert.equal(typeof fake.confirmOutbound, 'function');
    assert.ok(out.smartCaps >= 1);
    const r = await fake.confirmInbound('measure_battery', 88, 'zcl', 0.95);
    assert.equal(r.ok, true);
  });

  it('ProtocolRxTxChain inventories all protocol paths', async () => {
    const { attachProtocolRxTxChain, PROTOCOL_PATHS } = require('../../lib/layers/ProtocolRxTxChain');
    assert.ok(PROTOCOL_PATHS.tuya_dp);
    assert.ok(PROTOCOL_PATHS.zcl);
    assert.ok(PROTOCOL_PATHS.tuya_bound);
    assert.ok(PROTOCOL_PATHS.raw_frame);
    assert.ok(PROTOCOL_PATHS.mcu);
    assert.ok(PROTOCOL_PATHS.ias);
    const fake = {
      _destroyed: false,
      log() {},
      io: null,
    };
    const out = await attachProtocolRxTxChain(fake, null);
    assert.equal(typeof fake.tx, 'function');
    assert.equal(typeof fake.rx, 'function');
    assert.ok(out.paths >= 8);
    assert.ok(fake.protocolRxTx.inventory().length >= 8);
  });

  it('docs map mentions L14 and UniversalLayerBootstrap', () => {
    const doc = read('docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md');
    assert.match(doc, /UniversalLayerBootstrap/);
    assert.match(doc, /CrossLayerRedundancy|confirmInbound/);
    assert.match(doc, /ProtocolRxTxChain/);
    assert.match(doc, /L14|safeSetCapabilityValue/);
  });
});
