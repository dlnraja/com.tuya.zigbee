/**
 * Tuya fingerprint resolution utilities
 */

class TuyaFingerprints {
  static async resolve(device, options = {}) {
    const { familyHint } = options;
    
    try {
      // Get device info from Zigbee interview
      const deviceInfo = await this.getDeviceInfo(device);
      
      // Resolve overlay based on manufacturer and product
      const overlay = await this.resolveOverlay(deviceInfo, familyHint);
      
      return {
        deviceInfo,
        overlay,
        family: familyHint || this.detectFamily(deviceInfo, overlay)
      };
    } catch (error) {
      device.error('Fingerprint resolution failed:', error);
      return {
        deviceInfo: {},
        overlay: null,
        family: familyHint || 'unknown'
      };
    }
  }
  
  static async getDeviceInfo(device) {
    try {
      const endpoint = device.zclNode.endpoints[1];
      const basicCluster = endpoint.clusters.basic;
      
      if (basicCluster) {
        const attributes = await basicCluster.readAttributes([
          'manufacturerName',
          'modelId',
          'productId'
        ]);
        
        return {
          manufacturer: attributes.manufacturerName || 'Unknown',
          model: attributes.modelId || 'Unknown',
          productId: attributes.productId || 'Unknown'
        };
      }
    } catch (error) {
      device.log('Failed to read device info:', error.message);
    }
    
    return {
      manufacturer: 'Unknown',
      model: 'Unknown',
      productId: 'Unknown'
    };
  }
  
  static async resolveOverlay(deviceInfo, familyHint) {
    const { manufacturer, model, productId } = deviceInfo;
    
    // Try to find specific overlay
    let overlay = await this.loadSpecificOverlay(manufacturer, model, productId);
    
    if (!overlay && familyHint) {
      // Fallback to family-based overlay
      overlay = await this.loadFamilyOverlay(familyHint);
    }
    
    if (!overlay) {
      // Default overlay based on device type detection
      overlay = this.getDefaultOverlay(deviceInfo);
    }
    
    return overlay;
  }
  
  static async loadSpecificOverlay(manufacturer, model, productId) {
    try {
      // Try to load vendor-specific overlay
      if (manufacturer.includes('_TZ3000')) {
        return await this.loadVendorOverlay('_TZ3000', productId);
      }
      
      if (manufacturer.includes('_TZE200')) {
        return await this.loadVendorOverlay('_TZE200', productId);
      }
      
      if (manufacturer.includes('Tuya')) {
        return await this.loadGenericTuyaOverlay(productId);
      }
    } catch (error) {
      console.log('Failed to load specific overlay:', error.message);
    }
    
    return null;
  }
  
  static async loadVendorOverlay(vendor, productId) {
    // TODO: Load from lib/tuya/overlays/vendors/{vendor}/{productId}.json
    // For now, return standard overlays
    return this.getStandardOverlay(vendor, productId);
  }
  
  static async loadFamilyOverlay(family) {
    // TODO: Load from lib/tuya/overlays/families/{family}.json
    // For now, return standard family overlay
    return this.getStandardFamilyOverlay(family);
  }
  
  static getDefaultOverlay(deviceInfo) {
    const { manufacturer, productId } = deviceInfo;
    
    // Detect family from product ID
    if (productId.includes('TS011')) {
      return this.getStandardOverlay('plug', productId);
    }
    
    if (productId.includes('TS0601')) {
      return this.getStandardOverlay('trv', productId);
    }
    
    if (productId.includes('TS004')) {
      return this.getStandardOverlay('remote', productId);
    }
    
    // Generic fallback
    return {
      dp: {},
      reports: { default_interval: 300 }
    };
  }
  
  static getStandardOverlay(type, productId) {
    const overlays = {
      'plug': {
        dp: {
          '1': { cap: 'onoff', to: 'bool' },
          '16': { cap: 'measure_power', to: 'num/10' },
          '17': { cap: 'meter_power', to: 'num/1000' }
        },
        reports: { power_interval_sec: 30 }
      },
      'trv': {
        dp: {
          '2': { cap: 'target_temperature', to: 'num/10', from: 'mul/10' },
          '4': { cap: 'measure_temperature', to: 'num/10' },
          '7': { cap: 'locked', to: 'bool' },
          '45': { cap: 'measure_battery', to: 'num' }
        }
      },
      'remote': {
        dp: {
          '1': { cap: 'button', to: 'num' }
        }
      }
    };
    
    return overlays[type] || overlays['plug'];
  }
  
  static getStandardFamilyOverlay(family) {
    return this.getStandardOverlay(family, 'generic');
  }
  
  static detectFamily(deviceInfo, overlay) {
    // Try to detect family from overlay or device info
    if (overlay && overlay.dp) {
      if (overlay.dp['1'] && overlay.dp['1'].cap === 'onoff') {
        return 'plug';
      }
      if (overlay.dp['2'] && overlay.dp['2'].cap === 'target_temperature') {
        return 'trv';
      }
    }
    
    // Fallback detection from product ID
    const { productId } = deviceInfo;
    if (productId.includes('TS011')) return 'plug';
    if (productId.includes('TS0601')) return 'trv';
    if (productId.includes('TS004')) return 'remote';
    
    return 'unknown';
  }
}

module.exports = TuyaFingerprints;
