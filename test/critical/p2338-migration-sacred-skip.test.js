'use strict';

/**
 * P2338 — migration nag must not fire when sacred couple / registry / resolveDriverType
 * already match the current driver (meter91 _TZ3000_zgyzgdua+TS0044 on scene_switch_4).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const FPDB = require('../../lib/DeviceFingerprintDB');
const Misattrib = require('../../lib/pairing/UserMisattributionRegistry');
const MVM = require('../../lib/ManufacturerVariationManager');

function shouldSkipMigrationNag(mfr, pid, currentDriver) {
  const locked = FPDB.lookup?.(mfr, pid);
  if (locked?.driver === currentDriver) return true;
  const reg = Misattrib.lookup?.(mfr, pid);
  if (reg?.canonicalDriver === currentDriver) return true;
  const resolved = MVM.resolveDriverType?.(mfr, pid);
  if (resolved === currentDriver) return true;
  return false;
}

describe('P2338 migration sacred-couple skip', () => {
  it('meter91 zgyzgdua+TS0044 on scene_switch_4 skips nag', () => {
    assert.ok(shouldSkipMigrationNag('_TZ3000_zgyzgdua', 'TS0044', 'scene_switch_4'));
  });

  it('wkai4ga5+TS0044 resolves scene_switch_4', () => {
    assert.equal(MVM.resolveDriverType('_TZ3000_wkai4ga5', 'TS0044'), 'scene_switch_4');
    assert.ok(shouldSkipMigrationNag('_TZ3000_wkai4ga5', 'TS0044', 'scene_switch_4'));
  });

  it('kfu8zapd+TS0044 stays button_wireless_4 (not scene)', () => {
    assert.equal(MVM.resolveDriverType('_TZ3000_kfu8zapd', 'TS0044'), 'button_wireless_4');
    assert.ok(shouldSkipMigrationNag('_TZ3000_kfu8zapd', 'TS0044', 'button_wireless_4'));
  });
});
