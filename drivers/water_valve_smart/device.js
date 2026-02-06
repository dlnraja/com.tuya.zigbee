'use strict';
const HybridPlugBase = require('../../lib/devices/HybridPlugBase');

/**
 * WaterValveSmartDevice - Tuya Water Valve Controller
 * v5.5.911: Enhanced with Z2M DP mappings for water valve specific features
 * 
 * Z2M Reference: https://www.zigbee2mqtt.io/devices/TS0601_water_valve.html
 * Fingerprints: _TZE200_sh1btabb, _TZE200_vrjkcam9, _TZE204_81isopgh, _TZE204_wt66haax, etc.
 * 
 * DP Mappings (from Z2M):
 * - DP1: state (on/off valve)
 * - DP5: water_consumed (total liters)
 * - DP6: month_consumption (liters)
 * - DP7: daily_consumption (liters)  
 * - DP9: flow_rate (L/h)
 * - DP10: temperature (°C)
 * - DP11: battery voltage (mV)
 * - DP15: auto_clean (bool)
 */
class WaterValveSmartDevice extends HybridPlugBase {
  
  get plugCapabilities() { 
    return ['onoff', 'measure_battery', 'measure_temperature', 'meter_water']; 
  }

  /**
   * v5.5.911: Water valve specific DP mappings from Z2M
   */
  get dpMappings() {
    return {
      // Valve state (on = open, off = closed)
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      
      // Water consumption metrics
      5: { capability: 'meter_water', divisor: 1000 },        // Total water (L → m³)
      6: { capability: null, internal: 'month_consumption' }, // Month consumption
      7: { capability: null, internal: 'daily_consumption' }, // Daily consumption
      
      // Flow rate (L/h)
      9: { capability: null, internal: 'flow_rate' },
      
      // Temperature sensor
      10: { capability: 'measure_temperature', divisor: 10 }, // °C * 10
      
      // Battery voltage (mV → %)
      11: { 
        capability: 'measure_battery', 
        transform: (v) => {
          // Convert mV to percentage (typical range 2700-3200mV for CR batteries)
          if (v > 3000) return 100;
          if (v < 2700) return 0;
          return Math.round(((v - 2700) / 300) * 100);
        }
      },
      
      // Auto clean feature
      15: { capability: null, setting: 'auto_clean' },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    // Add water meter capability if not present
    if (!this.hasCapability('meter_water')) {
      try {
        await this.addCapability('meter_water');
        this.log('[WATER-VALVE] ✅ Added meter_water capability');
      } catch (e) { /* ignore */ }
    }
    
    // Add temperature capability if not present
    if (!this.hasCapability('measure_temperature')) {
      try {
        await this.addCapability('measure_temperature');
        this.log('[WATER-VALVE] ✅ Added measure_temperature capability');
      } catch (e) { /* ignore */ }
    }

    this.log('[WATER-VALVE] ✅ Water Valve Smart v5.8.31 Ready');
  }

  /**
   * v5.8.31: Override setCapabilityValue to fire flow trigger cards
   * Fixes: 7 trigger cards defined in compose but never fired
   * Uses override pattern to avoid conflicting with HybridPlugBase listeners
   */
  async setCapabilityValue(capability, value) {
    const prev = this.getCapabilityValue(capability);
    await super.setCapabilityValue(capability, value);
    if (prev === value) return;

    try {
      switch (capability) {
        case 'onoff': {
          const cardId = value ? 'water_valve_smart_opened' : 'water_valve_smart_closed';
          this.homey.flow.getDeviceTriggerCard(cardId).trigger(this, {}, {}).catch(() => {});
          break;
        }
        case 'alarm_water': {
          const cardId = value ? 'water_valve_smart_leak_detected' : 'water_valve_smart_leak_cleared';
          this.homey.flow.getDeviceTriggerCard(cardId).trigger(this, {}, {}).catch(() => {});
          break;
        }
        case 'measure_temperature': {
          this.homey.flow.getDeviceTriggerCard('water_valve_smart_temperature_changed')
            .trigger(this, { temperature: value }, {}).catch(() => {});
          // Frost warning when crossing ≤2°C threshold
          if (value <= 2 && (prev === undefined || prev === null || prev > 2)) {
            this.homey.flow.getDeviceTriggerCard('water_valve_smart_frost_warning')
              .trigger(this, {}, {}).catch(() => {});
          }
          break;
        }
        case 'measure_battery': {
          // Battery low when crossing ≤15% threshold
          if (value <= 15 && (prev === undefined || prev === null || prev > 15)) {
            this.homey.flow.getDeviceTriggerCard('water_valve_smart_battery_low')
              .trigger(this, {}, {}).catch(() => {});
          }
          break;
        }
      }
    } catch (e) { /* flow card may not exist */ }
  }
}
module.exports = WaterValveSmartDevice;
