'use strict';

/**
 * Intelligent Device Selector - Johan Benz Style Organization
 * 
 * This class provides intelligent device selection and pairing assistance
 * following Johan Benz's professional organization standards with comprehensive
 * device categories, manufacturer mapping, and user-friendly descriptions.
 * 
 * Sources: Zigbee2MQTT, Blakadder, Johan Benz repo, Homey Community
 */

class IntelligentDeviceSelector {
  
  constructor() {
    // Enhanced device categories with Johan Benz organization
    this.deviceCategories = {
      // Lighting & Control
      lighting: {
        name: 'Lighting & Control',
        icon: 'lights',
        description: 'Smart bulbs, LED strips, dimmers, and lighting controllers',
        devices: ['smart_light', 'dimmer_switch', 'light_switch', 'rgb_controller'],
        brands: ['Tuya', 'IKEA', 'Philips', 'Aqara', 'Xiaomi', 'Paulmann']
      },
      
      // Sensors & Monitoring  
      sensors: {
        name: 'Sensors & Monitoring',
        icon: 'sensors',
        description: 'Motion, temperature, humidity, door/window, and environmental sensors',
        devices: ['motion_sensor', 'temperature_humidity_sensor', 'door_window_sensor', 'air_quality_sensor', 'radar_sensor'],
        brands: ['Tuya', 'Aqara', 'Xiaomi', 'Sonoff', 'Neo']
      },
      
      // Security & Safety
      security: {
        name: 'Security & Safety',
        icon: 'security',
        description: 'Smoke detectors, CO detectors, water leak sensors, and security devices',
        devices: ['smoke_sensor', 'co_detector', 'water_leak_sensor'],
        brands: ['Tuya', 'Aqara', 'Neo', 'Heiman', 'Frient']
      },
      
      // Energy & Plugs
      energy: {
        name: 'Energy & Smart Plugs',
        icon: 'energy',
        description: 'Smart plugs with power monitoring, energy meters, and electrical control',
        devices: ['smart_plug', 'energy_plug'],
        brands: ['Tuya', 'BlitzWolf', 'Neo', 'Nous', 'Zemismart']
      },
      
      // Climate Control
      climate: {
        name: 'Climate Control',
        icon: 'climate',
        description: 'Thermostats, TRVs, temperature controllers, and HVAC devices',
        devices: ['thermostat'],
        brands: ['Tuya', 'Aqara', 'Danfoss', 'Eurotronic', 'Moes']
      },
      
      // Covers & Motors
      covers: {
        name: 'Covers & Motors', 
        icon: 'covers',
        description: 'Curtain motors, blinds, garage doors, and motorized covers',
        devices: ['curtain_motor'],
        brands: ['Tuya', 'Aqara', 'Zemismart', 'Moes', 'Somfy']
      },
      
      // Interactive Controls
      controls: {
        name: 'Interactive Controls',
        icon: 'controls', 
        description: 'Scene switches, wireless buttons, remotes, and control panels',
        devices: ['scene_switch'],
        brands: ['Tuya', 'Aqara', 'IKEA', 'Xiaomi', 'Sonoff']
      }
    };

    // Comprehensive manufacturer database
    this.manufacturerDatabase = {
      // Tuya ecosystem (primary focus)
      '_TZ3000_': { name: 'Tuya', category: 'multiple', region: 'Global' },
      '_TZE200_': { name: 'Tuya', category: 'multiple', region: 'Global' }, 
      '_TZE204_': { name: 'Tuya', category: 'multiple', region: 'Global' },
      '_TYZB01_': { name: 'Tuya', category: 'multiple', region: 'Global' },
      
      // Aqara/Xiaomi ecosystem 
      'lumi.': { name: 'Aqara', category: 'sensors', region: 'Asia' },
      'LUMI': { name: 'Xiaomi', category: 'sensors', region: 'Asia' },
      
      // IKEA ecosystem
      'IKEA': { name: 'IKEA', category: 'lighting', region: 'Europe' },
      'TRADFRI': { name: 'IKEA', category: 'lighting', region: 'Europe' },
      
      // Philips ecosystem
      'Philips': { name: 'Philips', category: 'lighting', region: 'Europe' },
      
      // European manufacturers
      'Bosch': { name: 'Bosch', category: 'security', region: 'Europe' },
      'Danfoss': { name: 'Danfoss', category: 'climate', region: 'Europe' },
      'Eurotronic': { name: 'Eurotronic', category: 'climate', region: 'Europe' },
      
      // Chinese manufacturers
      'Sonoff': { name: 'Sonoff', category: 'multiple', region: 'Asia' },
      'Neo': { name: 'Neo', category: 'multiple', region: 'Asia' },
      'BlitzWolf': { name: 'BlitzWolf', category: 'energy', region: 'Asia' },
      'Zemismart': { name: 'Zemismart', category: 'multiple', region: 'Asia' }
    };

    // Device pairing intelligence
    this.pairingIntelligence = {
      common_issues: {
        'Device not found': 'Ensure device is in pairing mode and close to Homey',
        'Pairing timeout': 'Reset device and try pairing again within 30 seconds',
        'Cluster missing': 'Device may need firmware update or different driver'
      },
      pairing_tips: {
        tuya: 'Hold reset button for 5+ seconds until LED blinks rapidly',
        aqara: 'Press and hold button for 3 seconds until LED blinks',
        ikea: 'Hold pairing button near Homey during inclusion'
      }
    };
  }

