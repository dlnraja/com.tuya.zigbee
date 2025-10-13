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

    // IAS Zone for button events - CRITICAL FIX v2.15.71 SDK3
    // Fixed: Use CORRECT Homey SDK3 API for IAS Zone enrollment
    if (this.hasCapability('alarm_generic')) {
      try {
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          this.log('🚨 Setting up SOS button IAS Zone...');
          
          // CRITICAL SDK3 FIX: Use correct method to get Homey IEEE address
          try {
            // Get Homey's IEEE address from zclNode (SDK3 correct method)
            let homeyIeee = null;
            
            // Method 1: Try via zclNode
            if (zclNode && zclNode._node && zclNode._node.bridgeId) {
              homeyIeee = zclNode._node.bridgeId;
              this.log('📡 Homey IEEE from bridgeId:', homeyIeee);
            }
            
            // Method 2: Try via endpoint clusters
            if (!homeyIeee && endpoint.clusters.iasZone) {
              try {
                const attrs = await endpoint.clusters.iasZone.readAttributes(['iasCIEAddress']);
                if (attrs.iasCIEAddress && attrs.iasCIEAddress.toString('hex') !== '0000000000000000') {
                  this.log('📡 CIE already enrolled, using existing address');
                  homeyIeee = attrs.iasCIEAddress.toString('hex').match(/.{2}/g).reverse().join(':');
                }
              } catch (e) {
                this.log('Could not read existing CIE address:', e.message);
              }
            }
            
            if (homeyIeee) {
              this.log('📡 Homey IEEE address:', homeyIeee);
              
              // Convert IEEE address to Buffer (reverse byte order for Zigbee)
              const ieeeClean = homeyIeee.replace(/:/g, '').toLowerCase();
              const ieeeBuffer = Buffer.from(ieeeClean.match(/.{2}/g).reverse().join(''), 'hex');
              this.log('📡 IEEE Buffer:', ieeeBuffer.toString('hex'));
              
              // SDK3 Correct Method: writeAttributes with iasCIEAddress
              await endpoint.clusters.iasZone.writeAttributes({
                iasCIEAddress: ieeeBuffer
              });
              this.log('✅ IAS CIE Address written successfully (SDK3 method)');
              
              // Wait for enrollment to complete
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Verify enrollment
              const cieAddr = await endpoint.clusters.iasZone.readAttributes(['iasCIEAddress']);
              this.log('✅ Enrollment verified, CIE Address:', cieAddr.iasCIEAddress?.toString('hex'));
            } else {
              throw new Error('Could not obtain Homey IEEE address');
            }
          } catch (enrollErr) {
            this.log('⚠️ IAS Zone enrollment failed:', enrollErr.message);
            this.log('Device may auto-enroll or require manual pairing');
          }
          
          // Skip configureReporting - many Tuya IAS devices don't support it
          // Instead, rely purely on zoneStatusChangeNotification
          
          // CRITICAL: Listen for button press notifications (v2.15.50 enhanced)
          endpoint.clusters.iasZone.on('zoneStatusChangeNotification', async (payload) => {
            this.log('🚨 ===== SOS BUTTON NOTIFICATION RECEIVED =====');
            this.log('Full payload:', JSON.stringify(payload));
            
            try {
              // Parse zoneStatus - handle both object and number formats
              let buttonPressed = false;
              
              if (typeof payload.zoneStatus === 'object') {
                buttonPressed = payload.zoneStatus.alarm1 || payload.zoneStatus.alarm2 || false;
                this.log('ZoneStatus (object):', payload.zoneStatus);
              } else if (typeof payload.zoneStatus === 'number') {
                buttonPressed = (payload.zoneStatus & 1) === 1;
                this.log('ZoneStatus (number):', payload.zoneStatus, '→ pressed:', buttonPressed);
              } else {
                this.log('⚠️ Unknown zoneStatus type:', typeof payload.zoneStatus);
              }
              
              if (buttonPressed) {
                this.log('🚨 SOS BUTTON PRESSED! ✅');
                await this.setCapabilityValue('alarm_generic', true).catch(this.error);
                
                // Trigger flow card for automation
                if (this.homey && this.homey.flow) {
                  try {
                    const triggerCard = this.homey.flow.getDeviceTriggerCard('sos_button_pressed');
                    if (triggerCard) {
                      await triggerCard.trigger(this, {}, {});
                      this.log('✅ Flow card triggered');
                    }
                  } catch (flowErr) {
                    this.log('⚠️ Flow trigger failed:', flowErr.message);
                  }
                }
                
                // Auto-reset after 5 seconds
                setTimeout(async () => {
                  await this.setCapabilityValue('alarm_generic', false).catch(this.error);
                  this.log('✅ SOS alarm reset');
                }, 5000);
              }
            } catch (parseErr) {
              this.error('❌ SOS notification parse error:', parseErr);
            }
          });
          
          // ADDITIONAL: Also listen for standard attribute reports as fallback
          endpoint.clusters.iasZone.on('attr.zoneStatus', async (value) => {
            this.log('🚨 SOS Button attribute report (fallback):', value);
            const buttonPressed = typeof value === 'number' ? (value & 1) === 1 : false;
            if (buttonPressed) {
              await this.setCapabilityValue('alarm_generic', true).catch(this.error);
              
              // Trigger flow
              if (this.homey && this.homey.flow) {
                try {
                  const triggerCard = this.homey.flow.getDeviceTriggerCard('sos_button_pressed');
                  if (triggerCard) await triggerCard.trigger(this, {}, {});
                } catch (flowErr) {
                  this.log('Flow trigger failed:', flowErr.message);
                }
              }
              
              // Auto-reset
              setTimeout(async () => {
                await this.setCapabilityValue('alarm_generic', false).catch(this.error);
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
