'use strict';

/**
 * UNKNOWN DEVICE HANDLER
 * 
 * Automatically detect and handle unknown Zigbee devices
 * - Log unknown devices with full details
 * - Suggest appropriate drivers based on clusters/endpoints
 * - Create temporary generic device with basic functionality
 * - Generate report for adding to database
 */

class UnknownDeviceHandler {
  
  constructor(homey) {
    this.homey = homey;
    this.unknownDevices = new Map();
    this.detectionPatterns = this.buildDetectionPatterns();
  }
  
  /**
   * Build detection patterns for device types
   */
  buildDetectionPatterns() {
    return {
      // Cluster-based detection
      clusters: {
        switch: [6], // OnOff cluster
        dimmer: [6, 8], // OnOff + LevelControl
        light_color: [6, 8, 0x0300], // + Color Control
        motion: [0x0406], // Occupancy Sensing
        contact: [0x0500], // IAS Zone
        climate: [0x0402, 0x0405], // Temperature + Humidity
        thermostat: [0x0201], // Thermostat
        curtain: [0x0102], // Window Covering
        plug_energy: [6, 0x0702, 0x0B04], // OnOff + Metering + Electrical Measurement
        button: [0x0001], // Power Configuration (battery)
        siren: [0x0502] // IAS WD
      },
      
      // Model ID patterns (more flexible)
      modelPatterns: {
        switch: /^TS000[1-6]$|^TS001[1-3]$/i,
        dimmer: /^TS110[EF]$/i,
        light_rgb: /^TS050[2-4]$/i,
        curtain: /^TS130[EF]$/i,
        motion: /^TS0202$/i,
        contact: /^TS0203$/i,
        climate: /^TS0201$/i,
        plug: /^TS011F$/i,
        thermostat: /^TS0601.*TRV/i,
        button: /^TS004[0-9]$/i
      },
      
      // Manufacturer name patterns (wildcards)
      mfrPatterns: {
        tuya_switch: /^_TZ3000_.*$/,
        tuya_sensor: /^_TZE200_.*$/,
        tuya_curtain: /^_TZE204_.*curtain/i,
        tuya_trv: /^_TZE200_.*trv/i
      },
      
      // Endpoint count detection
      endpointCount: {
        1: 'single_gang',
        2: 'dual_gang',
        3: 'triple_gang',
        4: 'quad_gang',
        6: 'six_gang',
        8: 'eight_gang'
      }
    };
  }
  
  /**
   * Handle unknown device discovery
   */
  async handleUnknownDevice(discoveryData) {
    this.homey.log('[UnknownDevice] New unknown device detected!');
    this.homey.log('[UnknownDevice] Discovery data:', JSON.stringify(discoveryData, null, 2));
    
    const analysis = await this.analyzeDevice(discoveryData);
    
    // Store for reporting
    const deviceId = this.generateDeviceId(discoveryData);
    this.unknownDevices.set(deviceId, {
      discoveryData,
      analysis,
      timestamp: new Date().toISOString()
    });
    
    // Log detailed report
    this.logDeviceReport(discoveryData, analysis);
    
    // Save to file for developer
    await this.saveDeviceReport(deviceId, discoveryData, analysis);
    
    return analysis;
  }
  
