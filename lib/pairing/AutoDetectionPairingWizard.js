'use strict';

/**
 * AutoDetectionPairingWizard - v1.0.0
 * Enhanced pairing flow with automatic device detection
 *
 * Features:
 * - Auto-detect device type from manufacturer/product ID
 * - Suggest optimal driver based on device capabilities
 * - Auto-configure settings for common devices
 * - Fingerprint matching with confidence scoring
 */
class AutoDetectionPairingWizard {
  constructor(homey) {
    this.homey = homey;
    this._detectionRules = new Map();
    this._capabilityProfiles = new Map();

    this._initializeDetectionRules();
    this._initializeCapabilityProfiles();
  }

  /**
   * Initialize device type detection rules
   * @private
   */
  _initializeDetectionRules() {
    // Switch detection patterns
    this._detectionRules.set('switch', {
      keywords: ['switch', 'relay', 'on/off', 'smart plug'],
      requiredCapabilities: ['onoff'],
      optionalCapabilities: ['measure_power', 'meter_power'],
      patterns: [
        { manufacturer: /tuya|sonoff|moes|gledopto/i, productId: /switch|relay/i }
      ]
    });

    // Dimmer detection patterns
    this._detectionRules.set('dimmer', {
      keywords: ['dimmer', 'dimmable', 'brightness'],
      requiredCapabilities: ['onoff', 'dim'],
      optionalCapabilities: ['measure_power'],
      patterns: [
        { manufacturer: /tuya|philips|ikea/i, productId: /dim/i }
      ]
    });

    // Light detection patterns
    this._detectionRules.set('light', {
      keywords: ['bulb', 'light', 'lamp', 'led'],
      requiredCapabilities: ['onoff'],
      optionalCapabilities: ['dim', 'light_hue', 'light_saturation', 'light_temperature'],
      patterns: [
        { manufacturer: /tuya|philips|ikea|yeelight/i, productId: /bulb|light|lamp/i }
      ]
    });

    // Sensor detection patterns
    this._detectionRules.set('sensor', {
      keywords: ['sensor', 'detector', 'monitor'],
      requiredCapabilities: [],
      optionalCapabilities: [
        'measure_temperature', 'measure_humidity', 'measure_luminance',
        'measure_battery', 'alarm_motion', 'alarm_contact'
      ],
      patterns: [
        { manufacturer: /tuya|aqara|xiaomi|sonoff/i, productId: /sensor|temp|humid/i }
      ]
    });

    // Cover/Blind detection patterns
    this._detectionRules.set('cover', {
      keywords: ['cover', 'blind', 'curtain', 'shutter', 'roller'],
      requiredCapabilities: ['windowcoverings_set'],
      optionalCapabilities: ['windowcoverings_tilt_set', 'measure_power'],
      patterns: [
        { manufacturer: /tuya|shelly|sonoff/i, productId: /cover|blind|curtain/i }
      ]
    });

    // Thermostat detection patterns
    this._detectionRules.set('thermostat', {
      keywords: ['thermostat', 'trv', 'radiator', 'valve'],
      requiredCapabilities: ['target_temperature'],
      optionalCapabilities: ['measure_temperature', 'thermostat_mode', 'heating'],
      patterns: [
        { manufacturer: /tuya|moes|saswell|danfoss/i, productId: /thermo|trv|valve/i }
      ]
    });

    // Lock detection patterns
    this._detectionRules.set('lock', {
      keywords: ['lock', 'door lock', 'smart lock'],
      requiredCapabilities: ['locked'],
      optionalCapabilities: ['alarm_contact', 'measure_battery'],
      patterns: [
        { manufacturer: /tuya|yale|schlage|august/i, productId: /lock/i }
      ]
    });
  }

