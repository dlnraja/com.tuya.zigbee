'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Aqara/Xiaomi Temperature & Humidity Sensor
 */
class AqaraClimateSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Aqara Climate Sensor initializing...');

    // Temperature
    if (zclNode.endpoints[1]?.clusters?.temperatureMeasurement) {
      zclNode.endpoints[1].clusters.temperatureMeasurement.on('attr.measuredValue', (value) => {
        const temp = value / 100;
        const offset = this.getSetting('temperature_offset') || 0;
        this.log(`[AQARA] Temperature: ${temp + offset}°C`);
        this.setCapabilityValue('measure_temperature', temp + offset).catch(this.error);
      });

      try {
        const { measuredValue } = await zclNode.endpoints[1].clusters.temperatureMeasurement.readAttributes(['measuredValue']);
        if (measuredValue !== undefined) {
          const offset = this.getSetting('temperature_offset') || 0;
          this.setCapabilityValue('measure_temperature', measuredValue / 100 + offset).catch(this.error);
        }
      } catch (e) {
        this.log('[AQARA] Could not read temperature:', e.message);
      }
    }

    // Humidity
    if (zclNode.endpoints[1]?.clusters?.relativeHumidityMeasurement) {
      zclNode.endpoints[1].clusters.relativeHumidityMeasurement.on('attr.measuredValue', (value) => {
        const humidity = value / 100;
        const offset = this.getSetting('humidity_offset') || 0;
        this.log(`[AQARA] Humidity: ${humidity + offset}%`);
        this.setCapabilityValue('measure_humidity', humidity + offset).catch(this.error);
      });

      try {
        const { measuredValue } = await zclNode.endpoints[1].clusters.relativeHumidityMeasurement.readAttributes(['measuredValue']);
        if (measuredValue !== undefined) {
          const offset = this.getSetting('humidity_offset') || 0;
          this.setCapabilityValue('measure_humidity', measuredValue / 100 + offset).catch(this.error);
        }
      } catch (e) {
        this.log('[AQARA] Could not read humidity:', e.message);
      }
    }

    // Pressure (if available)
    if (this.hasCapability('measure_pressure') && zclNode.endpoints[1]?.clusters?.pressureMeasurement) {
      zclNode.endpoints[1].clusters.pressureMeasurement.on('attr.measuredValue', (value) => {
        this.log(`[AQARA] Pressure: ${value} hPa`);
        this.setCapabilityValue('measure_pressure', value).catch(this.error);
      });
    }

    // Battery
    if (zclNode.endpoints[1]?.clusters?.genPowerCfg) {
      zclNode.endpoints[1].clusters.genPowerCfg.on('attr.batteryPercentageRemaining', (value) => {
        const battery = Math.round(value / 2);
        this.log(`[AQARA] Battery: ${battery}%`);
        this.setCapabilityValue('measure_battery', battery).catch(this.error);
      });

      // Also listen for voltage-based battery
      zclNode.endpoints[1].clusters.genPowerCfg.on('attr.batteryVoltage', (voltage) => {
        // Aqara uses CR2032: 2.5V empty, 3.0V full
        const percent = Math.min(100, Math.max(0, Math.round((voltage - 25) * 2)));
        this.log(`[AQARA] Battery (voltage): ${percent}% (${voltage / 10}V)`);
        this.setCapabilityValue('measure_battery', percent).catch(this.error);
      });
    }

    this.log('Aqara Climate Sensor initialized');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('temperature_offset') || changedKeys.includes('humidity_offset')) {
      this.log('[AQARA] Offset settings changed - will apply on next reading');
    }
  }
}

module.exports = AqaraClimateSensorDevice;
