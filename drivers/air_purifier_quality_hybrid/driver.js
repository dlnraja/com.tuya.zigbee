'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AirQualityCO2Driver extends ZigBeeDriver {
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
    this.log('AirQualityCO2Driver v5.5.584 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('air_purifier_quality_hybrid_air_quality_co2_co2_level_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_purifier_quality_hybrid_air_quality_co2_co2_alert_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_purifier_quality_hybrid_air_quality_co2_co2_alert_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_purifier_quality_hybrid_air_quality_co2_air_temperature_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_purifier_quality_hybrid_air_quality_co2_air_humidity_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_purifier_quality_hybrid_air_quality_co2_pm25_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_purifier_quality_hybrid_air_quality_co2_temp_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_purifier_quality_hybrid_air_quality_co2_humidity_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_purifier_quality_hybrid_air_quality_co2_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      // A8: NaN Safety - use safeDivide/safeMultiply
  const card = this.homey.flow.getConditionCard('air_purifier_quality_hybrid_air_quality_co2_co2_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition air_purifier_quality_hybrid_air_quality_co2_co2_above: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('air_purifier_quality_hybrid_air_quality_co2_co2_below');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition air_purifier_quality_hybrid_air_quality_co2_co2_below: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('air_purifier_quality_hybrid_air_quality_co2_air_quality_good');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition air_purifier_quality_hybrid_air_quality_co2_air_quality_good: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = AirQualityCO2Driver;
