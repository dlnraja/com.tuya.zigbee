'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class SOSEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('sos_emergency_button_cr2032 initialized');

    // Battery
    this.registerCapability('measure_battery', 1, {
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
      const endpoint = zclNode.endpoints[1];
      const enroller = new IASZoneEnroller(this, endpoint, {
        zoneType: 21, // Emergency button
        capability: 'alarm_generic',
        pollInterval: 30000,
        autoResetTimeout: 0 // No auto-reset for SOS
      });
      const method = await enroller.enroll(zclNode);
      this.log(`✅ SOS IAS Zone enrolled via: ${method}`);
      
      // Add robust listener for alarm_generic
      this.registerCapabilityListener('alarm_generic', async (value) => {
        this.log('🚨 SOS Button pressed! Alarm:', value);
        
        // Trigger flow card
        const triggerId = value ? 'sos_button_pressed' : 'sos_button_released';
        try {
          await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this);
          this.log(`✅ Flow triggered: ${triggerId}`);
        } catch (error) {
          this.error('Flow trigger error:', error.message);
        }
      });
      
      // Direct IAS Zone status notification handler
      if (endpoint.clusters.iasZone) {
        endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
          this.log('🚨 IAS Zone Status Notification:', payload);
          
          const alarm = (payload.zoneStatus & 0x01) !== 0;
          this.setCapabilityValue('alarm_generic', alarm).catch(this.error);
        };
      }
      
    } catch (err) {
      this.error('IAS Zone enrollment failed:', err);
      this.log('⚠️ Device may auto-enroll or work without explicit enrollment');
    }

    await this.setAvailable();
  }

}

module.exports = SOSEmergencyButtonDevice;
