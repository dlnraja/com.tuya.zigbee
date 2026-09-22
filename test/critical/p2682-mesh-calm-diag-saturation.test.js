'use strict';

/**
 * P2682 — Mesh calm from Bastien diag logs (2026-09-22)
 *
 * Contre quoi (f37e8a91 / 8f0915fa):
 * - onOff minInterval 0 → interval=90ms count=241 + Unhandled #800 on 0x0006
 * - sleepy TS0042 group join ("Impossible de joindre") TX retries on busy mesh
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2682 mesh calm from Bastien diag saturation signals', () => {
  it('MeshFloodCalm onOff floor is minInterval >= 1 (not 0)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/zigbee/MeshFloodCalm.js'), 'utf8');
    const idx = src.indexOf('async function calmOnOffReporting');
    assert.ok(idx >= 0);
    const block = src.slice(idx, idx + 500);
    assert.ok(/P2682/.test(block));
    const cfg = block.match(/configureReportingSoft\(device,\s*\[\{([\s\S]*?)\}\]\)/);
    assert.ok(cfg, 'must call configureReportingSoft');
    assert.ok(/minInterval:\s*1/.test(cfg[1]), 'must floor at 1s');
    assert.ok(!/minInterval:\s*0/.test(cfg[1]), 'config must not use 0');
  });

  it('TuyaZigbeeDevice pairing onOff reconfigure uses minInterval 1', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    const idx = src.indexOf("// On/Off");
    assert.ok(idx >= 0);
    const block = src.slice(idx, idx + 450);
    assert.ok(/cluster:\s*'onOff'/.test(block));
    assert.ok(/minInterval:\s*1/.test(block));
    assert.ok(/P2682/.test(block));
  });

  it('UnifiedSwitchBase default onOff min report is 1s not 0', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSwitchBase.js'), 'utf8');
    assert.ok(/P2682/.test(src));
    assert.ok(/Default: 5 min|maxReportInterval/.test(src));
    // default branch when setting absent → 1
    assert.ok(/:\s*1;\s*\n\s*const maxReportInterval/.test(src) || /minIv[\s\S]{0,80}:\s*1/.test(src));
  });

  it('PhysicalButtonMixin skips group join on sleepy remotes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(/P2682 skip group join on sleepy remote/.test(src));
    assert.ok(/isSleepyRemote/.test(src));
    assert.ok(/!isMultiGangRelay && !isSleepyRemote/.test(src.replace(/\s+/g, ' ')));
  });
});
