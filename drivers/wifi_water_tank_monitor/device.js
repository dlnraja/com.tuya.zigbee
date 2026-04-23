'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

const LIQUID_STATE = { 0: 'normal', 1: 'low', 2: 'high' };

class WiFiWaterTankMonitorDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':  { capability: 'unknown' }, // liquid_state handled manually
      '2':  { capability: 'measure_water_level' }, // cm
      '7':  { capability: 'unknown' }, // max_set limit
      '8':  { capability: 'unknown' }, // min_set limit
      '19': { capability: 'unknown' }, // installation_height
      '21': { capability: 'unknown' }, // liquid_depth_max
      '22': { capability: 'measure_water_percentage' }
    };
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-TANK] Wi-Fi Liquid Level sensor initialized');
  }

  _processDPUpdate(dps) {
    super._processDPUpdate(dps);
    this.log('[WIFI-TANK] Raw DPs:', JSON.stringify(dps));
    
    // DP 1 - liquid_state
    if (dps.hasOwnProperty('1')) {
      const parsed = typeof dps['1'] === 'number' ? dps['1'] : parseInt(dps['1']) || 0;
      const stateName = LIQUID_STATE[parsed] || 'normal';
      this.log(`[WIFI-TANK] State: ${stateName} (raw=${parsed})`);

      const isLow = parsed === 1;
      const isHigh = parsed === 2;

      if (this.hasCapability('alarm_water_low')) {
        this.setCapabilityValue('alarm_water_low', isLow).catch(() => {});
      }
      if (this.hasCapability('alarm_water_high')) {
        this.setCapabilityValue('alarm_water_high', isHigh).catch(() => {});
      }
      if (this.hasCapability('alarm_water')) {
        this.setCapabilityValue('alarm_water', isLow || isHigh).catch(() => {});
      }

      const driver = this.homey.drivers.getDriver('wifi_water_tank_monitor');
      if (isLow) driver.lowLevelTrigger?.trigger(this, { state: 'low' }, {}).catch(() => {});
      if (isHigh) driver.highLevelTrigger?.trigger(this, { state: 'high' }, {}).catch(() => {});
      driver.stateChangedTrigger?.trigger(this, { state: stateName }, {}).catch(() => {});
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[WIFI-TANK] Settings changed:', changedKeys);

    for (const key of changedKeys) {
      try {
        const val = newSettings[key];
        switch (key) {
        case 'installation_height': // DP19
          await this.set({ dps: 19, set: val });
          this.log(`[WIFI-TANK] Sent DP19 installation_height = ${val}mm`);
          break;
        case 'liquid_depth_max': // DP21
          await this.set({ dps: 21, set: val });
          this.log(`[WIFI-TANK] Sent DP21 liquid_depth_max = ${val}mm`);
          break;
        case 'max_set': // DP7
          await this.set({ dps: 7, set: val });
          this.log(`[WIFI-TANK] Sent DP7 max_set = ${val}%`);
          break;
        case 'min_set': // DP8
          await this.set({ dps: 8, set: val });
          this.log(`[WIFI-TANK] Sent DP8 min_set = ${val}%`);
          break;
        }
      } catch (err) {
        this.error(`[WIFI-TANK] Failed to send setting ${key}:`, err.message);
      }
    }
  }

  onDeleted() {
    this.log('[WIFI-TANK] Sensor deleted');
    super.onDeleted();
  }
}

module.exports = WiFiWaterTankMonitorDevice;
