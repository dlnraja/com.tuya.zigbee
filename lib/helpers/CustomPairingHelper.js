'use strict';

/**
 * CustomPairingHelper - Universal helper for custom pairing views
 * 
 * Handles driver selection when multiple drivers match same device fingerprint
 * Compatible with Homey SDK3 official Custom Pairing Views API
 * 
 * SDK3 COMPLIANT: No require('homey'), uses this.homey from driver
 */

class CustomPairingHelper {
  
  constructor(driver) {
    this.driver = driver;
    this.homey = driver.homey;
  }

  /**
   * Setup custom pairing handlers in onPair()
   * Call this from driver.js onPair() method
   */
  setupPairingHandlers(session) {
    // Store discovered device for later
    let discoveredDevice = null;
    let candidateDrivers = [];

    // Handler: list_devices
    session.setHandler('list_devices', async () => {
      try {
        // Get discovered devices
        const devices = await this.driver.onPairListDevices();
        
        if (!devices || devices.length === 0) {
          return [];
        }

        // For each device, find matching drivers
        for (const device of devices) {
          const candidates = await this.findMatchingDrivers(device);
          
          // Store for custom view
          device._candidates = candidates;
          device._needsSelection = candidates.length > 1;
        }

        return devices;
        
      } catch (err) {
        this.driver.error('[CUSTOM_PAIR] list_devices error:', err);
        throw err;
      }
    });

    // Handler: showView (detect when custom view is shown)
    session.setHandler('showView', async (viewId) => {
      this.driver.log('[CUSTOM_PAIR] View:', viewId);

      if (viewId === 'select_driver') {
        // Get stored device data
        const devices = await session.getStoreValue('discovered_devices');
        
        if (devices && devices.length > 0) {
          discoveredDevice = devices[0];
          candidateDrivers = discoveredDevice._candidates || [];

          // Send data to frontend
          await session.emit('candidates', candidateDrivers);
          await session.emit('device_info', {
            manufacturerName: discoveredDevice.manufacturerName || 'Unknown',
            productId: discoveredDevice.productId || 'Unknown',
            modelId: discoveredDevice.modelId || 'N/A',
            endpoints: discoveredDevice.endpoints || {},
            ieee: discoveredDevice.data?.id || 'Unknown'
          });

          this.driver.log('[CUSTOM_PAIR] Sent candidates:', candidateDrivers.length);
        }
      }
    });

    // Handler: driver_selected (user chose a driver)
    session.setHandler('driver_selected', async (driverId) => {
      this.driver.log('[CUSTOM_PAIR] User selected driver:', driverId);
      
      // Store selection
      await session.setStoreValue('selected_driver', driverId);
      
      return { success: true, driverId };
    });

    // Handler: get_device (for add_devices template)
    session.setHandler('add_device', async (device) => {
      const selectedDriver = await session.getStoreValue('selected_driver');
      
      if (selectedDriver) {
        // Override driver ID
        device.driverId = selectedDriver;
      }

      return device;
    });
  }

  /**
   * Find all drivers matching device fingerprint
   */
  async findMatchingDrivers(device) {
    const candidates = [];
    const allDrivers = this.homey.drivers.getDrivers();

    this.driver.log('[CUSTOM_PAIR] Finding drivers for:', {
      manufacturer: device.manufacturerName,
      productId: device.productId
    });

    for (const [driverId, driver] of Object.entries(allDrivers)) {
      try {
        const manifest = driver.manifest;
        
        if (!manifest.zigbee) continue;

        // Check productId match
        const productIds = Array.isArray(manifest.zigbee.productId) 
          ? manifest.zigbee.productId 
          : [manifest.zigbee.productId];

        if (!productIds.includes(device.productId)) continue;

        // Check manufacturerName if specified
        if (manifest.zigbee.manufacturerName) {
          const manufacturers = Array.isArray(manifest.zigbee.manufacturerName)
            ? manifest.zigbee.manufacturerName
            : [manifest.zigbee.manufacturerName];

          if (manufacturers.length > 0 && !manufacturers.includes(device.manufacturerName)) {
            continue;
          }
        }

        // Calculate specificity score
        const score = this.calculateSpecificity(manifest, device);

        candidates.push({
          id: driverId,
          name: manifest.name?.en || manifest.name || driverId,
          description: this.getDriverDescription(manifest),
          class: manifest.class,
          score: score,
          endpoints: Object.keys(manifest.zigbee.endpoints || {}).length,
          capabilities: manifest.capabilities || []
        });

      } catch (err) {
        this.driver.error('[CUSTOM_PAIR] Error checking driver', driverId, err);
      }
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    this.driver.log('[CUSTOM_PAIR] Found', candidates.length, 'matching drivers');

    return candidates;
  }

  /**
   * Calculate driver specificity score
   */
  calculateSpecificity(manifest, device) {
    let score = 0;

    // +40 for exact manufacturerName match
    if (manifest.zigbee.manufacturerName) {
      const manufacturers = Array.isArray(manifest.zigbee.manufacturerName)
        ? manifest.zigbee.manufacturerName
        : [manifest.zigbee.manufacturerName];
      
      if (manufacturers.includes(device.manufacturerName)) {
        score += 40;
      } else if (manufacturers.length > 0) {
        score += 10; // Partial credit for having manufacturerName specified
      }
    }

    // +30 for exact modelId match
    if (manifest.zigbee.modelId && manifest.zigbee.modelId === device.modelId) {
      score += 30;
    }

    // +10 for endpoint count match
    const manifestEndpoints = Object.keys(manifest.zigbee.endpoints || {}).length;
    const deviceEndpoints = Object.keys(device.endpoints || {}).length;
    
    if (manifestEndpoints === deviceEndpoints) {
      score += 10;
    } else if (Math.abs(manifestEndpoints - deviceEndpoints) === 1) {
      score += 5;
    }

    // +5 for having multiple manufacturers (more specific)
    if (manifest.zigbee.manufacturerName && Array.isArray(manifest.zigbee.manufacturerName)) {
      if (manifest.zigbee.manufacturerName.length >= 3) {
        score += 5;
      }
    }

    // Base score
    score += 1;

    return score;
  }

  /**
   * Get human-readable driver description
   */
  getDriverDescription(manifest) {
    const caps = manifest.capabilities || [];
    const endpoints = Object.keys(manifest.zigbee?.endpoints || {}).length;
    
    // Battery powered
    if (caps.includes('measure_battery')) {
      return '🔋 Battery-powered device';
    }
    
    // Multi-endpoint
    if (endpoints > 1) {
      return `🔌 ${endpoints}-port device`;
    }
    
    // Sensors
    if (caps.includes('measure_temperature') || caps.includes('measure_humidity')) {
      return '🌡️ Climate sensor';
    }
    
    if (caps.includes('alarm_motion')) {
      return '👁️ Motion sensor';
    }
    
    if (caps.includes('alarm_contact')) {
      return '🚪 Contact sensor';
    }
    
    // Power
    if (caps.includes('measure_power') || caps.includes('meter_power')) {
      return '⚡ Power monitoring';
    }
    
    // Default
    return manifest.class || 'Generic device';
  }

  /**
   * Check if device needs custom pairing view
   */
  async needsCustomPairing(device) {
    const candidates = await this.findMatchingDrivers(device);
    return candidates.length > 1;
  }
}

module.exports = CustomPairingHelper;