  /**
   * Initialize capability-based profiles
   * @private
   */
  _initializeCapabilityProfiles() {
    this._capabilityProfiles.set('basic_switch', {
      name: 'Basic Switch',
      capabilities: ['onoff'],
      settings: {},
      confidence: 0.9
    });

    this._capabilityProfiles.set('smart_switch', {
      name: 'Smart Switch with Energy Monitoring',
      capabilities: ['onoff', 'measure_power', 'meter_power'],
      settings: { power_report_interval: 300 },
      confidence: 0.95
    });

    this._capabilityProfiles.set('dimmable_light', {
      name: 'Dimmable Light',
      capabilities: ['onoff', 'dim'],
      settings: {},
      confidence: 0.9
    });

    this._capabilityProfiles.set('color_light', {
      name: 'Color Temperature Light',
      capabilities: ['onoff', 'dim', 'light_temperature'],
      settings: { color_temp_min: 2700, color_temp_max: 6500 },
      confidence: 0.85
    });

    this._capabilityProfiles.set('rgb_light', {
      name: 'RGB Color Light',
      capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation'],
      settings: {},
      confidence: 0.8
    });

    this._capabilityProfiles.set('temperature_sensor', {
      name: 'Temperature Sensor',
      capabilities: ['measure_temperature', 'measure_battery'],
      settings: { temperature_report_interval: 600 },
      confidence: 0.95
    });

    this._capabilityProfiles.set('multi_sensor', {
      name: 'Multi-Function Sensor',
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      settings: { report_interval: 600 },
      confidence: 0.9
    });

    this._capabilityProfiles.set('motion_sensor', {
      name: 'Motion Sensor',
      capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery'],
      settings: { motion_timeout: 60 },
      confidence: 0.9
    });

    this._capabilityProfiles.set('contact_sensor', {
      name: 'Door/Window Contact Sensor',
      capabilities: ['alarm_contact', 'measure_battery'],
      settings: {},
      confidence: 0.95
    });

    this._capabilityProfiles.set('cover', {
      name: 'Window Covering',
      capabilities: ['windowcoverings_set'],
      settings: {},
      confidence: 0.9
    });

    this._capabilityProfiles.set('thermostat', {
      name: 'Thermostat',
      capabilities: ['target_temperature', 'measure_temperature'],
      settings: { temperature_step: 0.5, min_temp: 5, max_temp: 35 },
      confidence: 0.85
    });
  }

  /**
   * Analyze a device and suggest optimal configuration
   * @param {Object} deviceInfo - Device information from pairing
   * @param {string} deviceInfo.manufacturer - Manufacturer name
   * @param {string} deviceInfo.productId - Product/model ID
   * @param {string[]} deviceInfo.capabilities - Detected capabilities
   * @returns {Object} Detection result with suggestions
   */
  analyzeDevice(deviceInfo) {
    const { manufacturer = '', productId = '', capabilities = [] } = deviceInfo;

    const result = {
      detectedType: null,
      confidence: 0,
      suggestedDriver: null,
      suggestedProfile: null,
      autoConfig: {},
      warnings: [],
      alternatives: []
    };

    // Step 1: Match by manufacturer/product patterns
    const patternMatches = this._matchByPatterns(manufacturer, productId);

    // Step 2: Match by capabilities
    const capabilityMatches = this._matchByCapabilities(capabilities);

    // Step 3: Combine scores and determine best match
    const allCandidates = [...patternMatches, ...capabilityMatches];
    const scored = this._scoreCandidates(allCandidates, manufacturer, productId, capabilities);

    if (scored.length > 0) {
      const best = scored[0];
      result.detectedType = best.type;
      result.confidence = best.confidence;
      result.suggestedDriver = best.suggestedDriver;
      result.suggestedProfile = best.profile;
      result.autoConfig = best.autoConfig;
      result.alternatives = scored.slice(1, 4).map(s => ({
        type: s.type,
        confidence: s.confidence,
        reason: s.reason
      }));
    }

    // Step 4: Generate warnings
    if (result.confidence < 0.5) {
      result.warnings.push('Low confidence detection. Manual selection recommended.');
    }
    if (capabilities.length === 0) {
      result.warnings.push('No capabilities detected. Device may need manual configuration.');
    }
    if (patternMatches.length === 0 && capabilityMatches.length === 0) {
      result.warnings.push('Unknown device. Using generic configuration.');
    }

    return result;
  }

  /**
   * Match device by manufacturer/product patterns
   * @private
   */
  _matchByPatterns(manufacturer, productId) {
    const matches = [];

    for (const [type, rules] of this._detectionRules.entries()) {
      for (const pattern of rules.patterns) {
        const mfrMatch = pattern.manufacturer.test(manufacturer);
        const prodMatch = pattern.productId.test(productId);

        if (mfrMatch || prodMatch) {
          matches.push({
            type,
            confidence: mfrMatch && prodMatch ? 0.95 : (mfrMatch ? 0.8 : 0.7),
            reason: `Pattern match: ${mfrMatch ? 'manufacturer' : 'product ID'}`,
            rules
          });
        }
      }
    }

    return matches;
  }

  /**
   * Match device by detected capabilities
   * @private
   */
  _matchByCapabilities(capabilities) {
    if (!capabilities || capabilities.length === 0) return [];

    const matches = [];
    const caps = new Set(capabilities);

    for (const [type, rules] of this._detectionRules.entries()) {
      const required = rules.requiredCapabilities;
      const optional = rules.optionalCapabilities;

      // Check if all required capabilities are present
      const hasAllRequired = required.every(c => caps.has(c));

      if (hasAllRequired || required.length === 0) {
        // Score based on how many optional capabilities match
        const matchingOptional = optional.filter(c => caps.has(c));
        const score = required.length > 0
          ? (required.length / (required.length + optional.length)) +
            (matchingOptional.length / optional.length) * 0.3
          : matchingOptional.length / optional.length;

        matches.push({
          type,
          confidence: Math.min(0.9, score),
          reason: `Capability match: ${matchingOptional.length}/${optional.length} optional`,
          rules
        });
      }
    }

    return matches;
  }

