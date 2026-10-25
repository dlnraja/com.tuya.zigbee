'use strict';

/**
 * Tests — P3040 motion_sensor first-start fixes found by the pairing trace / lint no-undef:
 *  - `_luxSmartReporting.lastLuxValue` was a bare undefined identifier → ReferenceError in onNodeInit;
 *  - `_smartZclRead` used `readId` (declared in try) inside catch → ReferenceError, and the
 *    pending mark was never cleared, so that read stayed blocked.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'drivers/motion_sensor/device.js'), 'utf8');

describe('P3040 — motion_sensor first start', () => {
  it('initialises lastLuxValue explicitly (no bare identifier)', () => {
    assert.ok(!/^\s*lastLuxValue,\s*$/m.test(SRC));
    assert.ok(/lastLuxValue:\s*null/.test(SRC));
  });

  it('a failed smart ZCL read returns null and frees its pending mark', async () => {
    require('./_support/homey-stub').install();
    const Cls = require(path.join(ROOT, 'drivers/motion_sensor/device.js'));
    const self = Object.create(Cls.prototype);
    Object.assign(self, {
      _isDeviceAwake: true,
      _lastWakeTime: Date.now(),
      _pendingZclReads: new Set(),
      _destroyed: false,
      homey: { setTimeout: (fn, ms) => setTimeout(fn, ms) },
    });
    Object.defineProperty(self, 'log', { value: () => {} });
    const cluster = { name: 'iasZone', readAttributes: async () => { throw new Error('TIMEOUT'); } };
    const r = await Cls.prototype._smartZclRead.call(self, cluster, ['zoneStatus'], 1000);
    assert.strictEqual(r, null);
    assert.strictEqual(self._pendingZclReads.size, 0);
  });
});
