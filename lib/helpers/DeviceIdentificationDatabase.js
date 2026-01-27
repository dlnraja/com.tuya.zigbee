'use strict';

/**
 * DeviceIdentificationDatabase - Automatic & Intelligent Device ID Enrichment
 *
 * Scans ALL drivers and builds a comprehensive database of:
 * - Manufacturer IDs by device type
 * - Product IDs by device type
 * - Driver mappings
 *
 * Features:
 * - 100% AUTONOMOUS - No manual maintenance
 * - LIVE UPDATES - Rescans on app start
 * - INTELLIGENT MATCHING - Multiple criteria
 * - COMPREHENSIVE - Uses ALL driver data
 *
 * IMPORTANT: Uses Homey API instead of fs for compatibility
 */
class DeviceIdentificationDatabase {

  constructor(homey) {
    this.homey = homey;
    this.database = {
      manufacturerIds: {},      // { deviceType: [ids...] }
      productIds: {},           // { deviceType: [ids...] }
      driverMappings: {},       // { manufacturerName: driverId }
      deviceClasses: {},        // { driverId: class }
      capabilities: {},         // { driverId: [capabilities...] }
      lastUpdate: null
    };

    this.log = homey.log.bind(homey);
    this.error = homey.error.bind(homey);
  }

  /**
   * Build complete database by scanning ALL drivers using Homey API
   * NOTE: Drivers may not be fully loaded during app.onInit()
   * This method will be called again lazily when needed
   */
  async buildDatabase() {
    // Silent build - only log result

    const startTime = Date.now();
    let scannedDrivers = 0;
    let totalManufacturerIds = 0;
    let totalProductIds = 0;

    try {
      // Use Homey API to get all drivers
      // NOTE: During onInit(), drivers may not be loaded yet - this is normal
      const drivers = this.homey.drivers.getDrivers();
      const driverIds = Object.keys(drivers);

      // If no drivers found, schedule multiple rebuilds to ensure drivers load
      if (driverIds.length === 0) {
        this.log('⏳ [ID DATABASE] No drivers loaded yet, scheduling rebuilds...');
        // Try multiple times with increasing delays
        setTimeout(() => this._rebuildAfterDriversLoaded(), 5000);   // 5s
        setTimeout(() => this._rebuildAfterDriversLoaded(), 15000);  // 15s
        setTimeout(() => this._rebuildAfterDriversLoaded(), 30000);  // 30s
      }

      // Silent driver count

      // Scan each driver
      for (const driverId of driverIds) {
        try {
          const driver = drivers[driverId];
          const driverData = await this._scanDriver(driver, driverId);

          if (driverData) {
            scannedDrivers++;

            // Add to database
            const deviceType = this._detectDeviceType(driverId, driverData);

            // Store manufacturer IDs
            if (driverData.manufacturerNames && driverData.manufacturerNames.length > 0) {
              if (!this.database.manufacturerIds[deviceType]) {
                this.database.manufacturerIds[deviceType] = new Set();
              }
              driverData.manufacturerNames.forEach(id => {
                this.database.manufacturerIds[deviceType].add(id);
                totalManufacturerIds++;
              });
            }

            // Store product IDs
            if (driverData.productIds && driverData.productIds.length > 0) {
              if (!this.database.productIds[deviceType]) {
                this.database.productIds[deviceType] = new Set();
              }
              driverData.productIds.forEach(id => {
                this.database.productIds[deviceType].add(id);
                totalProductIds++;
              });
            }

            // Store driver mappings
            this.database.driverMappings[driverId] = {
              deviceType,
              class: driverData.class,
              capabilities: driverData.capabilities,
              manufacturerNames: driverData.manufacturerNames,
              productIds: driverData.productIds
            };

            this.database.deviceClasses[driverId] = driverData.class;
            this.database.capabilities[driverId] = driverData.capabilities;
          }
        } catch (error) {
          // Skip driver on error, continue with others
          this.error(`⚠️  [ID DATABASE] Error scanning driver ${driverId}:`, error.message);
        }
      }

      // Convert Sets to Arrays for easier use
      for (const deviceType in this.database.manufacturerIds) {
        this.database.manufacturerIds[deviceType] = Array.from(this.database.manufacturerIds[deviceType]);
      }
      for (const deviceType in this.database.productIds) {
        this.database.productIds[deviceType] = Array.from(this.database.productIds[deviceType]);
      }

      this.database.lastUpdate = new Date();

      const duration = Date.now() - startTime;

      // Minimal log - database is internal cache only, does NOT affect Homey driver pairing
      this.log(`✅ [ID DATABASE] Ready: ${scannedDrivers} drivers, ${totalManufacturerIds} mfr IDs (${duration}ms)`);

    } catch (error) {
      this.error('❌ [ID DATABASE] Failed to build database:', error);
    }
  }

