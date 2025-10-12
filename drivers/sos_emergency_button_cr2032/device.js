'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

/**
 * SOS Emergency Button CR2032 Device
 * v2.15.12 - Enhanced IAS Zone enrollment with fallback methods (2025-10-12)
 */
class SosEmergencyButtonCr2032Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('sos_emergency_button_cr2032 initialized');

    // Call parent
    await super.onNodeInit({ zclNode });

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('sos_emergency_button_cr2032');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    if (tuyaInitialized) {
      this.log('✅ Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('⚠️  No Tuya cluster found, using standard Zigbee');
      
      // Fallback to standard cluster handling
      await this.registerStandardCapabilities(zclNode);
    }

    // Mark device as available
    await this.setAvailable();
  }

  /**
   * Register standard Zigbee capabilities (fallback)
   */
  async registerStandardCapabilities(zclNode) {
    // Battery - IMPROVED calculation
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => {
            this.log('Battery raw value:', value);
            // Smart calculation: check if value is already 0-100 or 0-200
            if (value <= 100) {
              // Already percentage (some Tuya devices)
              return Math.max(0, Math.min(100, value));
            } else {
              // Standard Zigbee 0-200 format
              return Math.max(0, Math.min(100, value / 2));
            }
          },
          getParser: value => {
            this.log('Battery raw value (get):', value);
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
              return Math.max(0, Math.min(100, value / 2));
            }
          }
        });
        this.log('✅ Battery capability registered with smart calculation');
      } catch (err) {
        this.log('Could not register battery capability:', err.message);
      }
    }

    // IAS Zone for button events (alarm_contact)
    if (this.hasCapability('alarm_contact')) {
      try {
        this.registerCapability('alarm_contact', CLUSTER.IAS_ZONE, {
          get: 'zoneStatus',
          report: 'zoneStatus',
          reportParser: value => {
            this.log('IAS Zone status:', value);
            // Bit 0 = alarm1 (button pressed)
            return (value & 1) === 1;
          }
        });
        
        // IAS Zone enrollment - FIXED v2.15.17
        // Use correct Homey Zigbee API methods
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          try {
            // Method 1: Write IAS CIE Address
            this.log('Writing IAS CIE address...');
            await endpoint.clusters.iasZone.writeAttributes({
              iasCieAddress: zclNode.ieeeAddress
            });
            this.log('✅ IAS CIE address written');
            
            // Method 2: Configure reporting for zone status
            await endpoint.clusters.iasZone.configureReporting({
              zoneStatus: {
                minInterval: 0,
                maxInterval: 300,
                minChange: 1
              }
            });
            this.log('✅ IAS Zone reporting configured');
            
            // Method 3: Listen for zone status change notifications
            endpoint.clusters.iasZone.on('zoneStatusChangeNotification', (payload) => {
              this.log('IAS Zone notification:', payload);
              if (this.hasCapability('alarm_contact')) {
                const isPressed = (payload.zoneStatus & 1) === 1;
                this.setCapabilityValue('alarm_contact', isPressed).catch(this.error);
              }
            });
            this.log('✅ IAS Zone listener registered');
            
          } catch (enrollErr) {
            this.log('IAS Zone enrollment failed:', enrollErr.message);
          }
        }
      } catch (err) {
        this.log('IAS Zone setup failed:', err.message);
      }
    }
  }

  async onDeleted() {
    this.log('sos_emergency_button_cr2032 deleted');
  }

}

module.exports = SosEmergencyButtonCr2032Device;
