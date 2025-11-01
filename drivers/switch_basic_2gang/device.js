'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * Switch2gangDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class Switch2gangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    try {
      // Sanity checks
      if (!zclNode) {
        this.log('[ERROR] onNodeInit: missing zclNode');
        return;
      }

      this.log('Switch2gangDevice initializing...');
      
      // CRITICAL: Set gang count BEFORE parent init
      this.gangCount = 2;
      
      // Initialize base FIRST (auto power detection + dynamic capabilities)
      await super.onNodeInit({ zclNode }).catch(err => this.error(err));
      
      // THEN setup multi-endpoint (zclNode now exists)
      await this.setupMultiEndpoint();
      
      // Safe set available
      if (typeof this._safeResolveAvailable === 'function') {
        this._safeResolveAvailable(true);
      } else if (typeof this.setAvailable === 'function') {
        this.setAvailable();
      }
      
      this.log('Switch2gangDevice initialized - Power source:', this.powerSource || 'unknown');
    } catch (err) {
      this.log('[ERROR] onNodeInit outer catch:', err);
      if (typeof this._safeRejectAvailable === 'function') {
        this._safeRejectAvailable(err);
      }
    }
  }

  async onDeleted() {
    this.log('Switch2gangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
  /**
   * Setup Multi-Endpoint Control for 2-Gang Switch
   * Endpoint 1: Gang 1, Endpoint 2: Gang 2
   * Plus energy monitoring if available
   */
  async setupMultiEndpoint() {
    try {
      this.log('[POWER] Setting up multi-endpoint control...');
      
      // Gang 2 handled by parent SwitchDevice.setupSwitchControl()
      // No need for manual setup here - parent handles all gangs automatically
      this.log('[POWER] Gang 2 configured by parent SwitchDevice');
      
      // Energy monitoring (if available on endpoint 1)
      const endpoint1 = this.zclNode.endpoints[1];
      
      if (endpoint1?.clusters?.seMetering) {
        endpoint1.clusters.seMetering.on('attr.currentSummationDelivered', async (value) => {
          const energy = value / 100; // Convert to kWh
          this.log('⚡ Energy:', energy, 'kWh');
          if (this.hasCapability('meter_power')) {
            await this.setCapabilityValue('meter_power', energy).catch(this.error);
          }
        });
        
        // Configure energy reporting
        await this.configureAttributeReporting([
          { endpointId: 1, cluster: 1794, attributeName: 'currentSummationDelivered', minInterval: 60, maxInterval: 3600, minChange: 1 }
        ]).catch(err => this.log('Energy reporting config (non-critical):', err.message));
      }
      
      if (endpoint1?.clusters?.haElectricalMeasurement) {
        // Power listener
        endpoint1.clusters.haElectricalMeasurement.on('attr.activePower', async (value) => {
          const power = value; // Watts
          this.log('⚡ Power:', power, 'W');
          if (this.hasCapability('measure_power')) {
            await this.setCapabilityValue('measure_power', power).catch(this.error);
          }
        });
        
        // Voltage listener
        endpoint1.clusters.haElectricalMeasurement.on('attr.rmsVoltage', async (value) => {
          const voltage = value;
          this.log('⚡ Voltage:', voltage, 'V');
          if (this.hasCapability('measure_voltage')) {
            await this.setCapabilityValue('measure_voltage', voltage).catch(this.error);
          }
        });
        
        // Current listener
        endpoint1.clusters.haElectricalMeasurement.on('attr.rmsCurrent', async (value) => {
          const current = value / 1000; // Convert mA to A
          this.log('⚡ Current:', current, 'A');
          if (this.hasCapability('measure_current')) {
            await this.setCapabilityValue('measure_current', current).catch(this.error);
          }
        });
        
        // Configure electrical measurement reporting
        await this.configureAttributeReporting([
          { endpointId: 1, cluster: 2820, attributeName: 'activePower', minInterval: 5, maxInterval: 60, minChange: 1 },
          { endpointId: 1, cluster: 2820, attributeName: 'rmsVoltage', minInterval: 60, maxInterval: 3600, minChange: 1 },
          { endpointId: 1, cluster: 2820, attributeName: 'rmsCurrent', minInterval: 5, maxInterval: 60, minChange: 1 }
        ]).catch(err => this.log('Electrical reporting config (non-critical):', err.message));
      }
      
      this.log('[OK] Multi-endpoint control configured');
      
    } catch (err) {
      this.error('Multi-endpoint setup failed:', err);
    }
  }

}

module.exports = Switch2gangDevice;
