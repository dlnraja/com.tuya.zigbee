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
    
    // Safe card getter helper
    const safeGet = (type, id) => {
      try {
        return type === 'condition'
          ? this.homey.flow.getConditionCard(id)
          : this.homey.flow.getTriggerCard(id);
      } catch (e) { return null; }
    };

    // Register flow cards from driver.flow.compose.json (SDK3 standard methods)
    try {
      // Triggers
      this._temperatureChangedTrigger = safeGet('trigger', 'air_quality_comprehensive_comprehensive_air_monitor_measure_temperature_changed');
      this._humidityChangedTrigger = safeGet('trigger', 'air_quality_comprehensive_comprehensive_air_monitor_measure_humidity_changed');
      this._tempChangedTrigger = safeGet('trigger', 'air_quality_comprehensive_temp_changed');
      this._humidityChangedTrigger2 = safeGet('trigger', 'air_quality_comprehensive_humidity_changed');
      this._batteryLowTrigger = safeGet('trigger', 'air_quality_comprehensive_battery_low');

      // Conditions
      this._co2AboveCondition = safeGet('condition', 'air_quality_comprehensive_co2_above');
      this._tempAboveCondition = safeGet('condition', 'air_quality_comprehensive_temp_above');
      this._humidityAboveCondition = safeGet('condition', 'air_quality_comprehensive_humidity_above');

      this.log('Air quality comprehensive flow cards registered successfully');
    } catch (error) {
      this.error('Failed to register flow cards:', error);
    }
  }
}

module.exports = TuyaComprehensiveAirMonitorDriver;
