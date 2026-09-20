'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

/** Tuya category codes for pool / air-water heat pumps (com.tuyalocal parity). */
const HEAT_PUMP_CATEGORIES = new Set(['rs', 'rsx', 'rsq', 'rszn']);

class WiFiHeatPumpDriver extends TuyaLocalDriver {
  getExpectedTuyaCategories() {
    return HEAT_PUMP_CATEGORIES;
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-HEAT-PUMP-DRV] initialized');
  }
}

module.exports = WiFiHeatPumpDriver;
