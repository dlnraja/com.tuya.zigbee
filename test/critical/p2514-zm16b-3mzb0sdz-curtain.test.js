'use strict';

/**
 * P2514 — Zemismart ZM16B Contre quoi
 * - Real couple `_TZE284_3mzb0sdz`+TS0601 → curtain_motor (not ir_blaster)
 * - OCR invent `_TZE2841000000_3MZB0SDZ` stays doNotLock / audit-skipped
 * - DP map uses 8/9 position + DP13 battery (Z2M/ZHA)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P2514 ZM16B 3mzb0sdz curtain', () => {
  it('compose: curtain_motor has couple; ir_blaster does not', () => {
    const curtain = fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8');
    const ir = fs.readFileSync(path.join(ROOT, 'drivers/ir_blaster/driver.compose.json'), 'utf8');
    assert.ok(/_TZE284_3MZB0SDZ/i.test(curtain));
    assert.ok(!/_TZE284_3MZB0SDZ/i.test(ir), 'must not remain on ir_blaster');
  });

  it('registry locks curtain_motor; invent padded mfr stays doNotLock', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const lock = (reg.cases || []).find((c) => c.id === 'p2514-zm16b-3mzb0sdz-curtain');
    assert.ok(lock);
    assert.strictEqual(lock.canonicalDriver, 'curtain_motor');
    assert.ok(lock.productId.includes('TS0601'));
    assert.ok(lock.forbiddenDrivers.includes('ir_blaster'));
    const invent = (reg.cases || []).find((c) => c.id === 'p2509-invent-junk-do-not-lock');
    assert.ok(invent?.doNotLock === true);
  });

  it('device + battery helper treat 3mzb0sdz as battery tubular with DP8/9', () => {
    const deviceSrc = fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/device.js'), 'utf8');
    assert.ok(deviceSrc.includes('_isZm16bAkeTubular'));
    assert.ok(deviceSrc.includes('3mzb0sdz'));
    assert.ok(/8:\s*\{\s*capability:\s*'windowcoverings_set'/.test(deviceSrc));
    assert.ok(/9:\s*\{\s*capability:\s*'windowcoverings_set'/.test(deviceSrc));
    const batt = fs.readFileSync(path.join(ROOT, 'lib/helpers/batteryPowerSource.js'), 'utf8');
    assert.ok(/3mzb0sdz/i.test(batt));
    const cover = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedCoverBase.js'), 'utf8');
    assert.ok(cover.includes('_isZm16bAkeCover'));
    assert.ok(cover.includes('_sendTuyaDP(9,'));
  });

  it('audit --from-registry does not fail on doNotLock invent junk', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/audit-sacred-couple.js'), '--from-registry'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
    });
    assert.strictEqual(r.status, 0, r.stderr || r.stdout?.slice(-800));
    assert.ok(/failures:\s*0/.test(r.stdout || ''), r.stdout?.slice(-400));
  });
});
