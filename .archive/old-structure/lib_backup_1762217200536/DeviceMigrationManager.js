'use strict';

/**
 * DEVICE MIGRATION MANAGER
 * 
 * Migrates existing devices to new capability structure
 * Runs when:
 * - Device updates to new app version
 * - User changes settings
 * - Device reconnects after being offline
 * 
 * SOLVES:
 * - Devices paired before DynamicCapabilityManager don't have all capabilities
 * - USB 2-gang shows only 1 button (paired before v4.9.122)
 * - Temperature/humidity sensors show empty values
 */

const DynamicCapabilityManager = require('./DynamicCapabilityManager');

const CAPABILITY_VERSION = '2.0'; // Version with DynamicCapabilityManager

class DeviceMigrationManager {
  
  constructor(device) {
    this.device = device;
  }

  /**
   * Check if migration is needed and execute
   */
  async checkAndMigrate(zclNode) {
    if (!zclNode) {
      this.device.log('[MIGRATION] ⚠️  No zclNode available, skipping migration');
      return false;
    }

    const currentVersion = this.device.getStoreValue('capability_version');
    
    if (currentVersion === CAPABILITY_VERSION) {
      this.device.log(`[MIGRATION] ✅ Device already on version ${CAPABILITY_VERSION}`);
      return false;
    }

    this.device.log('[MIGRATION] 🔄 Migration needed...');
    this.device.log(`[MIGRATION] Current version: ${currentVersion || 'none'}`);
    this.device.log(`[MIGRATION] Target version: ${CAPABILITY_VERSION}`);

    try {
      await this.migrateToV2(zclNode);
      
      // Update version
      await this.device.setStoreValue('capability_version', CAPABILITY_VERSION);
      
      this.device.log('[MIGRATION] ✅ Migration complete!');
      return true;
      
    } catch (err) {
      this.device.error('[MIGRATION] ❌ Migration failed:', err.message);
      return false;
    }
  }

  /**
   * Migrate to version 2.0 (DynamicCapabilityManager)
   */
  async migrateToV2(zclNode) {
    this.device.log('[MIGRATION] Starting v2.0 migration (Dynamic Capabilities)...');
    
    // Step 1: Log current capabilities
    const currentCapabilities = this.device.getCapabilities();
    this.device.log(`[MIGRATION] Current capabilities (${currentCapabilities.length}):`, currentCapabilities.join(', '));
    
    // Step 2: Run dynamic capability discovery
    this.device.log('[MIGRATION] Running dynamic capability discovery...');
    const dynamicManager = new DynamicCapabilityManager(this.device);
    await dynamicManager.inspectAndCreateCapabilities(zclNode);
    
    // Step 3: Log new capabilities
    const newCapabilities = this.device.getCapabilities();
    this.device.log(`[MIGRATION] New capabilities (${newCapabilities.length}):`, newCapabilities.join(', '));
    
    // Step 4: Identify added capabilities
    const addedCapabilities = newCapabilities.filter(cap => !currentCapabilities.includes(cap));
    if (addedCapabilities.length > 0) {
      this.device.log(`[MIGRATION] ✅ Added ${addedCapabilities.length} new capabilities:`, addedCapabilities.join(', '));
    } else {
      this.device.log('[MIGRATION] No new capabilities added (already up to date)');
    }
    
    // Step 5: Force read all values
    this.device.log('[MIGRATION] Force reading all current values...');
    await this.forceReadAllValues(zclNode);
    
    this.device.log('[MIGRATION] ✅ v2.0 migration complete');
  }

  /**
   * Force read all values from device
   */
  async forceReadAllValues(zclNode) {
    const capabilities = this.device.getCapabilities();
    let successCount = 0;
    let failCount = 0;
    
    for (const capabilityId of capabilities) {
      try {
        const baseCapability = capabilityId.split('.')[0];
        const endpointNum = capabilityId.includes('.') ? parseInt(capabilityId.split('.')[1]) : 1;
        
        const endpoint = zclNode.endpoints[endpointNum];
        if (!endpoint) continue;
        
        // Map capability to cluster and attribute
        const clusterConfig = this.getClusterForCapability(baseCapability);
        if (!clusterConfig) continue;
        
        const cluster = endpoint.clusters[clusterConfig.clusterName];
        if (!cluster || typeof cluster.readAttributes !== 'function') continue;
        
        // Read value
        const result = await cluster.readAttributes([clusterConfig.attribute]);
        let value = result[clusterConfig.attribute];
        
        // Process value
        if (clusterConfig.process) {
          value = clusterConfig.process(value);
        }
        
        // Set capability value
        await this.device.setCapabilityValue(capabilityId, value);
        this.device.log(`[MIGRATION] 📖 ${capabilityId} = ${value}`);
        
        successCount++;
        
      } catch (err) {
        this.device.log(`[MIGRATION] ⚠️  Failed to read ${capabilityId}:`, err.message);
        failCount++;
      }
    }
    
    this.device.log(`[MIGRATION] Read complete: ${successCount} success, ${failCount} failed`);
  }

  /**
   * Map capability to cluster configuration
   */
  getClusterForCapability(baseCapability) {
    const mapping = {
      'onoff': {
        clusterName: 'onOff',
        attribute: 'onOff',
        process: (v) => v
      },
      'dim': {
        clusterName: 'levelControl',
        attribute: 'currentLevel',
        process: (v) => v / 254
      },
      'measure_temperature': {
        clusterName: 'temperatureMeasurement',
        attribute: 'measuredValue',
        process: (v) => v / 100
      },
      'measure_humidity': {
        clusterName: 'relativeHumidity',
        attribute: 'measuredValue',
        process: (v) => v / 100
      },
      'measure_battery': {
        clusterName: 'powerConfiguration',
        attribute: 'batteryPercentageRemaining',
        process: (v) => v / 2
      },
      'measure_luminance': {
        clusterName: 'illuminanceMeasurement',
        attribute: 'measuredValue',
        process: (v) => Math.pow(10, (v - 1) / 10000)
      },
      'measure_pressure': {
        clusterName: 'pressureMeasurement',
        attribute: 'measuredValue',
        process: (v) => v
      },
      'measure_power': {
        clusterName: 'electricalMeasurement',
        attribute: 'activePower',
        process: (v) => v / 10
      },
      'meter_power': {
        clusterName: 'metering',
        attribute: 'currentSummationDelivered',
        process: (v) => v / 1000
      }
    };
    
    return mapping[baseCapability];
  }

  /**
   * Trigger migration on settings change
   */
  async onSettings({ oldSettings, newSettings, changedKeys }, zclNode) {
    // If user changes any setting, trigger migration check
    if (changedKeys.length > 0) {
      this.device.log('[MIGRATION] Settings changed, checking for migration...');
      await this.checkAndMigrate(zclNode);
    }
  }
}

module.exports = DeviceMigrationManager;
