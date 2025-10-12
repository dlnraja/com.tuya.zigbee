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

    // IAS Zone for button events - ENHANCED v2.15.32
    // Use alarm_generic instead of alarm_contact for SOS button
    if (this.hasCapability('alarm_generic')) {
      try {
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          this.log('🚨 Setting up SOS button IAS Zone...');
          
          // CRITICAL: Write IAS CIE Address for enrollment with retry
          let cieWritten = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await endpoint.clusters.iasZone.writeAttributes({
                iasCieAddress: zclNode.ieeeAddr
              });
              this.log(`✅ IAS CIE address written (attempt ${attempt})`);
              cieWritten = true;
              break;
            } catch (err) {
              this.log(`⚠️ IAS CIE write attempt ${attempt} failed:`, err.message);
              if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }
            }
          }
          
          if (!cieWritten) {
            this.log('⚠️ IAS CIE address write failed after 3 attempts');
          }
          
          // Configure reporting with retry
          let reportingConfigured = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await endpoint.clusters.iasZone.configureReporting({
                zoneStatus: {
                  minInterval: 0,
                  maxInterval: 300,
                  minChange: 1
                }
              });
              this.log(`✅ IAS Zone reporting configured (attempt ${attempt})`);
              reportingConfigured = true;
              break;
            } catch (err) {
              this.log(`⚠️ IAS reporting config attempt ${attempt} failed:`, err.message);
              if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }
            }
          }
          
          if (!reportingConfigured) {
            this.log('⚠️ IAS reporting not configured, relying on notifications');
          }
          
          // CRITICAL: Listen for button press notifications
          endpoint.clusters.iasZone.on('zoneStatusChangeNotification', async (payload) => {
            this.log('🚨 SOS BUTTON PRESSED! Notification:', JSON.stringify(payload));
            
            // Trigger alarm on any zone status change
            if (payload.zoneStatus && (payload.zoneStatus.alarm1 || payload.zoneStatus.alarm2 || (payload.zoneStatus & 1) === 1)) {
              await this.setCapabilityValue('alarm_generic', true);
              this.log('✅ SOS alarm triggered!');
              
              // Trigger flow card for automation
              if (this.homey.flow) {
                try {
                  await this.homey.flow.getDeviceTriggerCard('sos_button_pressed')?.trigger(this, {}, {}).catch(() => {});
                } catch (flowErr) {
                  this.log('Flow trigger failed:', flowErr.message);
                }
              }
              
              // Auto-reset after 5 seconds
              setTimeout(async () => {
                await this.setCapabilityValue('alarm_generic', false);
                this.log('✅ SOS alarm reset');
              }, 5000);
            }
          });
          
          // Register capability for reading
          this.registerCapability('alarm_generic', CLUSTER.IAS_ZONE, {
            get: 'zoneStatus',
            report: 'zoneStatus',
            reportParser: value => {
              this.log('🚨 SOS Button zone status:', value);
              return (value & 1) === 1;
            }
          });
          
          this.log('✅ SOS Button IAS Zone registered with notification listener');
        }
      } catch (err) {
        this.error('❌ SOS Button IAS Zone setup failed:', err);
      }
    } else if (this.hasCapability('alarm_contact')) {
      // Fallback to alarm_contact if alarm_generic not available
      try {
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          endpoint.clusters.iasZone.on('zoneStatusChangeNotification', async (payload) => {
            this.log('SOS Button contact notification:', payload);
            if (payload.zoneStatus && (payload.zoneStatus.alarm1 || payload.zoneStatus.alarm2)) {
              await this.setCapabilityValue('alarm_contact', true);
              setTimeout(async () => {
                await this.setCapabilityValue('alarm_contact', false);
              }, 5000);
            }
          });
          
          this.registerCapability('alarm_contact', CLUSTER.IAS_ZONE, {
            get: 'zoneStatus',
            report: 'zoneStatus',
            reportParser: value => {
              this.log('SOS Button status:', value);
              return (value & 1) === 1;
            }
          });
          this.log('✅ SOS Button registered (alarm_contact fallback)');
        }
      } catch (err) {
        this.error('SOS Button fallback failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('sos_emergency_button_cr2032 deleted');
  }

}

module.exports = SosEmergencyButtonCr2032Device;
