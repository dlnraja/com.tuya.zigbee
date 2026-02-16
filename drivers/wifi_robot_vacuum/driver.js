'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiRobotVacuumDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-ROBOT-VACUUM-DRV] Driver initialized');
  }
}

module.exports = WiFiRobotVacuumDriver;
