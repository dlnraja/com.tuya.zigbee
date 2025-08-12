'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaRadar24G extends ZigBeeDevice {
  async onNodeInit() {
    this.log('Tuya 24G Radar Sensor init');

    // Map Tuya DPs to capabilities
    this.registerTuyaCapabilityListener('alarm_motion', 'dp_1');
    this.registerTuyaCapabilityListener('measure_luminance', 'dp_104');
    this.registerTuyaCapabilityListener('measure_distance', 'dp_109');

    // Register for Tuya data point updates
    this.registerTuyaDataPointListener('dp_1', (value) => {
      this.log('Motion detected:', value);
      this.setCapabilityValue('alarm_motion', !!value).catch(this.error);
    });

    this.registerTuyaDataPointListener('dp_104', (value) => {
      this.log('Luminance:', value);
      this.setCapabilityValue('measure_luminance', value).catch(this.error);
    });

    this.registerTuyaDataPointListener('dp_109', (value) => {
      this.log('Distance:', value);
      this.setCapabilityValue('measure_distance', value).catch(this.error);
    });

    // Settings handling
    this.registerCapabilityListener('settings.sensitivity', async (value) => {
      const sensitivityMap = { 'low': 1, 'medium': 2, 'high': 3 };
      await this.writeTuyaDataPoint('dp_2', sensitivityMap[value] || 2);
    });

    this.registerCapabilityListener('settings.detection_range', async (value) => {
      await this.writeTuyaDataPoint('dp_3', Math.round(value));
    });

    // Enhanced polling for better responsiveness (based on HA forum insights)
    this.homey.setInterval(() => {
      this.pollTuyaData().catch(() => {});
    }, 30000); // Poll every 30 seconds
  }

  async pollTuyaData() {
    try {
      // Request fresh data from all known DPs
      await this.readTuyaDataPoint('dp_1');
      await this.readTuyaDataPoint('dp_104');
      await this.readTuyaDataPoint('dp_109');
    } catch (err) {
      this.log('Poll failed:', err.message);
    }
  }

  async writeTuyaDataPoint(dp, value) {
    try {
      await this.zclNode.endpoints[1].clusters.manuSpecificTuya.writeDataPoint(dp, value);
    } catch (err) {
      this.error('Write DP failed:', err);
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

  registerTuyaCapabilityListener(capability, dp) {
    // Placeholder for capability mapping - implement based on actual device behavior
  }
}

module.exports = TuyaRadar24G;
