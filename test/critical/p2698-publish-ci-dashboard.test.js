'use strict';

/**
 * P2698 — Publish CI unblock (2026-09-23)
 *
 * Contre quoi:
 * - climate_sensor exposes measure_battery + alarm_battery → Homey BATTERY_CAPABILITY_CONFLICT
 * - 7dcddnye bleeds onto bulb_dimmable (must stay dimmer_wall_1gang only)
 * - diagnostics dashboard soft-empty must not console.warn (Windows CI noise)
 *
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2698 publish CI + diag dashboard soft shell', () => {
  it('climate_sensor has measure_battery without alarm_battery', () => {
    const c = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'), 'utf8'),
    );
    const caps = c.capabilities || [];
    assert.ok(caps.includes('measure_battery'));
    assert.ok(!caps.includes('alarm_battery'));
  });

  it('7dcddnye not on bulb_dimmable', () => {
    const bulb = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/bulb_dimmable/driver.compose.json'), 'utf8'),
    );
    assert.ok(!(bulb.zigbee.manufacturerName || []).some((m) => /7dcddnye/i.test(m)));
    const dim = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/dimmer_wall_1gang/driver.compose.json'), 'utf8'),
    );
    assert.ok((dim.zigbee.manufacturerName || []).some((m) => /7dcddnye/i.test(m)));
  });

  it('diagnostics dashboard soft-empty uses console.log not console.warn', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'scripts/dashboard/generate-diagnostics-dashboard.js'),
      'utf8',
    );
    assert.ok(src.includes("console.log('[diagnostics-dashboard] Missing report"));
    assert.ok(!/console\.warn\(\s*'\[diagnostics-dashboard\] Missing report/.test(src));
  });

  it('npm check:p2698 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2698']);
  });
});