  /**
   * Analyze unknown device
   */
  async analyzeDevice(data) {
    const analysis = {
      deviceType: 'unknown',
      suggestedDriver: null,
      confidence: 0,
      capabilities: [],
      gangCount: 1,
      powerSource: 'unknown',
      matchedPatterns: []
    };
    
    const { modelId, manufacturerName, endpoints } = data;
    
    // 1. Analyze by Model ID
    if (modelId) {
      for (const [type, pattern] of Object.entries(this.detectionPatterns.modelPatterns)) {
        if (pattern.test(modelId)) {
          analysis.deviceType = type;
          analysis.confidence += 40;
          analysis.matchedPatterns.push(`model:${type}`);
          break;
        }
      }
    }
    
    // 2. Analyze by Manufacturer Name
    if (manufacturerName) {
      for (const [type, pattern] of Object.entries(this.detectionPatterns.mfrPatterns)) {
        if (pattern.test(manufacturerName)) {
          if (analysis.deviceType === 'unknown') {
            analysis.deviceType = type.replace('tuya_', '');
            analysis.confidence += 30;
          }
          analysis.matchedPatterns.push(`mfr:${type}`);
        }
      }
    }
    
    // 3. Analyze by Clusters
    if (endpoints) {
      const allClusters = this.extractAllClusters(endpoints);
      
      for (const [type, requiredClusters] of Object.entries(this.detectionPatterns.clusters)) {
        const hasAll = requiredClusters.every(c => allClusters.includes(c));
        if (hasAll) {
          if (analysis.deviceType === 'unknown') {
            analysis.deviceType = type;
            analysis.confidence += 25;
          }
          analysis.matchedPatterns.push(`clusters:${type}`);
          
          // Detect capabilities from clusters
          if (allClusters.includes(6)) analysis.capabilities.push('onoff');
          if (allClusters.includes(8)) analysis.capabilities.push('dim');
          if (allClusters.includes(0x0300)) analysis.capabilities.push('light_hue', 'light_saturation');
          if (allClusters.includes(0x0402)) analysis.capabilities.push('measure_temperature');
          if (allClusters.includes(0x0405)) analysis.capabilities.push('measure_humidity');
          if (allClusters.includes(0x0406)) analysis.capabilities.push('alarm_motion');
          if (allClusters.includes(0x0500)) analysis.capabilities.push('alarm_contact');
          if (allClusters.includes(0x0702)) analysis.capabilities.push('measure_power');
          if (allClusters.includes(0x0B04)) analysis.capabilities.push('measure_voltage', 'measure_current');
        }
      }
      
      // Detect power source
      if (allClusters.includes(1)) {
        // Has Power Configuration cluster - likely battery
        analysis.powerSource = 'battery';
      } else if (allClusters.includes(0x0702) || allClusters.includes(0x0B04)) {
        // Has energy measurement - definitely AC powered
        analysis.powerSource = 'ac';
      }
    }
    
    // 4. Analyze by Endpoint Count
    if (endpoints) {
      const epCount = Object.keys(endpoints).length;
      analysis.gangCount = epCount;
      
      if (analysis.deviceType === 'switch' && epCount > 1) {
        analysis.matchedPatterns.push(`endpoints:${epCount}_gang`);
      }
    }
    
    // 5. Suggest Driver
    analysis.suggestedDriver = this.suggestDriver(analysis);
    
    return analysis;
  }
  
  /**
   * Extract all clusters from all endpoints
   */
  extractAllClusters(endpoints) {
    const clusters = new Set();
    
    for (const ep of Object.values(endpoints)) {
      if (ep.clusters) {
        ep.clusters.forEach(c => clusters.add(c));
      }
    }
    
    return Array.from(clusters);
  }
  
  /**
   * Suggest appropriate driver
   */
  suggestDriver(analysis) {
    const { deviceType, gangCount, powerSource } = analysis;
    
    let driver = null;
    
    switch (deviceType) {
    case 'switch':
      driver = gangCount > 1 
        ? `switch_wall_${gangCount}gang`
        : 'switch_wall_1gang';
      break;
        
    case 'dimmer':
      driver = 'dimmer_wall_1gang';
      break;
        
    case 'light_rgb':
    case 'light_color':
      driver = 'bulb_rgbw';
      break;
        
    case 'motion':
      driver = 'motion_sensor_pir';
      break;
        
    case 'contact':
      driver = 'contact_sensor';
      break;
        
    case 'climate':
      driver = 'climate_sensor_temp_humidity_advanced';
      break;
        
    case 'thermostat':
      driver = 'thermostat_trv_advanced';
      break;
        
    case 'curtain':
      driver = 'curtain_motor_advanced';
      break;
        
    case 'plug':
    case 'plug_energy':
      driver = 'plug_energy_monitor';
      break;
        
    case 'button':
      driver = 'button_wireless_1';
      break;
        
    default:
      driver = 'zigbee_universal'; // Fallback universal driver
    }
    
    return driver;
  }
  
