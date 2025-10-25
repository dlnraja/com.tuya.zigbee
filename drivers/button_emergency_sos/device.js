'use strict';

const ButtonDevice = require('../../lib/ButtonDevice');

/**
 * SosEmergencyButtonDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class SosEmergencyButtonDevice extends ButtonDevice {

  async onNodeInit() {
    // Critical: IAS Zone for SOS detection
    await this.setupIasZone();

    this.log('SosEmergencyButtonDevice initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit().catch(err => this.error(err));
    
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
      this.log('🆘 Setting up IAS Zone for SOS button...');
      
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint?.clusters?.ssIasZone) {
        this.error('IAS Zone cluster not found');
        return;
      }
      
      // Get Homey's IEEE address
      const ieeeAddress = await this.homey.zigbee.getIeeeAddress();
      this.log('Homey IEEE Address:', ieeeAddress);
      
      // Write CIE Address (enroll Homey as the IAS Zone coordinator)
      await endpoint.clusters.ssIasZone.writeAttributes({
        iasCieAddr: ieeeAddress
      });
      
      this.log('✅ IAS Zone CIE address written');
      
      // Register for zone status change notifications (DUAL listeners)
      endpoint.clusters.ssIasZone.on('zoneStatusChangeNotification', async (data) => {
        this.log('🚨 SOS BUTTON PRESSED!', data);
        
        // Trigger flow card
        if (this.driver.sosButtonPressedTrigger) {
          await this.driver.sosButtonPressedTrigger.trigger(this, {}, {}).catch(this.error);
        }
        
        // Update capability
        if (this.hasCapability('alarm_generic')) {
          await this.setCapabilityValue('alarm_generic', true).catch(this.error);
          
          // Auto-reset after 5 seconds
          setTimeout(async () => {
            await this.setCapabilityValue('alarm_generic', false).catch(this.error);
          }, 5000);
        }
      });
      
      // Also register attribute listener (backup)
      endpoint.clusters.ssIasZone.on('attr.zoneStatus', async (value) => {
        this.log('🚨 SOS Zone Status Changed:', value);
        if (this.driver.sosButtonPressedTrigger) {
          await this.driver.sosButtonPressedTrigger.trigger(this, {}, {}).catch(this.error);
        }
      });
      
      // Battery reporting
      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
          const battery = value / 2;
          this.log('🔋 Battery:', battery, '%');
          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        });
        
        // Configure battery reporting
        await this.configureAttributeReporting([
          { endpointId: 1, cluster: 1, attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 }
        ]).catch(err => this.log('Battery reporting config (non-critical):', err.message));
      }
      
      this.log('✅ SOS Button IAS Zone configured - READY');
      
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

}

module.exports = SosEmergencyButtonDevice;
