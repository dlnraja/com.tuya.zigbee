'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaOutdoorTempHumidity extends ZigBeeDevice {
  async onNodeInit() {
    this.log('Tuya Outdoor Temperature/Humidity Sensor init');

    // Map Tuya DPs to capabilities
    this.registerTuyaDataPointListener('dp_1', (value) => {
      // Temperature in 0.1°C units
      const temp = value / 10;
      const offset = this.getSetting('temperature_offset') || 0;
      this.log('Temperature:', temp, '°C (offset:', offset, ')');
      this.setCapabilityValue('measure_temperature', temp + offset).catch(this.error);
    });

    this.registerTuyaDataPointListener('dp_2', (value) => {
      // Humidity in %
      const offset = this.getSetting('humidity_offset') || 0;
      this.log('Humidity:', value, '% (offset:', offset, ')');
      this.setCapabilityValue('measure_humidity', value + offset).catch(this.error);
    });

    this.registerTuyaDataPointListener('dp_4', (value) => {
      // Battery percentage
      this.log('Battery:', value, '%');
      this.setCapabilityValue('measure_battery', value).catch(this.error);
    });

    // Settings listeners
    this.registerCapabilityListener('settings.temperature_offset', async (value) => {
      this.log('Temperature offset changed to:', value);
      // Re-apply current temperature with new offset
      const currentTemp = this.getCapabilityValue('measure_temperature');
      if (currentTemp !== null) {
        const oldOffset = this.getSetting('temperature_offset') || 0;
        const newTemp = currentTemp - oldOffset + value;
        this.setCapabilityValue('measure_temperature', newTemp).catch(this.error);
      }
    });

    this.registerCapabilityListener('settings.humidity_offset', async (value) => {
      this.log('Humidity offset changed to:', value);
      // Re-apply current humidity with new offset
      const currentHumidity = this.getCapabilityValue('measure_humidity');
      if (currentHumidity !== null) {
        const oldOffset = this.getSetting('humidity_offset') || 0;
        const newHumidity = currentHumidity - oldOffset + value;
        this.setCapabilityValue('measure_humidity', newHumidity).catch(this.error);
      }
    });

    // Poll for updates every 5 minutes (outdoor sensor, less frequent polling)
    this.homey.setInterval(() => {
      this.pollSensorData().catch(() => {});
    }, 300000);
  }

  async pollSensorData() {
    try {
      // Request fresh data from all known DPs
      await this.readTuyaDataPoint('dp_1'); // Temperature
      await this.readTuyaDataPoint('dp_2'); // Humidity
      await this.readTuyaDataPoint('dp_4'); // Battery
    } catch (err) {
      this.log('Poll failed:', err.message);
    }
  }

  async readTuyaDataPoint(dp) {
    try {
      const result = await this.zclNode.endpoints[1].clusters.manuSpecificTuya.readDataPoint(dp);
      return result;
    } catch (err) {
      this.log('Read DP failed:', err.message);
    }
  }

  registerTuyaDataPointListener(dp, callback) {
    this.zclNode.endpoints[1].clusters.manuSpecificTuya.on(`dp.${dp}`, callback);
  }
}

module.exports = TuyaOutdoorTempHumidity;
