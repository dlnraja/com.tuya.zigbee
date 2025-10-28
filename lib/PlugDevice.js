'use strict';

const BaseHybridDevice = require('./BaseHybridDevice');

/**
 * PlugDevice - Base class for smart plugs
 * Handles onoff control and power measurement
 * Automatically detects available power capabilities (voltage, current, power, energy)
 * Auto-detects if plug is AC-powered (almost always) or has battery backup
 */
class PlugDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit({ zclNode });
    
    // Setup plug-specific functionality
    await this.setupPlugControl();
    
    this.log('PlugDevice ready');
  }

  /**
   * Setup plug control and power monitoring
   */
  async setupPlugControl() {
    this.log('[POWER] Setting up plug control...');
    
    // Register onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        return await this.onCapabilityOnoff(value);
      });
      
      this.registerCapability('onoff', this.CLUSTER.ON_OFF);
      this.log('[OK] On/Off control registered');
    }
    
    // Setup power monitoring if available
    await this.setupPowerMonitoring();
    
    this.log('[OK] Plug control configured');
  }

  /**
   * Setup power monitoring
   */
  async setupPowerMonitoring() {
    // Check if device supports power measurement
    const hasVoltage = this.hasCapability('measure_voltage');
    const hasCurrent = this.hasCapability('measure_current');
    const hasPower = this.hasCapability('measure_power');
    const hasEnergy = this.hasCapability('meter_power');
    
    if (hasPower || hasEnergy) {
      this.log('[DATA] Power monitoring available');
      
      if (hasPower) {
        this.registerCapability('measure_power', this.CLUSTER.ELECTRICAL_MEASUREMENT);
        this.log('[OK] Power measurement registered');
      }
      
      if (hasEnergy) {
        this.registerCapability('meter_power', this.CLUSTER.METERING);
        this.log('[OK] Energy metering registered');
      }
      
      if (hasVoltage) {
        this.registerCapability('measure_voltage', this.CLUSTER.ELECTRICAL_MEASUREMENT);
        this.log('[OK] Voltage measurement registered');
      }
      
      if (hasCurrent) {
        this.registerCapability('measure_current', this.CLUSTER.ELECTRICAL_MEASUREMENT);
        this.log('[OK] Current measurement registered');
      }
    } else {
      this.log('[WARN]  No power monitoring available');
    }
  }

  /**
   * Handle onoff capability
   */
  async onCapabilityOnoff(value) {
    this.log(`Setting plug to ${value ? 'ON' : 'OFF'}`);
    
    try {
      if (value) {
        await this.zclNode.endpoints[1].clusters.onOff.setOn();
      } else {
        await this.zclNode.endpoints[1].clusters.onOff.setOff();
      }
      
      return true;
    } catch (err) {
      this.error('Failed to toggle plug:', err.message);
      throw new Error(this.homey.__('errors.command_failed'));
    }
  }
}

module.exports = PlugDevice;