  /**
   * Scan a single driver and extract identification data using Homey API
   */
  async _scanDriver(driver, driverId) {
    try {
      // Get driver manifest
      const manifest = driver.manifest;

      if (!manifest) {
        return null;
      }

      // Extract manufacturer names
      let manufacturerNames = [];
      if (manifest.zigbee && manifest.zigbee.manufacturerName) {
        if (Array.isArray(manifest.zigbee.manufacturerName)) {
          manufacturerNames = manifest.zigbee.manufacturerName;
        } else {
          manufacturerNames = [manifest.zigbee.manufacturerName];
        }
      }

      // Extract product IDs
      let productIds = [];
      if (manifest.zigbee && manifest.zigbee.productId) {
        if (Array.isArray(manifest.zigbee.productId)) {
          productIds = manifest.zigbee.productId;
        } else {
          productIds = [manifest.zigbee.productId];
        }
      }

      return {
        driverId: driverId,
        class: manifest.class || 'unknown',
        capabilities: manifest.capabilities || [],
        manufacturerNames,
        productIds,
        name: manifest.name ? (manifest.name.en || driverId) : driverId
      };

    } catch (error) {
      this.error(`❌ [ID DATABASE] Error reading ${driverId}:`, error.message);
      return null;
    }
  }

  /**
   * Detect device type from driver ID and data
   */
  _detectDeviceType(driverId, driverData) {
    // USB Outlets
    if (driverId.includes('usb_outlet')) {
      return 'usb_outlet';
    }

    // Outlets/Plugs
    if (driverId.includes('outlet') || driverId.includes('plug') || driverId.includes('socket')) {
      return 'outlet';
    }

    // Switches
    if (driverId.includes('switch')) {
      // Gang detection
      if (driverId.includes('1gang')) return 'switch_1gang';
      if (driverId.includes('2gang')) return 'switch_2gang';
      if (driverId.includes('3gang')) return 'switch_3gang';
      if (driverId.includes('4gang')) return 'switch_4gang';
      return 'switch';
    }

    // Dimmers
    if (driverId.includes('dimmer')) {
      return 'dimmer';
    }

    // Lights
    if (driverId.includes('light') || driverId.includes('bulb') || driverId.includes('led') ||
      driverData.class === 'light') {
      return 'light';
    }

    // Sensors
    if (driverId.includes('sensor') || driverId.includes('motion') || driverId.includes('door') ||
      driverId.includes('window') || driverId.includes('water_leak') || driverId.includes('smoke')) {
      return 'sensor';
    }

    // Climate
    if (driverId.includes('thermostat') || driverId.includes('climate') || driverId.includes('temperature')) {
      return 'climate';
    }

    // Curtains/Blinds
    if (driverId.includes('curtain') || driverId.includes('blind') || driverId.includes('shutter')) {
      return 'curtain';
    }

    // Valves
    if (driverId.includes('valve')) {
      return 'valve';
    }

    // Default: use class
    return driverData.class || 'unknown';
  }

  /**
   * Get manufacturer IDs for a device type
   */
  getManufacturerIds(deviceType) {
    return this.database.manufacturerIds[deviceType] || [];
  }

