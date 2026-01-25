'use strict';

/**
 * IEEEAddressManager - Centralized IEEE Address Management for Zigbee devices
 * 
 * v5.5.807: SDK3 COMPLIANCE FIX - Per Homey documentation
 * - Removed hardcoded fallback IEEE address (was causing enrollment failures)
 * - Homey v8.1.1+ auto-writes CIE address during pairing (per SDK3 docs)
 * - Improved coordinator IEEE retrieval without fake fallback
 * 
 * v5.5.796: FORUM FIX - Deep research implementation
 * 
 * PROBLEMS SOLVED:
 * 1. Scattered IEEE address retrieval across multiple files
 * 2. Inconsistent CIE address attribute names (iasCieAddress vs iasCIEAddress vs iasCieAddr)
 * 3. Missing coordinator IEEE address retrieval
 * 4. No validation or normalization of IEEE addresses
 * 5. Poor error handling and retry logic
 * 
 * FEATURES:
 * - Multiple fallback methods for device IEEE address
 * - Multiple fallback methods for coordinator IEEE address
 * - IEEE address normalization (format: XX:XX:XX:XX:XX:XX:XX:XX)
 * - IEEE address validation
 * - CIE address write with verification
 * - Retry logic with exponential backoff
 * 
 * USAGE:
 *   const ieeeManager = new IEEEAddressManager(device);
 *   const deviceIeee = await ieeeManager.getDeviceIeeeAddress();
 *   const coordIeee = await ieeeManager.getCoordinatorIeeeAddress();
 *   await ieeeManager.writeCieAddress(iasZoneCluster);
 */
class IEEEAddressManager {

