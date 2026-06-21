'use strict';
const { Driver } = require('homey');

class ClimateSmartDriver extends Driver {
  async onInit() {
    await super.onInit();
    this.log('Climate Smart Driver initialized');

    try {
      const card = this.homey.flow.getDeviceTriggerCard('sensor_climate_smart_climate_sensor_smart_smart_scene_panel_scene_activated');
      if (card) {
        this.log('[FLOW] Scene activated trigger registered');
      }
    } catch (e) {
      this.error('[FLOW] Error registering scene_activated:', e.message);
    }
  }
}

module.exports = ClimateSmartDriver;
