'use strict';

const Homey = require('homey');

module.exports = class SelectDriverView {
  
  /**
   * Called when the view is shown
   */
  async onPairListDevices(data, callback) {
    try {
      // Get discovered device info
      const discoveredDevice = data.device;
      const deviceInfo = {
        manufacturerName: discoveredDevice.manufacturerName,
        productId: discoveredDevice.productId,
        modelId: discoveredDevice.modelId,
        endpoints: discoveredDevice.endpoints
      };

      // Find all matching drivers
      const candidates = await this.findCandidateDrivers(deviceInfo);

      if (candidates.length === 1) {
        // Only one match - use it directly
        callback(null, {
          skip: true,
          driver: candidates[0]
        });
      } else if (candidates.length > 1) {
        // Multiple matches - show selection UI
        callback(null, {
          skip: false,
          candidates: candidates,
          deviceInfo: deviceInfo
        });
      } else {
        // No matches - should not happen
        callback(new Error('No compatible drivers found'));
      }
      
    } catch (err) {
      callback(err);
    }
  }

  /**
   * Find all drivers that match the device fingerprint
   */
  async findCandidateDrivers(deviceInfo) {
    const candidates = [];
    const drivers = Homey.app.manifest.drivers;

    for (const driver of drivers) {
      if (this.matchesFingerprint(driver, deviceInfo)) {
        candidates.push({
          id: driver.id,
          name: driver.name.en || driver.name,
          description: this.getDriverDescription(driver),
          icon: driver.images?.small || '/app/com.dlnraja.tuya.zigbee/assets/icon.svg',
          specificity: this.calculateSpecificity(driver, deviceInfo)
        });
      }
    }

    // Sort by specificity (most specific first)
    candidates.sort((a, b) => b.specificity - a.specificity);

    return candidates;
  }

  /**
   * Check if driver matches device fingerprint
   */
  matchesFingerprint(driver, deviceInfo) {
    const zigbee = driver.zigbee;
    if (!zigbee) return false;

    // Check productId match
    const productIds = Array.isArray(zigbee.productId) ? zigbee.productId : [zigbee.productId];
    if (!productIds.includes(deviceInfo.productId)) return false;

    // Check manufacturerName if specified
    if (zigbee.manufacturerName) {
      const manufacturers = Array.isArray(zigbee.manufacturerName) ? zigbee.manufacturerName : [zigbee.manufacturerName];
      if (manufacturers.length > 0 && !manufacturers.includes(deviceInfo.manufacturerName)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate specificity score (higher = more specific match)
   */
  calculateSpecificity(driver, deviceInfo) {
    let score = 0;

    const zigbee = driver.zigbee;
    
    // +10 for manufacturerName match
    if (zigbee.manufacturerName) {
      const manufacturers = Array.isArray(zigbee.manufacturerName) ? zigbee.manufacturerName : [zigbee.manufacturerName];
      if (manufacturers.includes(deviceInfo.manufacturerName)) {
        score += 10;
      }
    }

    // +5 for modelId match
    if (zigbee.modelId && zigbee.modelId === deviceInfo.modelId) {
      score += 5;
    }

    // +3 for endpoint count match
    const driverEndpoints = Object.keys(zigbee.endpoints || {}).length;
    const deviceEndpoints = Object.keys(deviceInfo.endpoints || {}).length;
    if (driverEndpoints === deviceEndpoints) {
      score += 3;
    }

    // +1 base score
    score += 1;

    return score;
  }

  /**
   * Get human-readable driver description
   */
  getDriverDescription(driver) {
    const capabilities = driver.capabilities || [];
    const hasMultiEndpoint = Object.keys(driver.zigbee?.endpoints || {}).length > 1;
    
    if (capabilities.includes('measure_battery')) {
      return 'Battery-powered device';
    }
    if (hasMultiEndpoint) {
      return `Multi-outlet (${Object.keys(driver.zigbee.endpoints).length} ports)`;
    }
    if (capabilities.includes('measure_temperature')) {
      return 'Climate sensor';
    }
    if (capabilities.includes('alarm_motion')) {
      return 'Motion/presence sensor';
    }
    
    return driver.class || 'Generic device';
  }

  /**
   * Handle driver selection from UI
   */
  async onDriverSelected(selectedDriverId, callback) {
    try {
      this.log('[SELECT-DRIVER] User selected:', selectedDriverId);
      
      // Store selection for device creation
      this.selectedDriver = selectedDriverId;
      
      callback(null, { success: true });
    } catch (err) {
      callback(err);
    }
  }
};
