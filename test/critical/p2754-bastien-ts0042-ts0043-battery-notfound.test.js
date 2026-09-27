'use strict';

/**
 * P2754 — Bastien Diagnostics e57f9c1a (TS0042 & TS0043 battery state + AutoAdaptive Not Found guard)
 *
 * Verifies:
 * 1. PhysicalButtonMixin schedules awake battery read non-blockingly (15ms) for all battery remotes,
 *    allowing multi-button remotes (TS0042 2-gang, TS0043 3-gang, TS0044 4-gang) to read battery.
 * 2. ButtonDevice reads ZCL battery attributes while awake on EP1 when UI is unpainted or stale (>12h),
 *    recording last_battery_time, while preserving P2685 skip when fresh (<12h) or in cooldown.
 * 3. AutoAdaptiveDevice catches 'Not Found' unmounted errors without triggering critical rollback.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2754 Bastien TS0042/TS0043 battery + AutoAdaptive Not Found guard', () => {

  it('PhysicalButtonMixin schedules non-blocking awake battery read for all battery remotes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('P2754'), 'must document P2754 in PhysicalButtonMixin');
    assert.ok(src.includes('isBatteryRemote'), 'must identify battery remotes generically');
    assert.ok(/setTimer\(\(\)\s*=>\s*\{[\s\S]*?_readBatteryWhileAwake/.test(src),
      'must schedule _readBatteryWhileAwake non-blockingly via timer');
    // Ensure oneBtn restriction is removed
    const pressPathIdx = src.indexOf('P2754 / Bastien TS0042 & TS0043');
    assert.ok(pressPathIdx > 0, 'press path P2754 block must exist');
    const pressBlock = src.slice(pressPathIdx, pressPathIdx + 700);
    assert.ok(!pressBlock.includes('if (oneBtn &&'), 'must not restrict awake battery to oneBtn');
  });

  it('ButtonDevice allows awake ZCL read when unpainted and updates last_battery_time on success', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('P2754'), 'must document P2754 in ButtonDevice');
    assert.ok(src.includes('isFresh'), 'must check freshness for sleepy buttons');
    assert.ok(src.includes('inCooldown'), 'must enforce cooldown to protect CR2032');
    assert.ok(src.includes('P2685 skip ZCL readAttributes (skipBatteryReporting / pile)'),
      'must preserve P2685 skip log when fresh or in cooldown');
    assert.ok(/setStoreValue\('last_battery_time',\s*Date\.now\(\)\)/.test(src),
      'must record last_battery_time on successful batteryRead');
  });

  it('AutoAdaptiveDevice safely handles Not Found and guards end-of-init setStoreValue', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'dynamic', 'AutoAdaptiveDevice.js'), 'utf8');
    assert.ok(src.includes('P2754'), 'must document P2754 in AutoAdaptiveDevice');
    assert.ok(/err\.message\?\.includes\('Not Found'\)[\s\S]*?return;/.test(src),
      'must gracefully abort when device is Not Found during init');
    assert.ok(!/isCriticalError[\s\S]{0,120}Not Found/.test(src),
      'isCriticalError must not treat Not Found as critical rollback');
    assert.ok(/setStoreValue\('pairing_success',\s*true\)\.catch/.test(src),
      'pairing_success must be guarded with .catch()');
    assert.ok(/setStoreValue\('last_init_time',\s*Date\.now\(\)\)\.catch/.test(src),
      'last_init_time must be guarded with .catch()');
  });

});
