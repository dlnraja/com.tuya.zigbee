/**
 * Overlay management for Tuya devices
 */

const fs = require('fs');
const path = require('path');

class OverlayManager {
  constructor() {
    this.overlaysPath = path.join(__dirname, 'overlays');
    this.cache = new Map(); // Cache for loaded overlays
    this.maxCacheSize = 100;
  }
  
  /**
   * Load overlay for device
   */
  loadOverlay(device) {
    const { manufacturerName, productId, firmwareVersion } = device;
    const cacheKey = `${manufacturerName}:${productId}:${firmwareVersion}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Try to load overlay
    let overlay = this.loadSpecificOverlay(manufacturerName, productId, firmwareVersion);
    
    if (!overlay) {
      overlay = this.loadVendorOverlay(manufacturerName, productId);
    }
    
    if (!overlay) {
      overlay = this.loadFamilyOverlay(productId);
    }
    
    if (!overlay) {
      overlay = this.getDefaultOverlay(productId);
    }
    
    // Cache result
    if (overlay) {
      this.cache.set(cacheKey, overlay);
      this.cleanupCache();
    }
    
    return overlay;
  }
  
  /**
   * Load specific overlay for vendor+product+fw
   */
  loadSpecificOverlay(vendor, productId, fw) {
    if (!vendor || !productId || !fw) return null;
    
    const fwDir = path.join(this.overlaysPath, 'firmwares', this.detectFamily(productId));
    if (!fs.existsSync(fwDir)) return null;
    
    const files = fs.readdirSync(fwDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const overlay = JSON.parse(fs.readFileSync(path.join(fwDir, file), 'utf8'));
        if (this.isValidOverlay(overlay, productId) && this.matchesFwRange(fw, overlay.fwRange)) {
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
    if (!vendor || !productId) return null;
    
    const vendorDir = path.join(this.overlaysPath, 'vendors', vendor);
    if (!fs.existsSync(vendorDir)) return null;
    
    const family = this.detectFamily(productId);
    const overlayFile = path.join(vendorDir, `${family}.json`);
    
    if (fs.existsSync(overlayFile)) {
      try {
        const overlay = JSON.parse(fs.readFileSync(overlayFile, 'utf8'));
        if (this.isValidOverlay(overlay, productId)) {
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
    if (!productId) return null;
    
    const family = this.detectFamily(productId);
    const overlayFile = path.join(this.overlaysPath, 'families', `${family}.json`);
    
    if (fs.existsSync(overlayFile)) {
      try {
        const overlay = JSON.parse(fs.readFileSync(overlayFile, 'utf8'));
        if (this.isValidOverlay(overlay, productId)) {
          return overlay;
        }
      } catch (e) {
        // Skip invalid files
      }
    }
    
    return null;
  }
  
  /**
   * Get default overlay for known products
   */
  getDefaultOverlay(productId) {
    const defaults = {
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
    
    return defaults[productId] || null;
  }
  
  /**
   * Validate overlay
   */
  isValidOverlay(overlay, productId) {
    if (!overlay || overlay.status !== 'confirmed') return false;
    if (!overlay.productIds?.includes(productId)) return false;
    
    return true;
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
   * Cleanup cache
   */
  cleanupCache() {
    if (this.cache.size > this.maxCacheSize) {
      const keys = Array.from(this.cache.keys());
      const toDelete = keys.slice(0, this.cache.size - this.maxCacheSize);
      
      toDelete.forEach(key => this.cache.delete(key));
    }
  }
  
  /**
   * Get overlay statistics
   */
  getStats() {
    const stats = {
      cached: this.cache.size,
      maxCache: this.maxCacheSize,
      overlays: {
        families: 0,
        vendors: 0,
        firmwares: 0
      }
    };
    
    // Count overlay files
    try {
      const familiesDir = path.join(this.overlaysPath, 'families');
      if (fs.existsSync(familiesDir)) {
        stats.overlays.families = fs.readdirSync(familiesDir).filter(f => f.endsWith('.json')).length;
      }
    } catch (e) {
      // Ignore errors
    }
    
    return stats;
  }
}

module.exports = OverlayManager;
