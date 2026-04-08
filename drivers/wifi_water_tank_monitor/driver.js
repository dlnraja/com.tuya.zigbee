'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiWaterTankMonitorDriver extends TuyaLocalDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-TANK-DRV] Wi-Fi Liquid Level Sensor driver initialized');

    const safeGetTrigger = (id) => {
      try { return (() => { try { return (() => { try { return (() => { try { return (() => { try { return this.homey.flow.getDeviceTriggerCard(id); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })(); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })(); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })(); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })(); }
      catch (e) { this.log(`[FLOW] Trigger '${id}' not defined`); return null; }
    };

    this.stateChangedTrigger = safeGetTrigger('wifi_water_tank_monitor_state_changed');
    this.levelChangedTrigger = safeGetTrigger('wifi_water_tank_monitor_level_changed');
    this.lowLevelTrigger = safeGetTrigger('wifi_water_tank_monitor_low');
    this.highLevelTrigger = safeGetTrigger('wifi_water_tank_monitor_high');

    // Condition: fill level above threshold
    try {
      (() => { try { return this.homey.flow.getDeviceConditionCard('wifi_water_tank_monitor_level_above'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const pct = args.device.getCapabilityValue('measure_water_percentage') || 0;
          return pct > (args.level || 20);
        });
    } catch (err) { this.log(`[FLOW] level_above: ${err.message}`); }

    // Condition: liquid state is
    try {
      (() => { try { return this.homey.flow.getDeviceConditionCard('wifi_water_tank_monitor_state_is'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const LIQUID_STATE = { 0: 'normal', 1: 'low', 2: 'high' };
          let curr = 'normal';
          try { curr = LIQUID_STATE[args.device.getSetting('discovered_dps') ? JSON.parse(args.device.getSetting('discovered_dps'))['1'] : 0] || 'normal'; } catch(e){}
          return curr === args.state;
        });
    } catch (err) { this.log(`[FLOW] state_is: ${err.message}`); }

  }
}

module.exports = WiFiWaterTankMonitorDriver;

