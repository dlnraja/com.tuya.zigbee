'use strict';

/**
 * P2766 — TH05Z (_TZE200_vvmbj46n) battery: DP4 percentage is authoritative,
 * DP3 battery_state enum must not overwrite it once a percentage was seen.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../drivers/lcdtemphumidsensor/device.js'), 'utf8');

describe('P2766 LCD battery SSOT', () => {
  it('DP3 enum ignored after DP4/DP15 percentage', () => {
    assert.match(src, /P2766 DP3 battery enum ignored/);
    assert.match(src, /4: \{ capability: 'measure_battery', transform: \(v\) => this\._lcdMarkBatteryPct\(/);
    assert.match(src, /15: \{ capability: 'measure_battery', transform: \(v\) => this\._lcdMarkBatteryPct\(/);
  });

  it('percentage marker is soft and persisted', () => {
    assert.match(src, /_lcdMarkBatteryPct\(pct\) \{/);
    assert.match(src, /setStoreValue\?\.\('lcd_battery_pct_seen', true\)/);
    assert.match(src, /return null;/);
  });

  it('npm check:p2766 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2766']);
  });
});