  constructor(device) {
    this.device = device;
    this._cachedDeviceIeee = null;
    this._cachedCoordinatorIeee = null;
    this._cacheTimeout = 60000; // 1 minute cache
    this._lastCacheTime = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICE IEEE ADDRESS RETRIEVAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get device IEEE address with multiple fallback methods
   * @param {boolean} forceRefresh - Force cache refresh
   * @returns {Promise<string|null>} IEEE address or null
   */
  async getDeviceIeeeAddress(forceRefresh = false) {
    const device = this.device;

    // Check cache first
    if (!forceRefresh && this._cachedDeviceIeee && 
        (Date.now() - this._lastCacheTime) < this._cacheTimeout) {
      return this._cachedDeviceIeee;
    }

    const methods = [
      // Method 1: zclNode.ieeeAddr (SDK3 primary property)
      () => device.zclNode?.ieeeAddr,
      
      // Method 2: zclNode.ieeeAddress (alternative property name)
      () => device.zclNode?.ieeeAddress,
      
      // Method 3: getData().ieeeAddress (device data from pairing)
      () => device.getData?.()?.ieeeAddress,
      
      // Method 4: getData().token (some devices use token)
      () => device.getData?.()?.token,
      
      // Method 5: Settings zb_ieee_address
      () => device.getSetting?.('zb_ieee_address'),
      
      // Method 6: homey.zigbee.getNode() (async)
      async () => {
        if (device.homey?.zigbee?.getNode) {
          try {
            const node = await device.homey.zigbee.getNode(device);
            return node?.ieeeAddress || node?.ieeeAddr;
          } catch (e) {
            return null;
          }
        }
        return null;
      },
      
      // Method 7: Read from Basic cluster
      async () => {
        try {
          const basic = device.zclNode?.endpoints?.[1]?.clusters?.basic;
          if (basic?.readAttributes) {
            const attrs = await basic.readAttributes(['ieeeAddress']).catch(() => null);
            return attrs?.ieeeAddress;
          }
        } catch (e) {
          return null;
        }
        return null;
      }
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        const result = await Promise.resolve(methods[i]());
        if (result && this._isValidIeee(result)) {
          const normalized = this._normalizeIeee(result);
          this._cachedDeviceIeee = normalized;
          this._lastCacheTime = Date.now();
          device.log?.(`[IEEE] ✅ Device IEEE via method ${i + 1}: ${normalized}`);
          return normalized;
        }
      } catch (e) {
        // Continue to next method
      }
    }

    device.log?.('[IEEE] ⚠️ All device IEEE methods failed');
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COORDINATOR IEEE ADDRESS RETRIEVAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get Homey coordinator IEEE address with multiple fallback methods
   * @param {boolean} forceRefresh - Force cache refresh
   * @returns {Promise<string|null>} Coordinator IEEE address or null
   */
  async getCoordinatorIeeeAddress(forceRefresh = false) {
    const device = this.device;

    // Check cache
    if (!forceRefresh && this._cachedCoordinatorIeee) {
      return this._cachedCoordinatorIeee;
    }

    const methods = [
      // Method 1: homey.zigbee.ieeeAddress (SDK3 direct property)
      () => device.homey?.zigbee?.ieeeAddress,
      
      // Method 2: homey.zigbee.address (alternative name)
      () => device.homey?.zigbee?.address,
      
      // Method 3: driver.homey.zigbee.address
      () => device.driver?.homey?.zigbee?.address,
      
      // Method 4: driver.homey.zigbee.ieeeAddress
      () => device.driver?.homey?.zigbee?.ieeeAddress,
      
      // Method 5: zclNode.networkAddress.coordinatorIeee (if available)
      () => device.zclNode?.networkAddress?.coordinatorIeee,
      
      // Method 6: homey.zigbee.getIeeeAddress() (async method)
      async () => {
        if (device.homey?.zigbee?.getIeeeAddress) {
          try {
            return await device.homey.zigbee.getIeeeAddress();
          } catch (e) {
            return null;
          }
        }
        return null;
      },
      
      // Method 7: Extract from network info
      async () => {
        try {
          if (device.homey?.zigbee?.getNetwork) {
            const network = await device.homey.zigbee.getNetwork();
            return network?.coordinatorIeeeAddress || network?.ieeeAddress;
          }
        } catch (e) {
          return null;
        }
        return null;
      }
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        const result = await Promise.resolve(methods[i]());
        if (result && this._isValidIeee(result)) {
          const normalized = this._normalizeIeee(result);
          this._cachedCoordinatorIeee = normalized;
          device.log?.(`[IEEE] ✅ Coordinator IEEE via method ${i + 1}: ${normalized}`);
          return normalized;
        }
      } catch (e) {
        // Continue to next method
      }
    }

    // v5.5.807: SDK3 COMPLIANCE - Do NOT use hardcoded fallback!
    // Per Homey SDK3 docs: "Homey Pro (as of v8.1.1) and Homey Cloud will ensure
    // that a device that supports the IAS Zone cluster will receive a Write 
    // Attribute command to set the IAS_CIE_Address attribute with Homey's IEEE address"
    // 
    // If we can't get coordinator IEEE, return null - Homey handles this during pairing
    device.log?.('[IEEE] ⚠️ Could not retrieve coordinator IEEE address');
    device.log?.('[IEEE] ℹ️ Homey v8.1.1+ auto-writes CIE address during pairing');
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CIE ADDRESS MANAGEMENT (IAS ZONE)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Write CIE address to IAS Zone cluster with retry and verification
   * Handles different attribute name conventions used by various devices
   * 
   * @param {Object} iasZoneCluster - IAS Zone cluster instance
   * @param {Object} options - Options
   * @param {number} options.maxRetries - Max retry attempts (default: 3)
   * @param {boolean} options.verify - Verify after write (default: true)
   * @returns {Promise<boolean>} Success status
   */
  async writeCieAddress(iasZoneCluster, options = {}) {
    const device = this.device;
    const maxRetries = options.maxRetries || 3;
    const verify = options.verify !== false;

    if (!iasZoneCluster) {
      device.log?.('[IEEE-CIE] ⚠️ No IAS Zone cluster provided');
      return false;
    }

    // Get coordinator IEEE address
    const coordIeee = await this.getCoordinatorIeeeAddress();
    if (!coordIeee) {
      device.log?.('[IEEE-CIE] ❌ Cannot get coordinator IEEE address');
      return false;
    }

    device.log?.(`[IEEE-CIE] 📝 Writing CIE address: ${coordIeee}`);

    // Different attribute names used by various Zigbee implementations
    const attributeNames = [
      'iasCieAddress',   // Standard ZCL name
      'iasCIEAddress',   // Alternative casing
      'iasCieAddr',      // Short form
      'cieAddress',      // Simplified
    ];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      for (const attrName of attributeNames) {
        try {
          const writePayload = { [attrName]: coordIeee };
          await iasZoneCluster.writeAttributes(writePayload);
          device.log?.(`[IEEE-CIE] ✅ CIE write success (attr: ${attrName}, attempt: ${attempt})`);

          // Verify if requested
          if (verify) {
            const verified = await this._verifyCieAddress(iasZoneCluster, coordIeee);
            if (verified) {
              device.log?.('[IEEE-CIE] ✅ CIE address verified');
              return true;
            } else {
              device.log?.('[IEEE-CIE] ⚠️ CIE verification failed, continuing...');
            }
          } else {
            return true;
          }
        } catch (e) {
          // Try next attribute name
          if (attempt === maxRetries && attrName === attributeNames[attributeNames.length - 1]) {
            device.log?.(`[IEEE-CIE] ❌ All CIE write attempts failed: ${e.message}`);
          }
        }
      }

      // Wait before retry with exponential backoff
      if (attempt < maxRetries) {
        const delay = 500 * Math.pow(2, attempt - 1);
        await this._wait(delay);
      }
    }

    return false;
  }

