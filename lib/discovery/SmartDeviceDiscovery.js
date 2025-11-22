'use strict';

/**
 * SMART DEVICE DISCOVERY
 * 
 * AI-powered device identification and auto-configuration
 * - Automatic manufacturer detection
 * - Product identification from MAC/model
 * - Smart driver selection
 * - Auto-configuration based on capabilities
 * - Device fingerprinting
 */

class SmartDeviceDiscovery {
  
  constructor(homey) {
    this.homey = homey;
    this.deviceDatabase = new Map();
    this.discoveryPatterns = this.buildPatterns();
    this.initialized = false;
  }
  
  /**
   * Initialize discovery system
   */
  async initialize() {
    if (this.initialized) return;
    
    this.homey.log('[Discovery] Initializing smart device discovery...');
    
    // Load device database
    await this.loadDeviceDatabase();
    
    this.initialized = true;
    this.homey.log('[Discovery] ✅ Smart discovery initialized');
  }
  
  /**
   * Build discovery patterns
   */
  buildPatterns() {
    return {
      // Manufacturer patterns from MAC address
      manufacturers: {
        tuya: ['60:01:94', 'A4:C1:38', '84:71:27', 'D0:5F:B8', '68:57:2D'],
        aqara: ['54:EF:44', '00:15:8D', '04:CF:8C'],
        xiaomi: ['78:11:DC', '04:CF:8C', '54:EF:44'],
        sonoff: ['60:01:94', '84:F3:EB'],
        moes: ['A4:C1:38'],
        bseed: ['84:71:27'],
        lonsonho: ['D0:5F:B8']
      },
      
      // Model ID patterns
      modelPatterns: {
        switch: /TS000[1-6]|TS001[1-3]/,
        dimmer: /TS110[EF]/,
        light_rgb: /TS0502|TS0503|TS0504/,
        curtain: /TS130[EF]/,
        motion: /TS0202|TS0203/,
        contact: /TS0203/,
        climate: /TS0201|TS0601/,
        button: /TS004[4-5]/,
        plug: /TS011F/,
        thermostat: /TS0601.*TRV/
      },
      
      // Manufacturer name patterns
      manufacturerPatterns: {
        switch: /_TZ3000.*|_TZE200.*/,
        motion: /_TZ3000_.*pir|_TZ3000_.*motion/i,
        climate: /_TZE200.*temp|_TZE200.*humid/i,
        curtain: /_TZE200.*curtain|_TZE200.*blind/i,
        dimmer: /_TZ3210.*dim/i,
        light: /_TZ3000.*light|_TZ3000.*bulb/i
      }
    };
  }
  
  /**
   * Load device database (from known devices)
   */
  async loadDeviceDatabase() {
    // This would typically load from a file or API
    // For now, we'll use inline data
    
    this.deviceDatabase.set('TS0001', {
      type: 'switch',
      gangs: 1,
      capabilities: ['onoff'],
      clusters: [0, 1, 3, 4, 5, 6],
      bindings: [6]
    });
    
    this.deviceDatabase.set('TS0011', {
      type: 'switch',
      gangs: 1,
      capabilities: ['onoff'],
      clusters: [0, 1, 3, 4, 5, 6],
      bindings: [6]
    });
    
    this.deviceDatabase.set('TS0002', {
      type: 'switch',
      gangs: 2,
      capabilities: ['onoff', 'onoff.switch_2'],
      endpoints: 2
    });
    
    this.deviceDatabase.set('TS0003', {
      type: 'switch',
      gangs: 3,
      capabilities: ['onoff', 'onoff.switch_2', 'onoff.switch_3'],
      endpoints: 3
    });
    
    this.deviceDatabase.set('TS0004', {
      type: 'switch',
      gangs: 4,
      capabilities: ['onoff', 'onoff.switch_2', 'onoff.switch_3', 'onoff.switch_4'],
      endpoints: 4
    });
    
    this.deviceDatabase.set('TS011F', {
      type: 'plug',
      capabilities: ['onoff', 'measure_power', 'measure_current', 'measure_voltage'],
      clusters: [0, 1, 3, 4, 5, 6, 0x0702, 0x0B04]
    });
    
    this.deviceDatabase.set('TS0201', {
      type: 'climate',
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      clusters: [0, 1, 3, 0x0402, 0x0405]
    });
    
    this.deviceDatabase.set('TS0202', {
      type: 'motion',
      capabilities: ['alarm_motion', 'measure_battery'],
      clusters: [0, 1, 3, 0x0406, 0x0500]
    });
    
    this.deviceDatabase.set('TS0203', {
      type: 'contact',
      capabilities: ['alarm_contact', 'measure_battery'],
      clusters: [0, 1, 3, 0x0500]
    });
    
    this.deviceDatabase.set('TS0601', {
      type: 'thermostat',
      capabilities: ['target_temperature', 'measure_temperature'],
      clusters: [0, 1, 3, 0x0201, 0xEF00]
    });
    
    this.deviceDatabase.set('TS130F', {
      type: 'curtain',
      capabilities: ['windowcoverings_set', 'windowcoverings_state'],
      clusters: [0, 1, 3, 0x0100, 0x0102]
    });
    
    this.homey.log(`[Discovery] Loaded ${this.deviceDatabase.size} device profiles`);
  }
  
