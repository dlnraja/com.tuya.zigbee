'use strict';

/**
 * P120 — smart_switch: migrate off bare ZigBeeDevice onto TuyaZigbeeDevice
 * for L14 safeSetCapabilityValue / anti-flood / mains hygiene.
 */
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

class smart_switch extends TuyaZigbeeDevice {
  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.printNode();

    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(() => {});
    }

    this.registerCapability('onoff', CLUSTER.ON_OFF);

    await zclNode.endpoints[1].clusters.basic.readAttributes([
      'manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus',
    ]).catch((err) => {
      this.error('Error when reading device attributes ', err);
    });
  }

  onDeleted() {
    this.log('Smart Switch removed');
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }
}

module.exports = smart_switch;
