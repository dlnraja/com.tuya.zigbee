'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

/**
 * P124 — TuyaZigbeeDevice (L14) + mainsPowered strip phantom battery
 */
class socket_power_strip_four_three extends TuyaZigbeeDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.printNode();

    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(() => {});
    }

    const { subDeviceId } = this.getData();
    this.log('Device data: ', subDeviceId);

    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: subDeviceId === 'socket2' ? 2 : subDeviceId === 'socket3' ? 3 : subDeviceId === 'socket4' ? 4 : 1,
    });

    if (!this.isSubDevice()) {
      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch((err) => {
          this.error('Error when reading device attributes ', err);
        });
    }
  }

  onDeleted() {
    this.log('Power Strip removed');
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }
}

module.exports = socket_power_strip_four_three;
