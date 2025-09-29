'use strict';

/**
 * Device Image Generator - Professional Device Icons & Descriptions
 * 
 * Generates comprehensive device images and descriptive text for each device category
 * following Johan Benz professional standards for optimal user device selection experience.
 */

class DeviceImageGenerator {
  
  constructor() {
    // Professional device icon mappings
    this.deviceIcons = {
      // Lighting devices
      'tuya_smart_light': {
        icon: 'bulb',
        category: 'lighting',
        description: 'Smart LED bulb with dimming, color temperature, and energy monitoring',
        userGuide: 'Perfect for living rooms, bedrooms, and accent lighting'
      },
      'tuya_dimmer_switch': {
        icon: 'dimmer',
        category: 'lighting', 
        description: 'Wall-mounted dimmer switch with smooth brightness control',
        userGuide: 'Replace existing wall switches for smart lighting control'
      },
      'tuya_light_switch': {
        icon: 'switch',
        category: 'lighting',
        description: 'Smart wall switch for on/off lighting control',
        userGuide: 'Basic smart lighting control for any room'
      },
      'tuya_rgb_controller': {
        icon: 'led-strip',
        category: 'lighting',
        description: 'RGB LED strip controller with millions of colors and effects',
        userGuide: 'Create ambient lighting with color-changing LED strips'
      },

      // Sensor devices
      'tuya_motion_sensor': {
        icon: 'motion',
        category: 'sensors',
        description: 'PIR motion detector with adjustable sensitivity and battery life',
        userGuide: 'Detect movement for security, automation, and energy saving'
      },
      'tuya_temperature_humidity_sensor': {
        icon: 'temperature',
        category: 'sensors', 
        description: 'Precise temperature and humidity monitoring with data logging',
        userGuide: 'Monitor climate conditions in any room for comfort optimization'
      },
      'tuya_door_window_sensor': {
        icon: 'door-sensor',
        category: 'sensors',
        description: 'Magnetic door/window sensor for security and automation',
        userGuide: 'Know when doors or windows are opened for security alerts'
      },
      'tuya_air_quality_sensor': {
        icon: 'air-quality',
        category: 'sensors',
        description: 'Air quality monitor detecting CO2, VOCs, and pollutants',
        userGuide: 'Maintain healthy indoor air quality with real-time monitoring'
      },
      'tuya_radar_sensor': {
        icon: 'radar',
        category: 'sensors',
        description: 'Advanced radar sensor for presence detection and fall monitoring',
        userGuide: 'Detect human presence even without movement - ideal for elderly care'
      },

      // Security devices  
      'tuya_smoke_sensor': {
        icon: 'smoke',
        category: 'security',
        description: 'Photoelectric smoke detector with loud alarm and app notifications',
        userGuide: 'Early fire detection for home safety - battery powered'
      },
      'tuya_co_detector': {
        icon: 'co-detector', 
        category: 'security',
        description: 'Carbon monoxide detector with precision sensor and alerts',
        userGuide: 'Detect dangerous CO levels from appliances or vehicles'
      },
      'tuya_water_leak_sensor': {
        icon: 'water-leak',
        category: 'security', 
        description: 'Water leak detector with instant flood alerts',
        userGuide: 'Prevent water damage in basements, bathrooms, and kitchens'
      },

      // Energy devices
      'tuya_smart_plug': {
        icon: 'plug',
        category: 'energy',
        description: 'Smart plug with scheduling, energy monitoring, and remote control',
        userGuide: 'Make any device smart - lamps, fans, coffee makers, etc.'
      },
      'tuya_energy_plug': {
        icon: 'energy-meter',
        category: 'energy',
        description: 'Advanced smart plug with detailed power consumption analytics', 
        userGuide: 'Monitor and optimize energy usage of connected appliances'
      },

      // Climate devices
      'tuya_thermostat': {
        icon: 'thermostat',
        category: 'climate',
        description: 'Smart thermostat with scheduling, geofencing, and energy savings',
        userGuide: 'Intelligent heating control for comfort and energy efficiency'
      },

      // Cover devices
      'tuya_curtain_motor': {
        icon: 'curtains',
        category: 'covers',
        description: 'Motorized curtain controller with scheduling and manual override',
        userGuide: 'Automate curtains and blinds for privacy and light control'
      },

      // Control devices
      'tuya_scene_switch': {
        icon: 'scene-switch',
        category: 'controls',
        description: 'Wireless scene controller with customizable button actions',
        userGuide: 'Control multiple devices with single button presses'
      }
    };

    // Professional installation guides
    this.installationGuides = {
      lighting: {
        title: 'Lighting Installation Guide',
        steps: [
          'Turn off power at circuit breaker',
          'Remove existing switch/fixture carefully', 
          'Connect wires according to device manual',
          'Test functionality before final installation',
          'Add device to Homey using Zigbee pairing'
        ],
        safety: 'Always consult an electrician for hardwired installations'
      },
      sensors: {
        title: 'Sensor Installation Guide',
        steps: [
          'Choose optimal mounting location',
          'Clean mounting surface thoroughly',
          'Use provided adhesive or screws',
          'Ensure good Zigbee signal coverage',
          'Test sensor functionality after pairing'
        ],
        safety: 'Keep sensors away from heat sources and moisture'
      },
      security: {
        title: 'Security Device Setup',
        steps: [
          'Test device before installation',
          'Mount in recommended locations',
          'Ensure battery is fully charged',
          'Configure alert preferences in Homey',
          'Test emergency notifications'
        ],
        safety: 'Test monthly and replace batteries annually'
      },
      energy: {
        title: 'Smart Plug Installation',
        steps: [
          'Check power rating compatibility',
          'Plug device into wall outlet',
          'Pair with Homey via Zigbee',
          'Connect appliance to smart plug',
          'Configure schedules and monitoring'
        ],
        safety: 'Do not exceed rated power capacity'
      }
    };
  }

