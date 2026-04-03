'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Pool/Spa Pump Controller Device
 *
 * High-power relay for pool equipment control
 */
class PoolPumpDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Pool Pump Controller initializing...');

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF);
    }

    await this._setupElectricalMeasurement(zclNode);
    await this._setupTuyaDP(zclNode);

    this.log('Pool Pump Controller initialized');
  }

  async _setupElectricalMeasurement(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const emCluster = ep1.clusters?.electricalMeasurement || ep1.clusters?.[2820];
    if (emCluster && this.hasCapability('measure_power')) {
      emCluster.on('attr.activePower', (value) => {
        this.setCapabilityValue('measure_power', value / 10).catch(this.error);
      });
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    tuyaCluster.on('response', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('reporting', (r) => this._handleDP(r?.dp, r?.value));
  }

  _handleDP(dp, value) {
    if (dp === undefined) return;
    this.log(`[DP${dp}] = ${value}`);

    switch (dp) {
      case 1:
      case 16:
        this.setCapabilityValue('onoff', !!value).catch(this.error);
        break;
      case 18:
        if (this.hasCapability('measure_power')) {
          this.setCapabilityValue('measure_power', value).catch(this.error);
        }
        break;
      case 101:
        if (this.hasCapability('meter_power')) {
          this.setCapabilityValue('meter_power', value / 100).catch(this.error);
        }
        break;
    }
  }
}

module.exports = PoolPumpDevice;
