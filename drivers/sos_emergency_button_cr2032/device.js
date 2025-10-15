'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * SOS Emergency Button CR2032 Device
 * v2.15.83 - CLEAN VERSION - Fixes red error triangles reported by Cam
 */
class SosEmergencyButtonCr2032Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('sos_emergency_button_cr2032 initialized');
    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerStandardCapabilities(zclNode);

    await this.setAvailable();
  }

  async registerStandardCapabilities(zclNode) {
    // Battery capability
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => {
            this.log('Battery raw value:', value);
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
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
        this.log('✅ Battery capability registered');
      } catch (err) {
        this.log('Could not register battery capability:', err.message);
      }
    }

    // IAS Zone for SOS button - SDK3 FIXED
    if (this.hasCapability('alarm_generic')) {
      try {
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          this.log('🚨 Setting up SOS button IAS Zone...');
          
          // CRITICAL SDK3 FIX v2.15.97: Use correct method to get Homey IEEE address
          try {
            let homeyIeee = null;
            let ieeeBuffer = null;
            
            // Method 1: Try to read existing CIE address first (most reliable)
            if (endpoint.clusters.iasZone) {
              try {
                const attrs = await endpoint.clusters.iasZone.readAttributes(['iasCIEAddress']);
                if (attrs.iasCIEAddress) {
                  const hexStr = attrs.iasCIEAddress.toString('hex');
                  if (hexStr !== '0000000000000000' && hexStr.length === 16) {
                    this.log('📡 CIE already enrolled, using existing address:', hexStr);
                    ieeeBuffer = attrs.iasCIEAddress;
                    homeyIeee = hexStr.match(/.{2}/g).reverse().join(':');
                  }
                }
              } catch (e) {
                this.log('Could not read existing CIE address:', e.message);
              }
            }
            
            // Method 2: Try via zclNode bridgeId
            if (!ieeeBuffer && zclNode && zclNode._node && zclNode._node.bridgeId) {
              const bridgeId = zclNode._node.bridgeId;
              
              // CRITICAL FIX v2.15.97: Properly handle Buffer or string bridgeId
              if (Buffer.isBuffer(bridgeId) && bridgeId.length >= 8) {
                ieeeBuffer = bridgeId.length === 8 ? bridgeId : bridgeId.slice(0, 8);
                const hexBytes = [];
                for (let i = 0; i < ieeeBuffer.length; i++) {
                  hexBytes.push(ieeeBuffer[i].toString(16).padStart(2, '0'));
                }
                homeyIeee = hexBytes.join(':');
                this.log('📡 Homey IEEE from bridgeId (Buffer):', homeyIeee);
              } else if (typeof bridgeId === 'string' && bridgeId.length >= 16) {
                homeyIeee = bridgeId;
                this.log('📡 Homey IEEE from bridgeId (string):', homeyIeee);
                
                const ieeeClean = (typeof homeyIeee === 'string') ? 
                  homeyIeee.replace(/:/g, '').toLowerCase() : '';
                
                if (ieeeClean.length >= 16) {
                  const hexPairs = ieeeClean.substring(0, 16).match(/.{2}/g);
                  if (hexPairs && hexPairs.length === 8) {
                    ieeeBuffer = Buffer.from(hexPairs.reverse().join(''), 'hex');
                  }
                }
              }
            }
            
            // Final validation and enrollment
            if (ieeeBuffer && Buffer.isBuffer(ieeeBuffer) && ieeeBuffer.length === 8) {
              this.log('📡 Final IEEE Buffer (8 bytes):', ieeeBuffer.toString('hex'));
              
              // Write CIE Address
              await endpoint.clusters.iasZone.writeAttributes({
                iasCIEAddress: ieeeBuffer
              });
              this.log('✅ IAS CIE Address written successfully (SDK3 method)');
              
              // Wait for enrollment
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Verify enrollment
              const cieAddr = await endpoint.clusters.iasZone.readAttributes(['iasCIEAddress']);
              this.log('✅ Enrollment verified, CIE Address:', cieAddr.iasCIEAddress?.toString('hex'));
              
              // Configure zone type as emergency button (type 4)
              try {
                await endpoint.clusters.iasZone.writeAttributes({
                  zoneType: 4 // Emergency button type
                });
                this.log('✅ Zone type configured as emergency button (4)');
              } catch (zoneTypeErr) {
                this.log('Zone type configuration skipped:', zoneTypeErr.message);
              }
            } else {
              this.log('⚠️ Could not create valid IEEE Buffer, device may auto-enroll');
            }
          } catch (enrollErr) {
            this.log('⚠️ IAS Zone enrollment failed:', enrollErr.message);
            this.log('Device may auto-enroll or require manual pairing');
          }
          
          // Register notification listener
          endpoint.clusters.iasZone.on('zoneStatusChangeNotification', async (payload) => {
            this.log('🚨 SOS BUTTON NOTIFICATION:', payload);
            
            try {
              let buttonPressed = false;
              
              if (typeof payload.zoneStatus === 'object') {
                buttonPressed = payload.zoneStatus.alarm1 || payload.zoneStatus.alarm2 || false;
              } else if (typeof payload.zoneStatus === 'number') {
                buttonPressed = (payload.zoneStatus & 1) === 1;
              }
              
              if (buttonPressed) {
                this.log('🚨 SOS BUTTON PRESSED! ✅');
                await this.setCapabilityValue('alarm_generic', true);
                
                // Trigger flow - FIXED v2.15.92: Use correct flow card ID
                try {
                  const battery = this.getCapabilityValue('measure_battery') || 0;
                  const timestamp = new Date().toISOString();
                  
                  // Trigger BOTH flow cards for maximum compatibility
                  await this.triggerFlowCard('sos_button_emergency', {
                    battery: battery,
                    timestamp: timestamp
                  });
                  
                  await this.triggerFlowCard('safety_alarm_triggered', {
                    battery: battery,
                    timestamp: timestamp
                  });
                  
                  this.log('✅ SOS flow cards triggered successfully');
                } catch (flowErr) {
                  this.error('⚠️ Flow trigger error:', flowErr);
                }
                
                // Auto-reset after 5 seconds
                setTimeout(async () => {
                  await this.setCapabilityValue('alarm_generic', false);
                  this.log('✅ SOS alarm reset');
                }, 5000);
              }
            } catch (parseErr) {
              this.error('❌ SOS notification parse error:', parseErr);
            }
          });
          
          // Register capability
          this.registerCapability('alarm_generic', CLUSTER.IAS_ZONE, {
            get: 'zoneStatus',
            report: 'zoneStatus',
            reportParser: value => {
              this.log('🚨 SOS Button zone status:', value);
              return (value & 1) === 1;
            }
          });
          
          this.log('✅ SOS Button IAS Zone registered');
        }
      } catch (err) {
        this.error('❌ SOS Button IAS Zone setup failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('sos_emergency_button_cr2032 deleted');
  }

  // ========================================
  // FLOW METHODS - Auto-generated
  // ========================================

  async triggerFlowCard(cardId, tokens = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);
      await flowCard.trigger(this, tokens);
      this.log(`✅ Flow triggered: ${cardId}`, tokens);
    } catch (err) {
      this.error(`❌ Flow trigger error: ${cardId}`, err);
    }
  }

  async checkAnyAlarm() {
    const capabilities = this.getCapabilities();
    for (const cap of capabilities) {
      if (cap.startsWith('alarm_')) {
        const value = this.getCapabilityValue(cap);
        if (value === true) return true;
      }
    }
    return false;
  }

  getContextData() {
    const context = {
      time_of_day: this.getTimeOfDay(),
      timestamp: new Date().toISOString()
    };
    
    const caps = this.getCapabilities();
    if (caps.includes('measure_luminance')) {
      context.luminance = this.getCapabilityValue('measure_luminance') || 0;
    }
    if (caps.includes('measure_temperature')) {
      context.temperature = this.getCapabilityValue('measure_temperature') || 0;
    }
    if (caps.includes('measure_humidity')) {
      context.humidity = this.getCapabilityValue('measure_humidity') || 0;
    }
    if (caps.includes('measure_battery')) {
      context.battery = this.getCapabilityValue('measure_battery') || 0;
    }
    
    return context;
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }
}

module.exports = SosEmergencyButtonCr2032Device;