  /**
   * Generate comprehensive device information
   */
  generateDeviceInfo(deviceId) {
    const deviceInfo = this.deviceIcons[deviceId];
    if (!deviceInfo) {
      return {
        icon: 'generic-device',
        category: 'unknown',
        description: 'Zigbee device with basic functionality',
        userGuide: 'Check manufacturer documentation for specific features'
      };
    }

    return {
      ...deviceInfo,
      installationGuide: this.installationGuides[deviceInfo.category],
      compatibility: this.getCompatibilityInfo(deviceId),
      features: this.getDeviceFeatures(deviceId)
    };
  }

  /**
   * Get device compatibility information
   */
  getCompatibilityInfo(deviceId) {
    return {
      homeyVersions: ['Homey Pro (Early 2023)', 'Homey Pro (Early 2019)', 'Homey Bridge'],
      zigbeeVersion: 'Zigbee 3.0',
      powerSource: deviceId.includes('sensor') ? 'Battery' : 'Mains powered',
      range: 'Up to 30m in open space, 10m through walls'
    };
  }

  /**
   * Get comprehensive device features
   */
  getDeviceFeatures(deviceId) {
    const commonFeatures = {
      'tuya_smart_light': [
        'Brightness control (1-100%)',
        'Color temperature (2700K-6500K)', 
        'Energy monitoring',
        'Scheduling and timers',
        'Voice control compatibility'
      ],
      'tuya_motion_sensor': [
        'PIR motion detection',
        'Adjustable sensitivity',
        '6-12 month battery life',
        'Tamper detection',
        'Low battery alerts'
      ],
      'tuya_smart_plug': [
        'Remote on/off control',
        'Power consumption monitoring',
        'Scheduling and timers',
        'Overload protection',
        'Child safety lock'
      ],
      'tuya_thermostat': [
        'Precise temperature control',
        'Weekly scheduling',
        'Energy saving modes',
        'Geofencing support',
        'Manual override'
      ]
    };

    return commonFeatures[deviceId] || [
      'Basic Zigbee functionality',
      'Remote control via Homey app',
      'Integration with Flow cards',
      'Energy efficient operation'
    ];
  }

  /**
   * Generate device matrix for documentation
   */
  generateDeviceMatrix() {
    const matrix = {};
    
    for (const [deviceId, info] of Object.entries(this.deviceIcons)) {
      const category = info.category;
      
      if (!matrix[category]) {
        matrix[category] = {
          categoryName: this.getCategoryDisplayName(category),
          devices: []
        };
      }
      
      matrix[category].devices.push({
        id: deviceId,
        name: this.getDeviceDisplayName(deviceId),
        icon: info.icon,
        description: info.description,
        userGuide: info.userGuide,
        features: this.getDeviceFeatures(deviceId)
      });
    }
    
    return matrix;
  }

  /**
   * Get display name for category
   */
  getCategoryDisplayName(category) {
    const categoryNames = {
      lighting: 'Lighting & Control',
      sensors: 'Sensors & Monitoring', 
      security: 'Security & Safety',
      energy: 'Energy & Smart Plugs',
      climate: 'Climate Control',
      covers: 'Covers & Motors',
      controls: 'Interactive Controls'
    };
    
    return categoryNames[category] || 'Other Devices';
  }

  /**
   * Get display name for device
   */
  getDeviceDisplayName(deviceId) {
    return deviceId
      .replace('tuya_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Generate user-friendly pairing instructions
   */
  generatePairingInstructions(deviceId) {
    const deviceInfo = this.deviceIcons[deviceId];
    if (!deviceInfo) return 'Follow manufacturer pairing instructions';
    
    const categoryInstructions = {
      lighting: 'Turn light on/off 6 times quickly to enter pairing mode',
      sensors: 'Press and hold reset button for 5 seconds until LED blinks',
      security: 'Hold test button until device beeps and LED flashes',
      energy: 'Press power button 5 times rapidly to start pairing',
      climate: 'Hold mode button for 3 seconds until display shows pairing icon',
      covers: 'Press setup button until motor moves briefly',
      controls: 'Hold all buttons simultaneously for 3 seconds'
    };
    
    return categoryInstructions[deviceInfo.category] || 'Check device manual for pairing procedure';
  }
}

module.exports = DeviceImageGenerator;
