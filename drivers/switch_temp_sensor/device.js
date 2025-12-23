'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// Tuya DP IDs for this device (from Z2M: dp 0x66=temp, 0x67=humidity)
const DP_TEMPERATURE = 102; // 0x66
const DP_HUMIDITY = 103;    // 0x67
const DP_CHILD_LOCK = 111;  // 0x6f

class SwitchTempSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Switch with Temperature Sensor device initialized');
    this.log('ManufacturerName:', this.getSetting('zb_manufacturer_name'));
    this.log('ModelId:', this.getSetting('zb_model_id'));

    // Register OnOff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
      });
    }

    // Try to register Tuya cluster for temperature/humidity
    await this._registerTuyaCluster(zclNode);

    // Set initial values if not set
    if (this.getCapabilityValue('measure_temperature') === null) {
      await this.setCapabilityValue('measure_temperature', 20).catch(this.error);
    }
    if (this.getCapabilityValue('measure_humidity') === null) {
      await this.setCapabilityValue('measure_humidity', 50).catch(this.error);
    }
  }

  async _registerTuyaCluster(zclNode) {
    try {
      // Check if Tuya cluster exists (cluster 0xEF00 = 61184)
      const tuyaCluster = zclNode.endpoints[1]?.clusters?.tuya ||
        zclNode.endpoints[1]?.clusters[61184] ||
        zclNode.endpoints[1]?.clusters['61184'];

      if (tuyaCluster) {
        this.log('Tuya cluster found, registering datapoint listener');

        tuyaCluster.on('response', this._handleTuyaResponse.bind(this));
        tuyaCluster.on('reporting', this._handleTuyaResponse.bind(this));
        tuyaCluster.on('datapoint', this._handleTuyaDatapoint.bind(this));
      } else {
        this.log('Tuya cluster not found, will use polling');
      }
    } catch (err) {
      this.error('Error registering Tuya cluster:', err);
    }
  }

  _handleTuyaResponse(data) {
    this.log('Tuya response:', JSON.stringify(data));
    if (data && data.dp !== undefined) {
      this._handleTuyaDatapoint(data);
    }
  }

  _handleTuyaDatapoint(data) {
    const { dp, value } = data;
    this.log(`Tuya DP ${dp}: ${value}`);

    switch (dp) {
      case DP_TEMPERATURE:
        // Temperature is usually in 0.1°C units
        const temp = typeof value === 'number' ? value / 10 : value;
        if (temp >= -40 && temp <= 80) {
          this.setCapabilityValue('measure_temperature', temp).catch(this.error);
          this.log(`Temperature: ${temp}°C`);
        }
        break;

      case DP_HUMIDITY:
        // Humidity is usually in % units
        const hum = typeof value === 'number' ? value : parseInt(value);
        if (hum >= 0 && hum <= 100) {
          this.setCapabilityValue('measure_humidity', hum).catch(this.error);
          this.log(`Humidity: ${hum}%`);
        }
        break;

      default:
        this.log(`Unknown DP ${dp}: ${value}`);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
  }

}

module.exports = SwitchTempSensorDevice;
