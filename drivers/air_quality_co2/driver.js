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
    try { this.homey.flow.getTriggerCard('air_quality_co2_co2_level_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_quality_co2_co2_alert_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_quality_co2_co2_alert_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_quality_co2_air_temperature_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_quality_co2_air_humidity_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_quality_co2_pm25_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_quality_co2_temp_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_quality_co2_humidity_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('air_quality_co2_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('air_quality_co2_co2_above');
    } catch (err) { this.error(`Condition air_quality_co2_co2_above: ${err.message}`); }
  }

  _getFlowCard(id, type) {
    try {
      return type === 'condition' ? this.homey.flow.getConditionCard(id) : this.homey.flow.getTriggerCard(id);
    } catch (err) {
      return null;
    }
  }
}

module.exports = AirQualityCO2Driver;
