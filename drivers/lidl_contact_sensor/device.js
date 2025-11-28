'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class LidlContactSensorDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('Lidl Contact Sensor initializing...');

    if (zclNode.endpoints[1]?.clusters?.iasZone) {
      zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (payload) => {
        const open = (payload.zoneStatus & 0x01) === 1;
        this.log(`[LIDL] Contact: ${open ? 'open' : 'closed'}`);
        this.setCapabilityValue('alarm_contact', open).catch(this.error);
      });
    }

    if (zclNode.endpoints[1]?.clusters?.genPowerCfg) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.round(value / 2)
      });
    }

    this.log('Lidl Contact Sensor initialized');
  }
}

module.exports = LidlContactSensorDevice;
