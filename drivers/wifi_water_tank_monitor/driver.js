'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiWaterTankMonitorDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-TANK-DRV] Wi-Fi Liquid Level Sensor driver initialized');

    const safeGetTrigger = (id) => {
      try {
        return this.homey.flow.getDeviceTriggerCard(id);
      } catch (err) {
        this.log(`[FLOW] Trigger '${id}' not defined: ${err.message}`);
        return null;
      }
    };

    this.stateChangedTrigger = safeGetTrigger('wifi_water_tank_monitor_state_changed');
    this.levelChangedTrigger = safeGetTrigger('wifi_water_tank_monitor_level_changed');
    this.lowLevelTrigger = safeGetTrigger('wifi_water_tank_monitor_low');
    this.highLevelTrigger = safeGetTrigger('wifi_water_tank_monitor_high');

    // Condition: fill level above threshold
    try {
      const levelAboveCard = this.homey.flow.getConditionCard('wifi_water_tank_monitor_level_above');
      if (levelAboveCard) {
        levelAboveCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const pct = args.device.getCapabilityValue('measure_water_percentage') || 0;
          return pct > (args.level || 20);
        });
      }
    } catch (err) {
      this.log(`[FLOW] level_above error: ${err.message}`);
    }

    // Condition: liquid state is
    try {
      const stateIsCard = this.homey.flow.getConditionCard('wifi_water_tank_monitor_state_is');
      if (stateIsCard) {
        stateIsCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Note: _lastState should be tracked on the device
          const LIQUID_STATE = { 0: 'normal', 1: 'low', 2: 'high' };
          let curr = 'normal';
          try {
            const dps = args.device.getSetting('discovered_dps');
            if (dps) {
              const parsedDps = JSON.parse(dps);
              curr = LIQUID_STATE[parsedDps['1']] || 'normal';
            }
          } catch (e) {
            this.log('Error parsing discovered_dps:', e.message);
          }
          return curr === args.state;
        });
      }
    } catch (err) {
      this.log(`[FLOW] state_is error: ${err.message}`);
    }
  }
}

module.exports = WiFiWaterTankMonitorDriver;
