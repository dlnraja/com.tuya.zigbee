'use strict';

/**
 * P3266 — Bastien 1.0.229, 7 Nov 2026 ~18:12 Paris.
 * TS0043 tile showed 100% while the 7-day capability graph had no sample.
 * A displayed percent without a report flag must not be stamped fresh,
 * and a stored 100 must not be painted unless a sample path set the flag.
 * A flagged report is left in place.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const {
  batteryTileReportIsFresh,
  storedBatteryMayRestore,
} = require('../../lib/battery/button-battery-report');

const HOUR = 60 * 60 * 1000;

test('a tile percent without a report time is not fresh', () => {
  const now = Date.now();
  assert.strictEqual(batteryTileReportIsFresh(100, 0, now), false);
  assert.strictEqual(batteryTileReportIsFresh(100, now - 25 * HOUR, now), false);
  assert.strictEqual(batteryTileReportIsFresh(100, now - HOUR, now), true);
  assert.strictEqual(batteryTileReportIsFresh(null, now, now), false);
});

test('stored 100 is restored only when a sample path flagged it', () => {
  assert.strictEqual(storedBatteryMayRestore(100, false), false);
  assert.strictEqual(storedBatteryMayRestore(100, undefined), false);
  assert.strictEqual(storedBatteryMayRestore(100, true), true);
  assert.strictEqual(storedBatteryMayRestore(0, true), false);
  assert.strictEqual(storedBatteryMayRestore(80, true), true);
});

test('unverified tile does not stamp last_battery_time', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../lib/devices/ButtonDevice.js'), 'utf8');
  const at = src.indexOf('tile percent is not a proven report');
  assert.ok(at > 0);
  const window = src.slice(at, at + 500);
  assert.strictEqual(window.includes("setStoreValue('last_battery_time'"), false);
  assert.ok(src.includes('UI already has battery (${curVal}%) - skip active TX to preserve CR2032'));
  assert.ok(src.includes("setStoreValue('last_battery_from_report', true)"));
});