  /**
   * Generate unique device ID
   */
  generateDeviceId(data) {
    const { modelId, manufacturerName, mac } = data;
    const str = `${modelId || 'unknown'}_${manufacturerName || 'unknown'}_${mac || Date.now()}`;
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    
    return `unknown_${Math.abs(hash).toString(16)}`;
  }
  
  /**
   * Log device report
   */
  logDeviceReport(data, analysis) {
    this.homey.log('');
    this.homey.log('╔═══════════════════════════════════════════╗');
    this.homey.log('║   UNKNOWN ZIGBEE DEVICE DETECTED         ║');
    this.homey.log('╚═══════════════════════════════════════════╝');
    this.homey.log('');
    this.homey.log('📋 DEVICE INFORMATION:');
    this.homey.log(`   Model ID: ${data.modelId || 'N/A'}`);
    this.homey.log(`   Manufacturer: ${data.manufacturerName || 'N/A'}`);
    this.homey.log(`   MAC: ${data.mac || 'N/A'}`);
    this.homey.log('');
    this.homey.log('🔍 ANALYSIS RESULTS:');
    this.homey.log(`   Detected Type: ${analysis.deviceType}`);
    this.homey.log(`   Confidence: ${analysis.confidence}%`);
    this.homey.log(`   Gang Count: ${analysis.gangCount}`);
    this.homey.log(`   Power Source: ${analysis.powerSource}`);
    this.homey.log(`   Capabilities: ${analysis.capabilities.join(', ') || 'None detected'}`);
    this.homey.log('');
    this.homey.log('💡 RECOMMENDATION:');
    this.homey.log(`   Suggested Driver: ${analysis.suggestedDriver}`);
    this.homey.log(`   Matched Patterns: ${analysis.matchedPatterns.join(', ')}`);
    this.homey.log('');
    this.homey.log('📝 NEXT STEPS:');
    this.homey.log('   1. Remove device from Homey');
    this.homey.log(`   2. Re-pair using driver: ${analysis.suggestedDriver}`);
    this.homey.log('   3. If issue persists, check device manual for correct model');
    this.homey.log('');
    this.homey.log('═══════════════════════════════════════════');
    this.homey.log('');
  }
  
  /**
   * Save device report to file
   */
  async saveDeviceReport(deviceId, data, analysis) {
    const report = {
      deviceId,
      timestamp: new Date().toISOString(),
      discoveryData: data,
      analysis,
      recommendedAction: {
        step1: 'Remove device from Homey',
        step2: `Re-pair using driver: ${analysis.suggestedDriver}`,
        step3: 'Check device manual if issue persists'
      },
      addToDatabase: {
        driver: analysis.suggestedDriver,
        manufacturerName: data.manufacturerName,
        modelId: data.modelId,
        capabilities: analysis.capabilities
      }
    };
    
    try {
      // Store in app data or log
      this.homey.log('[UnknownDevice] Report generated:', JSON.stringify(report, null, 2));
      
      // Could save to persistent storage here
      // await this.homey.settings.set(`unknown_device_${deviceId}`, report);
      
    } catch (err) {
      this.homey.error('[UnknownDevice] Failed to save report:', err);
    }
  }
  
  /**
   * Get all unknown devices
   */
  getUnknownDevices() {
    return Array.from(this.unknownDevices.values());
  }
  
  /**
   * Clear unknown devices log
   */
  clearUnknownDevices() {
    this.unknownDevices.clear();
  }
}

module.exports = UnknownDeviceHandler;
