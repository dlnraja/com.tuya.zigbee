'use strict';

/**
 * BatteryManagerV2 shim
 *
 * Backward compatibility for drivers that still import:
 *   const BatteryManagerV2 = require('../../lib/BatteryManagerV2');
 *
 * Delegates all functionality to BatteryManagerV4.
 *
 * NOTE: The actual BatteryManagerV2 implementation is at lib/battery/BatteryManagerV2.js
 * This shim exists purely for import path compatibility.
 */

const BatteryManagerV4 = require('./BatteryManagerV4');

class BatteryManagerV2 extends BatteryManagerV4 {
  constructor(options) {
    super(options);
    // Log once per instance
    if (this.log && !BatteryManagerV2._shimWarningShown) {
      this.log('[BatteryManagerV2] ⚠️ Using shim - please update imports to BatteryManagerV4');
      BatteryManagerV2._shimWarningShown = true;
    }
  }
}

// Static flag to avoid spam
BatteryManagerV2._shimWarningShown = false;

module.exports = BatteryManagerV2;