  /**
   * Get product IDs for a device type
   */
  getProductIds(deviceType) {
    return this.database.productIds[deviceType] || [];
  }

  /**
   * Find matching driver by manufacturer name (case-insensitive)
   */
  findDriverByManufacturer(manufacturerName) {
    const mfrLower = (manufacturerName || '').toLowerCase();
    for (const [driverId, mapping] of Object.entries(this.database.driverMappings)) {
      if (mapping.manufacturerNames && mapping.manufacturerNames.some(m => m.toLowerCase() === mfrLower)) {
        return {
          driverId,
          deviceType: mapping.deviceType,
          confidence: 0.95
        };
      }
    }
    return null;
  }

  /**
   * Find matching driver by product ID (case-insensitive)
   */
  findDriverByProductId(productId) {
    const pidLower = (productId || '').toLowerCase();
    for (const [driverId, mapping] of Object.entries(this.database.driverMappings)) {
      if (mapping.productIds && mapping.productIds.some(p => p.toLowerCase() === pidLower)) {
        return {
          driverId,
          deviceType: mapping.deviceType,
          confidence: 0.90
        };
      }
    }
    return null;
  }

  /**
   * Find best matching driver by multiple criteria
   */
  findBestMatch(deviceInfo) {
    const matches = [];

    // Match by manufacturer
    if (deviceInfo.manufacturer) {
      const match = this.findDriverByManufacturer(deviceInfo.manufacturer);
      if (match) {
        matches.push({ ...match, criteria: 'manufacturer' });
      }
    }

    // Match by product ID
    if (deviceInfo.modelId) {
      const match = this.findDriverByProductId(deviceInfo.modelId);
      if (match) {
        matches.push({ ...match, criteria: 'productId' });
      }
    }

    // Return best match (highest confidence)
    if (matches.length > 0) {
      matches.sort((a, b) => b.confidence - a.confidence);
      return matches[0];
    }

    return null;
  }

  /**
   * Check if manufacturer ID matches a device type
   */
  isManufacturerMatch(manufacturerName, deviceType) {
    const ids = this.getManufacturerIds(deviceType);
    const mfrLower = (manufacturerName || '').toLowerCase();
    return ids.some(id => mfrLower.includes(id.toLowerCase()));
  }

  /**
   * Check if product ID matches a device type
   */
  isProductIdMatch(productId, deviceType) {
    const ids = this.getProductIds(deviceType);
    return ids.some(id => productId.includes(id));
  }

  /**
   * Get all device types
   */
  getDeviceTypes() {
    return Object.keys(this.database.manufacturerIds);
  }

  /**
   * Get database statistics
   */
  getStats() {
    return {
      deviceTypes: Object.keys(this.database.manufacturerIds).length,
      totalManufacturerIds: Object.values(this.database.manufacturerIds)
        .reduce((sum, ids) => sum + ids.length, 0),
      totalProductIds: Object.values(this.database.productIds)
        .reduce((sum, ids) => sum + ids.length, 0),
      drivers: Object.keys(this.database.driverMappings).length,
      lastUpdate: this.database.lastUpdate
    };
  }

  // _logDatabaseSample removed - was polluting diagnostic logs
  // Database is internal cache for device matching, does NOT overwrite Homey driver lists

  /**
   * Get complete database (for diagnostic purposes)
   */
  getDatabase() {
    return this.database;
  }

  /**
   * Rebuild database after drivers have loaded
   * Called automatically if initial build found 0 drivers
   */
  async _rebuildAfterDriversLoaded() {
    // Skip if already have data
    if (Object.keys(this.database.driverMappings).length > 0) {
      return; // Already built successfully
    }

    const drivers = this.homey.drivers.getDrivers();
    const driverCount = Object.keys(drivers).length;

    if (driverCount > 0) {
      // Silent rebuild
      await this.buildDatabase();
    } else {
      this.log('⚠️ [ID DATABASE] Still no drivers found after delay');
    }
  }
}

module.exports = DeviceIdentificationDatabase;
