'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * DIN Rail Switch Device
 *
 * Smart circuit breaker / DIN rail switch with energy monitoring
 * Supports on/off control and power measurement
 */
class DinRailSwitchDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('DIN Rail Switch initializing...');

    // Register on/off capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF);
    }

    // Setup electrical measurement
    await this._setupElectricalMeasurement(zclNode);

    // Setup Tuya DP cluster for TS0601 devices
    await this._setupTuyaDP(zclNode);

    this.log('DIN Rail Switch initialized');
  }

  async _setupElectricalMeasurement(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const emCluster = ep1.clusters?.electricalMeasurement || ep1.clusters?.[2820];
    if (emCluster) {
      this.log('[EM] Electrical Measurement cluster found');

      if (this.hasCapability('measure_power')) {
        emCluster.on('attr.activePower', (value) => {
          const power = value / 10;
          this.setCapabilityValue('measure_power', power).catch(this.error);
        });
      }

      if (this.hasCapability('measure_voltage')) {
        emCluster.on('attr.rmsVoltage', (value) => {
          const voltage = value / 10;
          this.setCapabilityValue('measure_voltage', voltage).catch(this.error);
        });
      }

      if (this.hasCapability('measure_current')) {
        emCluster.on('attr.rmsCurrent', (value) => {
          const current = value / 1000;
          this.setCapabilityValue('measure_current', current).catch(this.error);
        });
      }
    }

    const meteringCluster = ep1.clusters?.metering || ep1.clusters?.[1794];
    if (meteringCluster && this.hasCapability('meter_power')) {
      meteringCluster.on('attr.currentSummationDelivered', (value) => {
        const energy = value / 1000;
        this.setCapabilityValue('meter_power', energy).catch(this.error);
      });
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    this.log('[TUYA] Tuya DP cluster found');

    tuyaCluster.on('response', (response) => {
      this._handleTuyaDP(response);
    });

    tuyaCluster.on('reporting', (report) => {
      this._handleTuyaDP(report);
    });
  }

  _handleTuyaDP(data) {
    if (!data || !data.dp) return;
    const { dp, value } = data;

    this.log(`[DP${dp}] Value: ${value}`);

    switch (dp) {
      case 1: // On/Off state
      case 16:
        this.setCapabilityValue('onoff', !!value).catch(this.error);
        break;

      case 17: // Total current (A * 1000)
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

module.exports = DinRailSwitchDevice;
