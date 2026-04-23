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
    try { this._getFlowCard('air_quality_co2_co2_level_changed', 'trigger'); } catch (e) {}
    try { this._getFlowCard('air_quality_co2_co2_alert_on', 'trigger'); } catch (e) {}
    try { this._getFlowCard('air_quality_co2_co2_alert_off', 'trigger'); } catch (e) {}
    try { this._getFlowCard('air_quality_co2_air_temperature_changed', 'trigger'); } catch (e) {}
    try { this._getFlowCard('air_quality_co2_air_humidity_changed', 'trigger'); } catch (e) {}
    try { this._getFlowCard('air_quality_co2_pm25_changed', 'trigger'); } catch (e) {}
    try { this._getFlowCard('air_quality_co2_temp_changed', 'trigger'); } catch (e) {}
    try { this._getFlowCard('air_quality_co2_humidity_changed', 'trigger'); } catch (e) {}
    try { this._getFlowCard('air_quality_co2_battery_low', 'trigger'); } catch (e) {}

    // CONDITIONS
    try {
      const card = this._getFlowCard('air_quality_co2_co2_above', 'condition');
    } catch (err) { this.error(`Condition air_quality_co2_co2_above: ${err.message}`); }
  }

  _getFlowCard(id, type) {
    try {
      return type === 'condition' ? this._getFlowCard(id, 'condition') : this._getFlowCard(id, 'trigger');
    } catch (err) {
      return null;
    }
  }
}

module.exports = AirQualityCO2Driver;