  /**
   * Identify device from discovery data
   */
  async identifyDevice(discoveryData) {
    this.homey.log('[Discovery] Identifying device...');
    
    const identification = {
      confidence: 0,
      manufacturer: 'unknown',
      type: 'unknown',
      model: null,
      suggestedDriver: null,
      capabilities: [],
      clusters: [],
      gangs: 1
    };
    
    // Extract device info
    const { modelId, manufacturerName, endpoints, mac } = discoveryData;
    
    // 1. Identify manufacturer from MAC
    if (mac) {
      const macPrefix = mac.substring(0, 8).toUpperCase();
      for (const [mfr, prefixes] of Object.entries(this.discoveryPatterns.manufacturers)) {
        if (prefixes.includes(macPrefix)) {
          identification.manufacturer = mfr;
          identification.confidence += 20;
          break;
        }
      }
    }
    
    // 2. Identify from model ID
    if (modelId) {
      identification.model = modelId;
      
      // Check database
      const profile = this.deviceDatabase.get(modelId);
      if (profile) {
        identification.type = profile.type;
        identification.capabilities = profile.capabilities;
        identification.clusters = profile.clusters || [];
        identification.gangs = profile.gangs || 1;
        identification.confidence += 40;
      }
      
      // Check patterns
      for (const [type, pattern] of Object.entries(this.discoveryPatterns.modelPatterns)) {
        if (pattern.test(modelId)) {
          if (identification.type === 'unknown') {
            identification.type = type;
            identification.confidence += 30;
          }
          break;
        }
      }
    }
    
    // 3. Identify from manufacturer name
    if (manufacturerName) {
      for (const [type, pattern] of Object.entries(this.discoveryPatterns.manufacturerPatterns)) {
        if (pattern.test(manufacturerName)) {
          if (identification.type === 'unknown') {
            identification.type = type;
            identification.confidence += 20;
          }
          break;
        }
      }
      
      // Detect multi-gang from name
      const gangMatch = manufacturerName.match(/(\d)gang/i);
      if (gangMatch) {
        identification.gangs = parseInt(gangMatch[1]);
      }
    }
    
    // 4. Analyze endpoints
    if (endpoints && Object.keys(endpoints).length > 1) {
      const epCount = Object.keys(endpoints).length;
      if (identification.gangs === 1) {
        identification.gangs = epCount;
      }
      identification.confidence += 10;
    }
    
    // 5. Suggest driver
    identification.suggestedDriver = this.suggestDriver(identification);
    
    this.homey.log('[Discovery] Identification result:', {
      type: identification.type,
      manufacturer: identification.manufacturer,
      confidence: identification.confidence,
      driver: identification.suggestedDriver
    });
    
    return identification;
  }
  
