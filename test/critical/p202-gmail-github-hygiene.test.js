'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P202 Gmail/GitHub hygiene', () => {
  it('Auto-Fix failure notify does not hardcode issue 420', () => {
    const yml = read('.github/workflows/auto-fix-and-publish.yml');
    assert(!/issue_number:\s*420/.test(yml), 'must not spam closed #420');
    assert(yml.includes('autofix-notify') || yml.includes('core.summary'), 'must use summary or open-label notify');
  });

  it('collect-diagnostics resolves OCR trailing-a FPs', () => {
    const src = read('.github/scripts/collect-diagnostics.js');
    assert(src.includes('resolveKnownFp'), 'must define OCR resolver');
    assert(src.includes('ocrFrom'), 'must record OCR resolutions');
    assert(src.includes('toLowerCase()'), 'driver index must be case-insensitive');
  });

  it('clrdrnya sacred couple stays on presence_sensor_radar only', () => {
    const compose = read('drivers/presence_sensor_radar/driver.compose.json');
    assert(compose.includes('_TZE204_clrdrnya'));
    const illumCfg = read('drivers/sensor_illuminance_presence/configs.js');
    assert(!illumCfg.includes("'_TZE204_clrdrnya'"), 'illuminance configs must not claim clrdrnya');
    const illumDev = read('drivers/sensor_illuminance_presence/device.js');
    assert(!illumDev.includes("'_tze204_clrdrnya'"), 'illuminance device must not list clrdrnya');
    const mmwave = read('drivers/motion_sensor_radar_mmwave/device.js');
    assert(mmwave.includes('presence_sensor_radar only') || !mmwave.includes("clrdrnya"), 'mmwave must not own clrdrnya');
  });
});
