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

  it('docs map mentions L14 and UniversalLayerBootstrap', () => {
    const doc = read('docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md');
    assert.match(doc, /UniversalLayerBootstrap/);
    assert.match(doc, /L14|safeSetCapabilityValue/);
  });
});
