'use strict';

/**
 * P2611 — Dual-app adaptive layer gate + BOTH battery reliability Contre quoi
 * WHY: stable syntax must not ENOENT on MASTER_ONLY DeviceAvailability;
 *      structural MASTER_ONLY checks skip on .stable/.bastien; invent 15% and
 *      blind ZCL /2 remain hard fails on every track.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P2611 dual-app layer gate adaptive', () => {
  it('layer-coverage-gate soft-reads missing files and track-skips MASTER_ONLY', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/layer-coverage-gate.js'), 'utf8');
    assert.ok(src.includes('P2611'));
    assert.ok(src.includes('mustIfPresent'));
    assert.ok(src.includes('mustMasterOnly'));
    assert.ok(src.includes('trackKind'));
    assert.ok(src.includes('DeviceAvailabilityManager'));
    assert.ok(/if\s*\(\s*!fs\.existsSync\(abs\)\s*\)/.test(src) || src.includes('!fs.existsSync(abs)'));
  });

  it('layer-coverage-gate exits 0 on this track', () => {
    const r = spawnSync(process.execPath, ['tools/ci/layer-coverage-gate.js'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stdout || r.stderr);
  });

  it('IAS never invents 15% battery on this track', () => {
    const ias = path.join(ROOT, 'lib/managers/IASZoneManager.js');
    if (!fs.existsSync(ias)) return;
    const src = fs.readFileSync(ias, 'utf8');
    assert.ok(!/Battery set to 15%/.test(src));
  });

  it('battery-reporting-manager has _writeBatteryPercent and no blind ZCL /2', () => {
    const p = path.join(ROOT, 'lib/utils/battery-reporting-manager.js');
    if (!fs.existsSync(p)) return;
    const src = fs.readFileSync(p, 'utf8');
    assert.ok(src.includes('_writeBatteryPercent'));
    assert.ok(!/Math\.min\(100, Math\.max\(0, (?:value|battery\.batteryPercentageRemaining) \/ 2\)\)/.test(src));
  });

  it('Moes ZT-YK couples stay on button_wireless_1/2/3', () => {
    const couples = [
      ['button_wireless_1', '_TZ3000_filhl5b7', 'TS0041'],
      ['button_wireless_2', '_TZ3000_cllghx1k', 'TS0042'],
      ['button_wireless_3', '_TZ3000_1kmurvlx', 'TS0043'],
    ];
    for (const [driver, mfr, pid] of couples) {
      const composePath = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;
      const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = c.zigbee?.manufacturerName || [];
      assert.ok(mfrs.some((m) => m.toLowerCase() === mfr.toLowerCase()), `${driver} missing ${mfr}`);
      assert.ok((c.zigbee?.productId || []).includes(pid), `${driver} missing ${pid}`);
    }
  });
});
