'use strict';

/**
 * P2841 Contre quoi: Moes Star Feather `_TZE200_zo0cfekv`+TS0601 must be an
 * exact compose couple on wall_switch_3gang_1way (P151 registryAligned).
 * Missing productId TS0601 → exact couple (none) → CI sacred audit red.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P2841 zo0cfekv+TS0601 wall_switch_3gang_1way', () => {
  it('compose has mfr + productId TS0601', () => {
    const c = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/wall_switch_3gang_1way/driver.compose.json'), 'utf8'),
    );
    const mfr = c.zigbee?.manufacturerName || [];
    const pid = c.zigbee?.productId || [];
    assert.ok(mfr.some((x) => /zo0cfekv/i.test(String(x))));
    assert.ok(pid.some((x) => String(x).toUpperCase() === 'TS0601'));
    // Complementary: keep ZCL 3-gang pids too
    assert.ok(pid.some((x) => /TS0003/i.test(String(x))));
  });

  it('audit-sacred-couple --from-registry exits 0', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/audit-sacred-couple.js'), '--from-registry'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
    });
    assert.strictEqual(r.status, 0, r.stderr || r.stdout?.slice(-800));
  });
});
