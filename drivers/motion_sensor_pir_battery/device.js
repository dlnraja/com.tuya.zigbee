'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class MotionSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Motion sensor initialized');

    // IAS Zone Enrollment (CRITICAL for motion detection)
    if (this.hasCapability('alarm_motion')) {
      try {
        this.iasZoneEnroller = new IASZoneEnroller(this, this.zclNode.endpoints[1], {
          capability: 'alarm_motion',
          zoneType: 13, // Motion sensor
          autoResetTimeout: 30000 // 30 seconds
        });
        
        const enrollResult = await this.iasZoneEnroller.enroll(zclNode);
        this.log('IAS Zone enrollment:', enrollResult);
      } catch (err) {
        this.error('IAS Zone enrollment failed:', err);
      }
    }

    // Register battery capability
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => value / 2,
        getOpts: {
          getOnStart: true,
        },
      });
    }

    // Mark device as available
    await this.setAvailable();
  }

  async onDeleted() {
    this.log('Motion sensor deleted');
    
    if (this.iasZoneEnroller) {
      this.iasZoneEnroller.destroy();
    }
  }

}

module.exports = MotionSensorDevice;