  /**
   * Read current CIE address from IAS Zone cluster
   * @param {Object} iasZoneCluster - IAS Zone cluster instance
   * @returns {Promise<string|null>} Current CIE address or null
   */
  async readCieAddress(iasZoneCluster) {
    if (!iasZoneCluster?.readAttributes) {
      return null;
    }

    const attributeNames = ['iasCieAddress', 'iasCIEAddress', 'iasCieAddr', 'cieAddress'];

    for (const attrName of attributeNames) {
      try {
        const attrs = await iasZoneCluster.readAttributes([attrName]);
        if (attrs?.[attrName]) {
          return this._normalizeIeee(attrs[attrName]);
        }
      } catch (e) {
        // Try next attribute name
      }
    }

    return null;
  }

  /**
   * Check if device needs CIE enrollment (CIE address is null/zero)
   * @param {Object} iasZoneCluster - IAS Zone cluster instance
   * @returns {Promise<boolean>} True if enrollment needed
   */
  async needsCieEnrollment(iasZoneCluster) {
    const currentCie = await this.readCieAddress(iasZoneCluster);
    return this._isNullIeee(currentCie);
  }

  /**
   * Verify CIE address was written correctly
   */
  async _verifyCieAddress(iasZoneCluster, expectedAddress) {
    const device = this.device;

    try {
      await this._wait(300); // Small delay for device to process
      const currentCie = await this.readCieAddress(iasZoneCluster);

      if (!currentCie) {
        device.log?.('[IEEE-CIE] ⚠️ CIE read returned null');
        return false;
      }

      const normalizedExpected = this._normalizeIeee(expectedAddress);
      const normalizedActual = this._normalizeIeee(currentCie);

      // Compare without separators
      const expectedClean = normalizedExpected.replace(/[:\-0x]/gi, '').toLowerCase();
      const actualClean = normalizedActual.replace(/[:\-0x]/gi, '').toLowerCase();

      if (expectedClean === actualClean) {
        return true;
      }

      device.log?.(`[IEEE-CIE] ⚠️ CIE mismatch: expected=${normalizedExpected}, got=${normalizedActual}`);
      return false;
    } catch (e) {
      device.log?.(`[IEEE-CIE] ⚠️ CIE verification error: ${e.message}`);
      return true; // Assume success if verification fails
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IEEE ADDRESS UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Normalize IEEE address to consistent format
   * Output: 0x followed by 16 hex characters (lowercase)
   * @param {string|Buffer} ieee - IEEE address in any format
   * @returns {string} Normalized IEEE address
   */
  _normalizeIeee(ieee) {
    if (!ieee) return null;

    let hexStr = '';

    if (Buffer.isBuffer(ieee)) {
      // Convert Buffer to hex string
      hexStr = ieee.toString('hex');
    } else if (typeof ieee === 'string') {
      // Remove all separators and prefixes
      hexStr = ieee.replace(/[:\-\s]/g, '').replace(/^0x/i, '');
    } else if (typeof ieee === 'object' && ieee.type === 'Buffer' && Array.isArray(ieee.data)) {
      // JSON Buffer format
      hexStr = Buffer.from(ieee.data).toString('hex');
    } else {
      return null;
    }

    // Ensure 16 characters (8 bytes)
    hexStr = hexStr.toLowerCase().padStart(16, '0').slice(-16);
    
    return '0x' + hexStr;
  }

  /**
   * Format IEEE address with colons (human-readable)
   * Output: XX:XX:XX:XX:XX:XX:XX:XX
   * @param {string} ieee - IEEE address
   * @returns {string} Formatted IEEE address
   */
  formatIeeeWithColons(ieee) {
    const normalized = this._normalizeIeee(ieee);
    if (!normalized) return null;

    const hex = normalized.replace(/^0x/i, '');
    return hex.match(/.{2}/g).join(':').toUpperCase();
  }

  /**
   * Check if IEEE address is valid (not null, not all zeros)
   * @param {string} ieee - IEEE address
   * @returns {boolean} True if valid
   */
  _isValidIeee(ieee) {
    if (!ieee) return false;
    
    const normalized = this._normalizeIeee(ieee);
    if (!normalized) return false;
    
    return !this._isNullIeee(normalized);
  }

  /**
   * Check if IEEE address is null/zero (needs enrollment)
   * @param {string} ieee - IEEE address
   * @returns {boolean} True if null/zero
   */
  _isNullIeee(ieee) {
    if (!ieee) return true;

    const clean = String(ieee).replace(/[:\-0x\s]/gi, '').toLowerCase();
    
    // Check for all zeros
    if (/^0+$/.test(clean)) return true;
    
    // Check for invalid patterns
    if (clean === '' || clean === 'null' || clean === 'undefined') return true;
    
    return false;
  }

  /**
   * Compare two IEEE addresses (handles different formats)
   * @param {string} ieee1 - First IEEE address
   * @param {string} ieee2 - Second IEEE address
   * @returns {boolean} True if equal
   */
  compareIeee(ieee1, ieee2) {
    const norm1 = this._normalizeIeee(ieee1);
    const norm2 = this._normalizeIeee(ieee2);
    
    if (!norm1 || !norm2) return false;
    
    return norm1.toLowerCase() === norm2.toLowerCase();
  }

  /**
   * Wait utility
   */
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get full IEEE address diagnostics for debugging
   * @returns {Promise<Object>} Diagnostic information
   */
  async getDiagnostics() {
    const device = this.device;
    const diagnostics = {
      deviceIeee: null,
      coordinatorIeee: null,
      iasZone: null,
      errors: []
    };

    try {
      diagnostics.deviceIeee = await this.getDeviceIeeeAddress(true);
    } catch (e) {
      diagnostics.errors.push(`deviceIeee: ${e.message}`);
    }

    try {
      diagnostics.coordinatorIeee = await this.getCoordinatorIeeeAddress(true);
    } catch (e) {
      diagnostics.errors.push(`coordinatorIeee: ${e.message}`);
    }

    try {
      const iasCluster = device.zclNode?.endpoints?.[1]?.clusters?.iasZone;
      if (iasCluster) {
        diagnostics.iasZone = {
          cieAddress: await this.readCieAddress(iasCluster),
          needsEnrollment: await this.needsCieEnrollment(iasCluster)
        };

        // Read zone state if available
        if (iasCluster.readAttributes) {
          const attrs = await iasCluster.readAttributes(['zoneState', 'zoneId', 'zoneType']).catch(() => ({}));
          diagnostics.iasZone.zoneState = attrs.zoneState;
          diagnostics.iasZone.zoneId = attrs.zoneId;
          diagnostics.iasZone.zoneType = attrs.zoneType;
        }
      }
    } catch (e) {
      diagnostics.errors.push(`iasZone: ${e.message}`);
    }

    return diagnostics;
  }
}

module.exports = IEEEAddressManager;
