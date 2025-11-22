'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/BatteryManagerV2');

/**
 * button_wireless - Hybrid-Enhanced Driver
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
const { CLUSTER } = require('zigbee-clusters');

/**
 * UNIVERSAL WIRELESS BUTTON DRIVER
 * Auto-détecte: nombre de boutons, type de batterie
 * Supporte: 1-8 boutons, CR2032/CR2450/AAA/AA
 */
class UniversalWirelessButtonDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    // Initialize hybrid base (power detection)
    await super.onNodeInit({ zclNode });

    this.log('[SYNC] Initializing Universal Wireless Button');
    
    try {
      // ==========================================
      // STEP 1: DETECT BUTTON COUNT
      // ==========================================
      const buttonCount = await this.detectButtonCount(zclNode).catch(err => this.error(err));
      this.log(`[OK] Detected ${buttonCount} button(s)`);
      await this.setStoreValue('button_count', buttonCount).catch(err => this.error(err));
      
      // ==========================================
      // STEP 2: DETECT POWER TYPE & BATTERY
      // ==========================================
      const hasBattery = await this.detectBattery(zclNode).catch(err => this.error(err));
      this.log(`[OK] Battery powered: ${hasBattery}`);
      await this.setStoreValue('has_battery', hasBattery).catch(err => this.error(err));
      
      // ==========================================
      // STEP 3: SETUP CAPABILITIES DYNAMICALLY
      // ==========================================
      await this.setupDynamicCapabilities(buttonCount, hasBattery).catch(err => this.error(err));
      
      // ==========================================
      // STEP 4: CONFIGURE CLUSTERS
      // ==========================================
      if (hasBattery) {
        await this.configureBatteryReporting(zclNode).catch(err => this.error(err));
      }
      
      await this.configureButtonClusters(zclNode, buttonCount).catch(err => this.error(err));
      
      this.log('[OK] Universal Wireless Button initialized successfully');
      
    } catch (err) {
      this.error('Initialization error:', err);
    }
  }
  
  /**
   * Détecte automatiquement le nombre de boutons
   */
  async detectButtonCount(zclNode) {
    // Check user setting first
    const settingCount = this.getSetting('button_count');
    if (settingCount && settingCount !== 'auto') {
      return parseInt(settingCount);
    }
    
    // Auto-detect: count endpoints with onOff cluster
    let count = 0;
    for (let i = 1; i <= 8; i++) {
      if (zclNode.endpoints[i]?.clusters?.onOff) {
        count++;
      }
    }
    
    this.log(`Auto-detected ${count} button(s) from endpoints`);
    return count || 1; // Default to 1
  }
  
  /**
   * Détecte si le device a une batterie
   */
  async detectBattery(zclNode) {
    try {
      const endpoint = zclNode.endpoints[1];
      if (!endpoint?.clusters?.powerConfiguration) {
        return false;
      }
      
      // Try to read battery percentage
      const result = await endpoint.clusters.powerConfiguration
        .readAttributes(['batteryPercentageRemaining'])
        .catch(() => null);
      
      if (result?.batteryPercentageRemaining !== undefined) {
        this.log('Battery detected via powerConfiguration cluster');
        return true;
      }
      
    } catch (err) {
      this.log('No battery detected:', err.message);
    }
    
    return false;
  }
  
  /**
   * Configure les capabilities dynamiquement
   */
  async setupDynamicCapabilities(buttonCount, hasBattery) {
    this.log(`Setting up capabilities: ${buttonCount} buttons, battery: ${hasBattery}`);
    
    // Remove all existing button capabilities first
    const existingCaps = this.getCapabilities();
    for (const cap of existingCaps) {
      if (cap.startsWith('button')) {
        await this.removeCapability(cap).catch(() => {});
      }
    }
    
    // Add button capabilities based on count
    for (let i = 1; i <= buttonCount; i++) {
      const capId = i === 1 ? 'button' : `button.button${i}`;
      
      if (!this.hasCapability(capId)) {
        await this.addCapability(capId).catch(err => this.error(err));
        this.log(`Added capability: ${capId}`);
      }
      
      // Set initial value
      await this.setCapabilityValue(capId, false).catch(this.error);
    }
    
    // Battery capability
    if (hasBattery) {
      if (!this.hasCapability('measure_battery')) {
        await this.addCapability('measure_battery').catch(err => this.error(err));
        this.log('Added capability: measure_battery');
      }
    } else {
      if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery').catch(err => this.error(err));
        this.log('Removed capability: measure_battery (no battery)');
      }
    }
  }
  
  /**
   * Configure battery reporting
   */
  async configureBatteryReporting(zclNode) {
    try {
      const endpoint = zclNode.endpoints[1];
      
      // Register capability listener
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        endpoint: 1,
        get: 'batteryPercentageRemaining',
        reportParser: value => {
          const percentage = Math.round(value / 2);
          this.log(`Battery: ${percentage}%`);
          
          // Check low battery threshold
          const threshold = this.getSetting('battery_threshold') || 20;
          if (percentage <= threshold) {
            this.log(`[WARN] Low battery: ${percentage}% (threshold: ${threshold}%)`);
          }
          
          return percentage;
        },
        report: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true,
          pollInterval: 3600000 // 1 hour
        }
      });
      
      // Configure reporting
      await endpoint.clusters.powerConfiguration.configureReporting({
        batteryPercentageRemaining: {
          minInterval: 3600,     // 1 hour
          maxInterval: 65535,    // ~18 hours
          minChange: 2           // 1% change
        }
      }).catch(err => {
        this.log('Battery reporting config failed (may not be supported):', err.message);
      });
      
      this.log('[OK] Battery reporting configured');
      
    } catch (err) {
      this.error('Battery configuration error:', err);
    }
  }
  
  /**
   * Configure button clusters
   */
  async configureButtonClusters(zclNode, buttonCount) {
    for (let i = 1; i <= buttonCount; i++) {
      const endpoint = zclNode.endpoints[i];
      if (!endpoint?.clusters?.onOff) continue;
      
      const capId = i === 1 ? 'button' : `button.button${i}`;
      
      this.log(`Configuring button ${i} (${capId})`);
      
      // On command = button pressed
      endpoint.clusters.onOff.on('commandOn', async () => {
        this.log(`Button ${i} PRESSED`);
        await this.setCapabilityValue(capId, true).catch(this.error);
        
        // Auto-reset after 100ms
        setTimeout(async () => {
          await this.setCapabilityValue(capId, false).catch(this.error);
        }, 100);
      });
      
      // Off command = button released (some devices)
      endpoint.clusters.onOff.on('commandOff', async () => {
        this.log(`Button ${i} released`);
        await this.setCapabilityValue(capId, false).catch(this.error);
      });
      
      // Toggle command (some devices use this)
      endpoint.clusters.onOff.on('commandToggle', async () => {
        this.log(`Button ${i} toggled`);
        await this.setCapabilityValue(capId, true).catch(this.error);
        
        setTimeout(async () => {
          await this.setCapabilityValue(capId, false).catch(this.error);
        }, 100);
      });
    }
  }
  
  /**
   * Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    
    // If button count changed, reconfigure
    if (changedKeys.includes('button_count')) {
      const newCount = newSettings.button_count === 'auto' 
        ? await this.detectButtonCount(this.zclNode)
        : parseInt(newSettings.button_count);
      
      const hasBattery = this.getStoreValue('has_battery');
      await this.setupDynamicCapabilities(newCount, hasBattery).catch(err => this.error(err));
      await this.configureButtonClusters(this.zclNode, newCount).catch(err => this.error(err));
      
      this.log(`Button count updated to: ${newCount}`);
    }
    
    // Battery type change (for display only)
    if (changedKeys.includes('battery_type')) {
      this.log(`Battery type updated to: ${newSettings.battery_type}`);
    }
  }

}

module.exports = UniversalWirelessButtonDevice;


module.exports = UniversalWirelessButtonDevice;
