'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class WaterLeakSensorDriver extends ZigBeeDriver {
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
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('WaterLeakSensorDriver v5.5.570 initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Water is/is not detected
    try {
      const card = const card = this.homey.flow.getConditionCard('water_leak_sensor_water_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_water') === true;
        });
        this.log('[FLOW]  Registered: water_leak_sensor_water_detected');
      }
    } catch (err) { this.log(`[FLOW]  water_leak_sensor_water_detected: ${err.message}`); }

    // CONDITION: Battery above threshold
    try {
      const card = const card = this.homey.flow.getConditionCard('water_leak_sensor_battery_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
      });
        this.log('[FLOW]  Registered: water_leak_sensor_battery_above');
      }
    } catch (err) { this.log(`[FLOW]  water_leak_sensor_battery_above: ${err.message}`); }

    this.log('[FLOW]  Water leak sensor flow cards registered');
  }
}

module.exports = WaterLeakSensorDriver;
