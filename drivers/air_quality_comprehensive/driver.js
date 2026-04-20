'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

class TuyaComprehensiveAirMonitorDriver extends BaseZigBeeDriver {
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

    this.log('TuyaComprehensiveAirMonitorDriver initialized');
    
    // Register flow cards from driver.flow.compose.json (SDK3 standard methods)
    try {
      // Triggers
      this._temperatureChangedTrigger = this._getFlowCard('air_quality_comprehensive_comprehensive_air_monitor_measure_temperature_changed', 'trigger');
      this._humidityChangedTrigger = this._getFlowCard('air_quality_comprehensive_comprehensive_air_monitor_measure_humidity_changed', 'trigger');
      this._tempChangedTrigger = this._getFlowCard('air_quality_comprehensive_temp_changed', 'trigger');
      this._humidityChangedTrigger2 = this._getFlowCard('air_quality_comprehensive_humidity_changed', 'trigger');
      this._batteryLowTrigger = this._getFlowCard('air_quality_comprehensive_battery_low', 'trigger');
      
      // Conditions
      this._co2AboveCondition = this._getFlowCard('air_quality_comprehensive_co2_above', 'condition');
      this._tempAboveCondition = this._getFlowCard('air_quality_comprehensive_temp_above', 'condition');
      this._humidityAboveCondition = this._getFlowCard('air_quality_comprehensive_humidity_above', 'condition');
      
      this.log('Air quality comprehensive flow cards registered successfully');
    } catch (error) {
      this.error('Failed to register flow cards:', error);
    }
  }
}

module.exports = TuyaComprehensiveAirMonitorDriver;
