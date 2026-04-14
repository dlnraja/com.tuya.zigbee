'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * Vibration Sensor Device - v5.3.64 SIMPLIFIED
 */
class VibrationSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_vibration', 'measure_temperature', 'alarm_tamper', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_vibration', transform: (v) => v === 1 || v === true },
      2: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      18: { capability: 'measure_temperature', divisor: 10 },
      19: { capability: 'measure_temperature', divisor: 10 }
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

    if (this.hasCapability('alarm_generic.vibration')) {
      const v = this.getCapabilityValue('alarm_generic.vibration');
      await this.removeCapability('alarm_generic.vibration').catch(() => {});
      if (!this.hasCapability('alarm_vibration')) await this.addCapability('alarm_vibration').catch(() => {});
      if (v != null) await this.setCapabilityValue('alarm_vibration', v).catch(() => {});
      this.log('[VIBRATION] Migrated alarm_generic.vibration → alarm_vibration');
    }
    await this.removeCapability('alarm_motion').catch(() => {});
    await this.removeCapability('alarm_generic').catch(() => {});
    if (!this.hasCapability('alarm_vibration')) await this.addCapability('alarm_vibration').catch(() => {});
    if (!this.hasCapability('measure_temperature')) await this.addCapability('measure_temperature').catch(() => {});

    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected
    this.log('[VIBRATION] ✅ Vibration sensor v5.11.47 ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = VibrationSensorDevice;
