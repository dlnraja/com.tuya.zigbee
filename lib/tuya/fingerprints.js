'use strict';

const fs = require('fs');
const path = require('path');

/**
 * TuyaFingerprints - Device fingerprint resolution
 */
class TuyaFingerprints {
  constructor() {
    this.overlaysPath = path.join(__dirname, 'overlays');
  }

  /**
   * Resolve device to overlay
   * Priority: vendor+product+fw > vendor+product > product > wildcard
   */
  resolve(device) {
    const { manufacturerName, productId, firmwareVersion } = device;
    
    // Try specific vendor+product+fw
    let overlay = this.loadSpecificOverlay(manufacturerName, productId, firmwareVersion);
    if (overlay) return overlay;
    
    // Try vendor+product
    overlay = this.loadVendorOverlay(manufacturerName, productId);
    if (overlay) return overlay;
    
    // Try product only
    overlay = this.loadFamilyOverlay(productId);
    if (overlay) return overlay;
    
    // Fallback to standard
    return this.getStandardOverlay(productId);
  }

  /**
   * Load specific overlay for vendor+product+fw
   */
  loadSpecificOverlay(vendor, productId, fw) {
    const fwDir = path.join(this.overlaysPath, 'firmwares', this.detectFamily(productId));
    if (!fs.existsSync(fwDir)) return null;
    
    const files = fs.readdirSync(fwDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const overlay = JSON.parse(fs.readFileSync(path.join(fwDir, file), 'utf8'));
        if (overlay.status === 'confirmed' && 
            overlay.productIds?.includes(productId) &&
            this.matchesFwRange(fw, overlay.fwRange)) {
          return overlay;
        }
      } catch (e) {
        // Skip invalid files
      }
    }
    
    return null;
  }

  /**
   * Load vendor-specific overlay
   */
  loadVendorOverlay(vendor, productId) {
    if (!vendor) return null;
    
    const vendorDir = path.join(this.overlaysPath, 'vendors', vendor);
    if (!fs.existsSync(vendorDir)) return null;
    
    const family = this.detectFamily(productId);
    const overlayFile = path.join(vendorDir, `${family}.json`);
    
    if (fs.existsSync(overlayFile)) {
      try {
        const overlay = JSON.parse(fs.readFileSync(overlayFile, 'utf8'));
        if (overlay.status === 'confirmed') {
          return overlay;
        }
      } catch (e) {
        // Skip invalid files
      }
    }
    
    return null;
  }

  /**
   * Load family overlay
   */
  loadFamilyOverlay(productId) {
    const family = this.detectFamily(productId);
    const overlayFile = path.join(this.overlaysPath, 'families', `${family}.json`);
    
    if (fs.existsSync(overlayFile)) {
      try {
        const overlay = JSON.parse(fs.readFileSync(overlayFile, 'utf8'));
        if (overlay.status === 'confirmed') {
          return overlay;
        }
      } catch (e) {
        // Skip invalid files
      }
    }
    
    return null;
  }

  /**
   * Detect device family from productId
   */
  detectFamily(productId) {
    if (!productId) return 'unknown';
    
    if (productId.includes('011') || productId.includes('115')) return 'plug';
    if (productId.includes('601') && productId.startsWith('TS0')) return 'climate-trv';
    if (productId.includes('130') || productId.includes('601')) return 'cover-curtain';
    if (productId.includes('004')) return 'remote-scene';
    
    return 'generic';
  }

  /**
   * Check if firmware matches range
   */
  matchesFwRange(fw, range) {
    if (!range || !fw) return true;
    
    // Simple version comparison
    // Format: ">=1.0 <2.0"
    const parts = range.split(' ');
    for (const part of parts) {
      if (part.startsWith('>=')) {
        const min = part.substring(2);
        if (fw < min) return false;
      } else if (part.startsWith('<')) {
        const max = part.substring(1);
        if (fw >= max) return false;
      }
    }
    
    return true;
  }

  /**
   * Get standard overlay for known products
   */
  getStandardOverlay(productId) {
    const standards = {
      'TS011F': {
        status: 'confirmed',
        confidence: 0.85,
        dp: {
          1: { cap: 'onoff', to: 'bool' },
          16: { cap: 'measure_power', to: 'num/10' },
          17: { cap: 'meter_power', to: 'num/1000' }
        }
      },
      'TS0601': {
        status: 'confirmed',
        confidence: 0.80,
        dp: {
          2: { cap: 'target_temperature', to: 'num/10' },
          4: { cap: 'measure_temperature', to: 'num/10' },
          7: { cap: 'locked', to: 'bool' },
          45: { cap: 'alarm_battery', to: 'bool' }
        }
      }
    };
    
    return standards[productId] || null;
  }
}

module.exports = TuyaFingerprints;