  /**
   * Score and rank candidates
   * @private
   */
  _scoreCandidates(candidates, manufacturer, productId, capabilities) {
    // Deduplicate by type, keeping highest confidence
    const byType = new Map();
    for (const c of candidates) {
      const existing = byType.get(c.type);
      if (!existing || c.confidence > existing.confidence) {
        byType.set(c.type, c);
      }
    }

    // Score each candidate
    const scored = [];
    for (const [type, candidate] of byType) {
      let finalScore = candidate.confidence;

      // Boost score if we have a capability profile match
      const profile = this._findBestProfile(capabilities);
      if (profile && profile.type === type) {
        finalScore = Math.min(0.99, finalScore + 0.1);
      }

      // Find suggested driver and profile
      const suggestedDriver = this._findSuggestedDriver(type);
      const autoConfig = this._generateAutoConfig(type, capabilities);

      scored.push({
        type,
        confidence: Math.round(finalScore * 100) / 100,
        reason: candidate.reason,
        suggestedDriver: suggestedDriver,
        profile: profile || null,
        autoConfig
      });
    }

    // Sort by confidence descending
    scored.sort((a, b) => b.confidence - a.confidence);

    return scored;
  }

  /**
   * Find best capability profile for device
   * @private
   */
  _findBestProfile(capabilities) {
    if (!capabilities || capabilities.length === 0) return null;

    const caps = new Set(capabilities);
    let bestMatch = null;
    let bestScore = 0;

    for (const [profileId, profile] of this._capabilityProfiles) {
      const profileCaps = new Set(profile.capabilities);
      const intersection = [...caps].filter(c => profileCaps.has(c));

      if (intersection.length > 0) {
        const score = intersection.length / profileCaps.size;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { ...profile, type: profileId, matchScore: score };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Find suggested driver for device type
   * @private
   */
  _findSuggestedDriver(type) {
    // Map detection types to driver suggestions
    const driverMap = {
      'switch': 'switch',
      'dimmer': 'bulb_dimmable',
      'light': 'bulb_white',
      'sensor': 'climate_sensor',
      'cover': 'cover',
      'thermostat': 'radiator_valve',
      'lock': 'lock'
    };

    return driverMap[type] || 'unknown';
  }

  /**
   * Generate auto-configuration based on device type
   * @private
   */
  _generateAutoConfig(type, capabilities) {
    const config = {
      reportInterval: 600, // Default 10 minutes
      powerReporting: false,
      batteryReporting: false,
      customSettings: {}
    };

    if (capabilities.includes('measure_power') || capabilities.includes('meter_power')) {
      config.powerReporting = true;
      config.reportInterval = 300; // 5 minutes for power devices
    }

    if (capabilities.includes('measure_battery')) {
      config.batteryReporting = true;
      config.customSettings.battery_report_threshold = 5; // 5% change
    }

    // Type-specific configs
    switch (type) {
      case 'switch':
        config.customSettings.auto_off = false;
        break;
      case 'dimmer':
      case 'light':
        config.customSettings.fade_time = 200; // 200ms fade
        break;
      case 'sensor':
        config.reportInterval = 600;
        config.customSettings.wake_up_interval = 3600; // 1 hour
        break;
      case 'thermostat':
        config.customSettings.temperature_step = 0.5;
        config.customSettings.min_temp = 5;
        config.customSettings.max_temp = 35;
        break;
    }

    return config;
  }

  /**
   * Get all available device types
   * @returns {Object[]} Array of device type info
   */
  getAvailableTypes() {
    const types = [];
    for (const [type, rules] of this._detectionRules) {
      types.push({
        type,
        keywords: rules.keywords,
        requiredCapabilities: rules.requiredCapabilities,
        optionalCapabilities: rules.optionalCapabilities
      });
    }
    return types;
  }

  /**
   * Get all available capability profiles
   * @returns {Object[]} Array of profile info
   */
  getAvailableProfiles() {
    const profiles = [];
    for (const [id, profile] of this._capabilityProfiles) {
      profiles.push({
        id,
        name: profile.name,
        capabilities: profile.capabilities,
        confidence: profile.confidence
      });
    }
    return profiles;
  }
}

module.exports = AutoDetectionPairingWizard;
