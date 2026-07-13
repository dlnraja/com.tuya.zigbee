'use strict';

/**
 * BatteryManagerV3 shim
 *
 * Backward compatibility for drivers that still import:
 *   const BatteryManagerV3 = require('../../lib/BatteryManagerV3');
 *
 * Delegates all functionality to BatteryManagerV4.
 */

const BatteryManagerV4 = require('./BatteryManagerV4');

class BatteryManagerV3 extends BatteryManagerV4 {
  constructor(options) {
    super(options);
  }
}

module.exports = BatteryManagerV3;
