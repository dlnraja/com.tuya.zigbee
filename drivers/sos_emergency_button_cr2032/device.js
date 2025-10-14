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
          
          // SDK3 correct method to get Homey IEEE address
          const ieee = zclNode?.bridgeId;
          
          if (ieee) {
            this.log('📡 Homey IEEE address:', ieee);
            
            // Convert to proper format
            // FIX: Ensure ieee is a string
            const ieeeString = String(ieee || '');
            const ieeeClean = ieeeString.replace(/:/g, '').toLowerCase();
            const ieeeBuffer = Buffer.from(ieeeClean.match(/.{2}/g).reverse().join(''), 'hex');
            
            // Write CIE Address
            await endpoint.clusters.iasZone.writeAttributes({
              iasCIEAddress: ieeeBuffer
            });
            this.log('✅ IAS CIE Address written successfully');
            
            // Wait for enrollment
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            this.log('⚠️ Cannot get Homey IEEE, device may auto-enroll');
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
                
                // Trigger flow
                try {
                  const battery = this.getCapabilityValue('measure_battery') || 0;
                  const timestamp = new Date().toISOString();
                  
                  await this.triggerFlowCard('alarm_triggered', {
                    battery: battery,
                    timestamp: timestamp
                  });
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
