'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

// Energy scaling divisors — ZCL pass-through (Homey approximation / SmartDivisor on DP paths)
const ENERGY_DIVISORS = {
  measure_power: { divisor: 1 },
  meter_power: { divisor: 1 },
  measure_current: { divisor: 1 },
  measure_voltage: { divisor: 1 },
};

/**
 * P124 — TuyaZigbeeDevice (L14) + mainsPowered
 */
class doublepowerpoint2 extends TuyaZigbeeDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.printNode();

    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(() => {});
    }

    const { subDeviceId } = this.getData();
    this.log('Device data: ', subDeviceId);

    const endpoint = subDeviceId === 'socketTwo' ? 2 : 1;

    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint,
      getOpts: {
        getOnStart: true,
        getOnOnline: true,
      },
    });

    if (!this.isSubDevice()) {
      try {
        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus']);
        this.log('Basic attributes read successfully');
      } catch (err) {
        this.error('Error when reading device attributes:', err);
      }
    }

    try {
      await zclNode.endpoints[endpoint].clusters.onOff.configureReporting({
        attribute: 'onOff',
        minimumReportInterval: 1,
        maximumReportInterval: 600,
        reportableChange: 1,
      });
      this.log('Configured instant reporting for onOff');
    } catch (error) {
      this.error('Failed to configure onOff reporting, setting up fallback polling', error);
      this.setCapabilityOptions('onoff', {
        getOpts: {
          getOnStart: true,
          pollInterval: 60000,
        },
      });
    }
  }

  onDeleted() {
    this.log('Double Power Point removed');
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }
}

module.exports = doublepowerpoint2;
