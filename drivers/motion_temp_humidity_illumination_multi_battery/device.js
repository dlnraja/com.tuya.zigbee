'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class MotionTempHumidityIlluminationSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('motion_temp_humidity_illumination_sensor initialized');

    // Register standard capabilities
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
    this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY);
    this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT);
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);
    
    // Register motion alarm with IAS Zone
    this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
      endpoint: 1
    });

    // Enroll IAS Zone for motion detection
    try {
      await IASZoneEnroller.enroll(this, zclNode);
      this.log('✅ IAS Zone enrolled successfully');
    } catch (err) {
      this.error('IAS Zone enrollment failed:', err);
    }

    await this.setAvailable();
  }

}

module.exports = MotionTempHumidityIlluminationSensorDevice;
