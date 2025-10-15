'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

/**
 * SOS Emergency Button CR2032 Device
 * v2.15.98 - Multi-method IAS Zone enrollment with automatic fallback
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

    // IAS Zone for SOS button - v2.15.98 Multi-method with automatic fallback
    if (this.hasCapability('alarm_generic')) {
      try {
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          this.log('🚨 Setting up SOS button IAS Zone with multi-method enrollment...');
          
          // Create IAS Zone enroller with automatic fallback
          this.iasZoneEnroller = new IASZoneEnroller(this, endpoint, {
            zoneType: 4, // Emergency button type
            capability: 'alarm_generic',
            flowCard: 'sos_button_emergency',
            flowTokens: {
              battery: this.getCapabilityValue('measure_battery') || 0,
              timestamp: new Date().toISOString()
            },
            autoResetTimeout: 5000, // 5 seconds auto-reset
            pollInterval: 30000, // 30s polling if needed
            enablePolling: true
          });
          
          // Try all enrollment methods automatically
          const enrollMethod = await this.iasZoneEnroller.enroll(zclNode);
          
          if (enrollMethod) {
            this.log(`✅ SOS Button IAS Zone enrolled successfully via: ${enrollMethod}`);
            this.log('📊 Enrollment status:', this.iasZoneEnroller.getStatus());
            
            // Register capability for reading
            this.registerCapability('alarm_generic', CLUSTER.IAS_ZONE, {
              get: 'zoneStatus',
              report: 'zoneStatus',
              reportParser: value => {
                this.log('🚨 SOS Button zone status:', value);
                return (value & 1) === 1;
              }
            });
            
            this.log('✅ SOS Button IAS Zone fully configured with automatic fallback');
          } else {
            this.error('❌ All SOS Button enrollment methods failed');
          }
        }
      } catch (err) {
        this.error('❌ SOS Button IAS Zone setup failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('sos_emergency_button_cr2032 deleted');
    
    // Cleanup IAS Zone enroller
    if (this.iasZoneEnroller) {
      this.iasZoneEnroller.destroy();
      this.iasZoneEnroller = null;
    }
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
