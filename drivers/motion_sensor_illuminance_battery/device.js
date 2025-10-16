'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class MotionSensorIlluminanceBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Motion sensor with illuminance initialized');

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

    // Register illuminance (lux) capability
    if (this.hasCapability('measure_luminance')) {
      this.registerCapability('measure_luminance', 1024, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => {
          // Convert to lux using logarithmic formula
          return Math.pow(10, (value - 1) / 10000);
        },
        getOpts: {
          getOnStart: true,
        },
      });
    }

    // Register battery capability
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 1, {
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
    this.log('Motion sensor with illuminance deleted');
    
    if (this.iasZoneEnroller) {
      this.iasZoneEnroller.destroy();
    }
  }

}

module.exports = MotionSensorIlluminanceBatteryDevice;
