'use strict';
const { safeFlowCard } = require('../../lib/flow/FlowCardPresence'); // P3068: undeclared legacy ids -> logged-once no-op
const { Driver } = require('homey');

class ClimateSmartDriver extends Driver {
  async onInit() {
    await super.onInit();
    this.log('Climate Smart Driver initialized');

    try {
      const card = safeFlowCard(this.homey, 'getDeviceTriggerCard', 'sensor_climate_smart_climate_sensor_smart_smart_scene_panel_scene_activated');
      if (card) {
        this.log('[FLOW] Scene activated trigger registered');
      }
    } catch (e) {
      this.error('[FLOW] Error registering scene_activated:', e.message);
    }
  }
}

module.exports = ClimateSmartDriver;
