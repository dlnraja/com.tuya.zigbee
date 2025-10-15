'use strict';

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
