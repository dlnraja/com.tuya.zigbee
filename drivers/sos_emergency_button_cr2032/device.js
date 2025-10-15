'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class SOSEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('sos_emergency_button_cr2032 initialized');

    // Battery
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      getOpts: {
        getOnStart: true
      },
      reportParser: value => {
        this.log('Battery raw value:', value);
        return value / 2;
      }
    });
    this.log('✅ Battery capability registered');
    
    // SOS Button IAS Zone
    this.log('🚨 Setting up SOS button IAS Zone...');
    try {
      await IASZoneEnroller.enroll(this, zclNode);
    } catch (err) {
      this.error('IAS Zone enrollment failed:', err);
      this.log('⚠️ Cannot get Homey IEEE, device may auto-enroll');
    }
    
    this.registerCapability('alarm_generic', CLUSTER.IAS_ZONE, {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => {
        this.log('🚨 SOS Button zone status:', value);
        return value.alarm1;
      }
    });
    
    // Listen for zone status change notifications
    if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters.iasZone) {
      zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', data => {
        this.log('🚨 SOS BUTTON PRESSED! Zone status:', data);
        this.setCapabilityValue('alarm_generic', data.zoneStatus.alarm1).catch(this.error);
      });
    }
    
    this.log('✅ SOS Button IAS Zone registered');

    await this.setAvailable();
  }

}

module.exports = SOSEmergencyButtonDevice;