  /**
   * Get device category information
   */
  getDeviceCategory(deviceType) {
    for (const [key, category] of Object.entries(this.deviceCategories)) {
      if (category.devices.includes(deviceType)) {
        return {
          categoryKey: key,
          ...category
        };
      }
    }
    return null;
  }

  /**
   * Get manufacturer information from product ID
   */
  getManufacturerInfo(productId) {
    for (const [prefix, info] of Object.entries(this.manufacturerDatabase)) {
      if (productId.includes(prefix)) {
        return info;
      }
    }
    return { name: 'Unknown', category: 'multiple', region: 'Unknown' };
  }

  /**
   * Generate intelligent device description
   */
  generateDeviceDescription(driver) {
    const category = this.getDeviceCategory(driver.id);
    const manufacturerInfo = this.getManufacturerInfo(driver.id);
    
    if (!category) return 'Universal Zigbee device';
    
    return `${manufacturerInfo.name} ${category.name.toLowerCase()} with ${category.description.toLowerCase()}. Compatible with Homey's local Zigbee network.`;
  }

  /**
   * Get pairing instructions for device type
   */
  getPairingInstructions(deviceType, manufacturerId) {
    const manufacturerKey = Object.keys(this.manufacturerDatabase)
      .find(key => manufacturerId.includes(key));
    
    if (!manufacturerKey) {
      return 'Put device in pairing mode and add through Homey app';
    }
    
    const manufacturer = this.manufacturerDatabase[manufacturerKey];
    const tip = this.pairingTips[manufacturer.name.toLowerCase()];
    
    return tip || 'Put device in pairing mode and add through Homey app';
  }

  /**
   * Get recommended devices by category
   */
  getRecommendedDevices(category) {
    const categoryInfo = this.deviceCategories[category];
    if (!categoryInfo) return [];
    
    return {
      category: categoryInfo,
      recommendedBrands: categoryInfo.brands,
      compatibleDrivers: categoryInfo.devices
    };
  }

  /**
   * Generate comprehensive device matrix for documentation
   */
  generateDeviceMatrix() {
    const matrix = {};
    
    for (const [categoryKey, category] of Object.entries(this.deviceCategories)) {
      matrix[categoryKey] = {
        name: category.name,
        description: category.description,
        deviceCount: category.devices.length,
        supportedBrands: category.brands,
        drivers: category.devices.map(device => ({
          id: device,
          description: `Professional ${device.replace('_', ' ')} driver with comprehensive Zigbee support`
        }))
      };
    }
    
    return matrix;
  }

  /**
   * Get intelligent suggestions for unknown devices
   */
  getDeviceSuggestions(manufacturerId, productId, clusters) {
    const suggestions = [];
    
    // Analyze clusters to suggest device type
    if (clusters.includes('genOnOff')) {
      if (clusters.includes('genLevelCtrl')) {
        suggestions.push('Dimmable light or smart plug');
      } else {
        suggestions.push('On/off switch or basic smart plug');
      }
    }
    
    if (clusters.includes('msOccupancySensing')) {
      suggestions.push('Motion sensor');
    }
    
    if (clusters.includes('msTemperatureMeasurement')) {
      suggestions.push('Temperature sensor');
    }
    
    return suggestions.length > 0 ? suggestions : ['Unknown Zigbee device - check manufacturer documentation'];
  }
}

module.exports = IntelligentDeviceSelector;
