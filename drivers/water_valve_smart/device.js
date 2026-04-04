'use strict';
const HybridPlugBase = require('../../lib/devices/HybridPlugBase');

const GARDEN_TIMER_MFRS = ['_tze200_sh1btabb','_tze200_fphxkxue','_tze204_sh1btabb','_tze204_fphxkxue'];

class WaterValveSmartDevice extends HybridPlugBase {
  get plugCapabilities() { return ['onoff','measure_battery','measure_temperature','meter_water']; }

  get isGardenTimer() {
    if (this._gtCached !== undefined) return this._gtCached;
    const mfr = (this.getSetting('zb_manufacturer_name') || '').toLowerCase();
    this._gtCached = GARDEN_TIMER_MFRS.some(m => mfr.includes(m));
    return this._gtCached;
  }

  get dpMappings() {
    if (this.isGardenTimer) {
      return {
        1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
        5: { capability: 'meter_water', divisor: 1000 },
        7: { capability: 'measure_battery' },
        101: { capability: 'meter_water', divisor: 1000 },
      };
    }
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: null, internal: 'month_consumption' },
      3: { capability: null, internal: 'daily_consumption' },
      5: { capability: 'meter_water', divisor: 1000 },
      6: { capability: null, internal: 'month_consumption' },
      7: { capability: null, internal: 'daily_consumption' },
      9: { capability: null, internal: 'flow_rate' },
      10: { capability: 'measure_temperature', divisor: 10 },
      11: { capability: 'measure_battery', transform: (v) => {
        if (v > 3000) return 100;
        if (v < 2700) return 0;
        return Math.round(((v - 2700) / 300) * 100);
      }},
      15: { capability: null, setting: 'auto_clean' },
      21: { capability: null, internal: 'flow_rate' },
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    if (!this.hasCapability('meter_water')) {
      try { await this.addCapability('meter_water'); } catch (e) { /* */ }
    }
    if (!this.hasCapability('measure_temperature')) {
      try { await this.addCapability('measure_temperature'); } catch (e) { /* */ }
    }
    // Remove legacy alarm_motion if present
    if (this.hasCapability('alarm_motion')) {
      try { await this.removeCapability('alarm_motion'); } catch (e) { /* */ }
    }
    this.log('[WATER-VALVE] v5.9.17 Ready (' + (this.isGardenTimer ? 'GARDEN' : 'METERED') + ')');
  }

  async setCapabilityValue(capability, value) {
    const prev = this.getCapabilityValue(capability);
    await super.setCapabilityValue(capability, value);
    if (prev === value) return;
    try {
      switch (capability) {
      case 'onoff': {
        const id = value ? 'water_valve_smart_opened' : 'water_valve_smart_closed';
        this.homey.flow.getDeviceTriggerCard(id).trigger(this, {}, {}).catch(() => {});
        break;
      }
      case 'alarm_water': {
        const id = value ? 'water_valve_smart_leak_detected' : 'water_valve_smart_leak_cleared';
        this.homey.flow.getDeviceTriggerCard(id).trigger(this, {}, {}).catch(() => {});
        break;
      }
      case 'measure_temperature': {
        this.homey.flow.getDeviceTriggerCard('water_valve_smart_temperature_changed')
          .trigger(this, { temperature: value }, {}).catch(() => {});
        if (value <= 2 && (prev === undefined || prev === null || prev > 2)) {
          this.homey.flow.getDeviceTriggerCard('water_valve_smart_frost_warning')
            .trigger(this, {}, {}).catch(() => {});
        }
        break;
      }
      case 'measure_battery': {
        if (value <= 15 && (prev === undefined || prev === null || prev > 15)) {
          this.homey.flow.getDeviceTriggerCard('water_valve_smart_battery_low')
            .trigger(this, {}, {}).catch(() => {});
        }
        break;
      }
      case 'meter_water': {
        this.homey.flow.getDeviceTriggerCard('water_valve_smart_water_consumed')
          .trigger(this, { liters: value }, {}).catch(() => {});
        break;
      }
      }
    } catch (e) { /* flow card may not exist */ }
  }
}
module.exports = WaterValveSmartDevice;
