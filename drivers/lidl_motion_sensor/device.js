'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class LidlMotionSensorDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('Lidl Motion Sensor initializing...');

    // IAS Zone for motion
    if (zclNode.endpoints[1]?.clusters?.iasZone) {
      zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (payload) => {
        const motion = (payload.zoneStatus & 0x01) === 1;
        this.log(`[LIDL] Motion: ${motion}`);
        this.setCapabilityValue('alarm_motion', motion).catch(this.error);

        // Trigger flow
        if (motion) {
          this.driver.triggerFlow({ id: 'lidl_motion_detected' }, this, {}).catch(this.error);
        } else {
          this.driver.triggerFlow({ id: 'lidl_motion_cleared' }, this, {}).catch(this.error);
        }
      });
    }

    // Battery
    if (zclNode.endpoints[1]?.clusters?.genPowerCfg) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.round(value / 2)
      });
    }

    this.log('Lidl Motion Sensor initialized');
  }
}

module.exports = LidlMotionSensorDevice;
