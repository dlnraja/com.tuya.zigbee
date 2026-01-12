'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Smart Circuit Breaker Device (MCB/RCBO)
 *
 * Features: On/Off, Trip alarm, Energy monitoring
 * DP mappings vary by manufacturer
 */
class SmartBreakerDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Smart Breaker initializing...');

    // Register on/off
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF);
    }

    // Setup Tuya DP cluster
    await this._setupTuyaDP(zclNode);

    // Setup electrical measurement
    await this._setupElectricalMeasurement(zclNode);

    this.log('Smart Breaker initialized');
  }

  async _setupElectricalMeasurement(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const emCluster = ep1.clusters?.electricalMeasurement || ep1.clusters?.[2820];
    if (emCluster) {
      if (this.hasCapability('measure_power')) {
        emCluster.on('attr.activePower', (value) => {
          this.setCapabilityValue('measure_power', value / 10).catch(this.error);
        });
      }
      if (this.hasCapability('measure_voltage')) {
        emCluster.on('attr.rmsVoltage', (value) => {
          this.setCapabilityValue('measure_voltage', value / 10).catch(this.error);
        });
      }
      if (this.hasCapability('measure_current')) {
        emCluster.on('attr.rmsCurrent', (value) => {
          this.setCapabilityValue('measure_current', value / 1000).catch(this.error);
        });
      }
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    this.log('[TUYA] DP cluster found');

    tuyaCluster.on('response', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('reporting', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('datapoint', (dp, value) => this._handleDP(dp, value));
  }

  _handleDP(dp, value) {
    if (dp === undefined) return;
    this.log(`[DP${dp}] = ${value}`);

    switch (dp) {
      case 1: // On/Off
      case 16:
        this.setCapabilityValue('onoff', !!value).catch(this.error);
        break;

      case 9: // Fault/Trip alarm
      case 26:
        if (this.hasCapability('alarm_generic')) {
          this.setCapabilityValue('alarm_generic', !!value).catch(this.error);
        }
        break;

      case 17: // Current (mA)
      case 20:
        if (this.hasCapability('measure_current')) {
          this.setCapabilityValue('measure_current', value / 1000).catch(this.error);
        }
        break;

      case 18: // Power (W)
        if (this.hasCapability('measure_power')) {
          this.setCapabilityValue('measure_power', value).catch(this.error);
        }
        break;

      case 19: // Voltage (V * 10)
        if (this.hasCapability('measure_voltage')) {
          this.setCapabilityValue('measure_voltage', value / 10).catch(this.error);
        }
        break;

      case 101: // Energy (kWh * 100)
        if (this.hasCapability('meter_power')) {
          this.setCapabilityValue('meter_power', value / 100).catch(this.error);
        }
        break;
    }
  }
}

module.exports = SmartBreakerDevice;