  /**
   * Suggest best matching driver
   */
  suggestDriver(identification) {
    const { type, gangs, manufacturer } = identification;
    
    // Build driver name
    let driverName = type;
    
    // Add gang count for switches
    if (type === 'switch' && gangs > 1) {
      driverName = `switch_wall_${gangs}gang`;
    } else if (type === 'switch') {
      driverName = 'switch_wall_1gang';
    }
    
    // Add manufacturer suffix if specific
    if (manufacturer === 'bseed' && type === 'switch') {
      driverName = `switch_wall_${gangs}gang_bseed`;
    }
    
    // Type-specific suggestions
    switch (type) {
    case 'motion':
      driverName = 'motion_sensor_pir';
      break;
    case 'contact':
      driverName = 'contact_sensor';
      break;
    case 'climate':
      driverName = 'climate_sensor_temp_humidity_advanced';
      break;
    case 'plug':
      driverName = 'plug_energy_monitor';
      break;
    case 'thermostat':
      driverName = 'thermostat_trv_advanced';
      break;
    case 'curtain':
      driverName = 'curtain_motor_advanced';
      break;
    case 'light_rgb':
      driverName = 'led_strip_rgbw';
      break;
    case 'dimmer':
      driverName = 'dimmer_wall_1gang';
      break;
    }
    
    return driverName;
  }
  
  /**
   * Auto-configure device based on identification
   */
  async autoConfigureDevice(device, identification) {
    this.homey.log('[Discovery] Auto-configuring device...');
    
    try {
      // Set device name
      if (identification.model) {
        const name = `${identification.manufacturer} ${identification.type} (${identification.model})`;
        await device.setName(name);
      }
      
      // Configure settings
      const settings = {};
      
      // Detect power source
      if (identification.clusters.includes(1)) {
        settings.power_source = 'auto';
      }
      
      // Set optimization mode
      if (identification.type === 'switch' || identification.type === 'plug') {
        settings.optimization_mode = 'performance';
      } else {
        settings.optimization_mode = 'balanced';
      }
      
      // Enable features based on type
      if (identification.type === 'motion' || identification.type === 'contact') {
        settings.enable_battery_notifications = true;
        settings.battery_report_interval = 24;
      }
      
      if (identification.type === 'plug') {
        settings.enable_power_estimation = true;
      }
      
      await device.setSettings(settings);
      
      this.homey.log('[Discovery] ✅ Device auto-configured');
      
      return true;
      
    } catch (err) {
      this.homey.error('[Discovery] Auto-configure failed:', err);
      return false;
    }
  }
  
  /**
   * Generate device fingerprint
   */
  generateFingerprint(discoveryData) {
    const { modelId, manufacturerName, mac, endpoints } = discoveryData;
    
    const fingerprint = {
      modelId,
      manufacturerName,
      macPrefix: mac ? mac.substring(0, 8) : null,
      endpointCount: endpoints ? Object.keys(endpoints).length : 0,
      clusters: this.extractClusters(endpoints),
      hash: this.hashDevice(discoveryData)
    };
    
    return fingerprint;
  }
  
  /**
   * Extract clusters from endpoints
   */
  extractClusters(endpoints) {
    if (!endpoints) return [];
    
    const clusters = new Set();
    
    for (const ep of Object.values(endpoints)) {
      if (ep.clusters) {
        ep.clusters.forEach(c => clusters.add(c));
      }
    }
    
    return Array.from(clusters).sort((a, b) => a - b);
  }
  
  /**
   * Hash device data for uniqueness
   */
  hashDevice(data) {
    const str = JSON.stringify({
      model: data.modelId,
      mfr: data.manufacturerName,
      mac: data.mac ? data.mac.substring(0, 8) : null
    });
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(16);
  }
  
  /**
   * Search similar devices
   */
  async findSimilarDevices(identification) {
    const similar = [];
    
    for (const [modelId, profile] of this.deviceDatabase.entries()) {
      if (profile.type === identification.type) {
        const similarity = this.calculateSimilarity(identification, profile);
        if (similarity > 0.5) {
          similar.push({
            modelId,
            profile,
            similarity
          });
        }
      }
    }
    
    return similar.sort((a, b) => b.similarity - a.similarity);
  }
  
  /**
   * Calculate similarity score
   */
  calculateSimilarity(id1, id2) {
    let score = 0;
    let total = 0;
    
    // Type match
    total++;
    if (id1.type === id2.type) score++;
    
    // Gangs match
    if (id1.gangs && id2.gangs) {
      total++;
      if (id1.gangs === id2.gangs) score++;
    }
    
    // Capabilities overlap
    if (id1.capabilities && id2.capabilities) {
      total++;
      const overlap = id1.capabilities.filter(c => id2.capabilities.includes(c));
      score += overlap.length / Math.max(id1.capabilities.length, id2.capabilities.length);
    }
    
    return total > 0 ? score / total : 0;
  }
}

module.exports = SmartDeviceDiscovery;
