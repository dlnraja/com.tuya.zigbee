const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING CORRUPTED DEVICE FILES\n');

// Template complet motion_temp_humidity_illumination_multi_battery
const motionTemplate = `'use strict';

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
`;

// Template complet sos_emergency_button_cr2032
const sosTemplate = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class SOSEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('sos_emergency_button_cr2032 initialized');

    // Register battery capability
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);
    
    // Register SOS alarm with IAS Zone
    this.registerCapability('alarm_generic', CLUSTER.IAS_ZONE, {
      endpoint: 1
    });

    // Enroll IAS Zone for SOS button
    try {
      await IASZoneEnroller.enroll(this, zclNode);
      this.log('✅ IAS Zone enrolled successfully');
    } catch (err) {
      this.error('IAS Zone enrollment failed:', err);
    }

    await this.setAvailable();
  }

}

module.exports = SOSEmergencyButtonDevice;
`;

// Fix motion sensor
const motionPath = path.join(__dirname, 'drivers', 'motion_temp_humidity_illumination_multi_battery', 'device.js');
fs.writeFileSync(motionPath, motionTemplate);
console.log('✅ Fixed motion_temp_humidity_illumination_multi_battery/device.js');

// Fix SOS button
const sosPath = path.join(__dirname, 'drivers', 'sos_emergency_button_cr2032', 'device.js');
fs.writeFileSync(sosPath, sosTemplate);
console.log('✅ Fixed sos_emergency_button_cr2032/device.js');

console.log('\n✅ ALL DEVICE FILES FIXED!\n');
