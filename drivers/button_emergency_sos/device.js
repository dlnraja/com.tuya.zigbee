'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/BatteryManagerV2');

/**
 * button_emergency_sos - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * SosEmergencyButtonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SosEmergencyButtonDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('SosEmergencyButtonDevice initializing...');
    
    // Initialize base FIRST (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    // THEN setup IAS Zone (zclNode now exists)
    await this.setupIasZone();
    
    this.log('SosEmergencyButtonDevice initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('SosEmergencyButtonDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
  /**
   * IAS Zone Enrollment for SOS Emergency Button
   * CRITICAL: Required for button press detection
   */
  async setupIasZone() {
    try {
      this.log('[SOS] Setting up IAS Zone for SOS button (SDK3 latest)...');
      
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint?.clusters?.iasZone) {
        this.log('[INFO] IAS Zone cluster not available on this device');
        return;
      }
      
      // Setup Zone Enroll Request listener (SDK3 property assignment)
      endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('[ENROLL] Zone Enroll Request received');
        
        try {
          await endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0,
            zoneId: 10
          });
          this.log('[OK] Zone Enroll Response sent');
        } catch (err) {
          this.error('Zone enroll response failed:', err.message);
        }
      };
      
      // Send proactive Zone Enroll Response (SDK3 official method)
      try {
        await endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });
        this.log('[OK] Proactive Zone Enroll Response sent');
      } catch (err) {
        this.log('[WARN] Proactive response failed (normal if device sleeping):', err.message);
      }
      
      // Setup Zone Status Change listener (SDK3 property assignment)
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
        this.log('[ALARM] SOS BUTTON PRESSED!', payload);
        
        // Trigger flow card
        if (this.driver.sosButtonPressedTrigger) {
          this.driver.sosButtonPressedTrigger.trigger(this, {}, {}).catch(this.error);
        }
        
        // Update capability
        if (this.hasCapability('alarm_generic')) {
          this.setCapabilityValue('alarm_generic', true).catch(this.error);
          
          // Auto-reset after 5 seconds
          setTimeout(() => {
            this.setCapabilityValue('alarm_generic', false).catch(this.error);
          }, 5000);
        }
      };
      
      // Also setup attribute listener (SDK3 property assignment)
      endpoint.clusters.iasZone.onZoneStatus = (zoneStatus) => {
        this.log('[ALARM] SOS Zone Status Changed:', zoneStatus);
        if (this.driver.sosButtonPressedTrigger) {
          this.driver.sosButtonPressedTrigger.trigger(this, {}, {}).catch(this.error);
        }
      };
      
      // Battery reporting
      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
          const battery = value / 2;
          this.log('[BATTERY] Battery:', battery, '%');
          if (this.hasCapability('measure_battery')) {
            await (async () => {
        this.log(`📝 [DIAG] setCapabilityValue: ${'measure_battery'} = ${battery}`);
        try {
          await this.setCapabilityValue('measure_battery', battery);
          this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_battery'}`);
        } catch (err) {
          this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_battery'}`, err.message);
          throw err;
        }
      })().catch(this.error);
          }
        });
        
        // Configure battery reporting
        await this.configureAttributeReporting([
          { endpointId: 1, cluster: 1, attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 }
        ]).catch(err => this.log('Battery reporting config (non-critical):', err.message));
      }
      
      this.log('[OK] SOS Button IAS Zone configured - READY');
      
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

}

module.exports = SosEmergencyButtonDevice;


module.exports = SosEmergencyButtonDevice;
