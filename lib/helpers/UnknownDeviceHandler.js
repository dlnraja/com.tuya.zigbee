'use strict';
const { safeDivide, safeMultiply } = require('../utils/tuyaUtils.js');

/**
 * UNKNOWN DEVICE HANDLER
 */

class UnknownDeviceHandler {
  
  constructor(homey) {
    this.homey = homey;
    this.unknownDevices = new Map();
    this.detectionPatterns = this.buildDetectionPatterns();
  }
  
  buildDetectionPatterns() {
    return {
      clusters: {
        switch: [6],
        dimmer: [6, 8],
        light_color: [6, 8, 0x0300],
        motion: [0x0406],
        contact: [0x0500],
        climate: [0x0402, 0x0405],
        thermostat: [0x0201],
        curtain: [0x0102],
        plug_energy: [6, 0x0702, 0x0B04],
        button: [0x0001],
        siren: [0x0502]
      },
      
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
      
      mfrPatterns: {
        tuya_switch: /^_TZ3000_.*/,
        tuya_sensor: /^_TZE200_.*/,
        tuya_curtain: /^_TZE204_.*curtain/i,
        tuya_trv: /^_TZE200_.*trv/i
      },
      
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
  
  async handleUnknownDevice(discoveryData) {
    this.homey.log('[UnknownDevice] New unknown device detected!');
    const analysis = await this.analyzeDevice(discoveryData);
    const deviceId = this.generateDeviceId(discoveryData);
    this.unknownDevices.set(deviceId, {
      discoveryData,
      analysis,
      timestamp: new Date().toISOString()
    });
    this.logDeviceReport(discoveryData, analysis);
    await this.saveDeviceReport(deviceId, discoveryData, analysis);
    return analysis;
  }
  
  async analyzeDevice(data) {
    const analysis = {
      deviceType: 'unknown',
      suggestedDriver: 'zigbee_universal',
      confidence: 0,
      capabilities: [],
      gangCount: 1,
      powerSource: 'unknown',
      matchedPatterns: []
    };
    
    const { modelId, manufacturerName, endpoints } = data;
    
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
      
      if (allClusters.includes(1)) analysis.powerSource = 'battery';
      else if (allClusters.includes(0x0702) || allClusters.includes(0x0B04)) analysis.powerSource = 'ac';
      
      const epCount = Object.keys(endpoints).length;
      analysis.gangCount = epCount;
    }
    
    analysis.suggestedDriver = this.suggestDriver(analysis);
    return analysis;
  }
  
  extractAllClusters(endpoints) {
    const clusters = new Set();
    for (const ep of Object.values(endpoints)) {
      if (ep.clusters) ep.clusters.forEach(c => clusters.add(c));
    }
    return Array.from(clusters);
  }
  
  suggestDriver(analysis) {
    const { deviceType, gangCount } = analysis;
    switch (deviceType) {
      case 'switch': return gangCount > 1 ? `switch_wall_${gangCount}gang` : 'switch_wall_1gang';
      case 'dimmer': return 'dimmer_wall_1gang';
      case 'light_rgb':
      case 'light_color': return 'bulb_rgbw';
      case 'motion': return 'motion_sensor_pir';
      case 'contact': return 'contact_sensor';
      case 'climate': return 'climate_sensor_temp_humidity_advanced';
      case 'thermostat': return 'thermostat_trv_advanced';
      case 'curtain': return 'curtain_motor_advanced';
      case 'plug':
      case 'plug_energy': return 'plug_energy_monitor';
      case 'button': return 'button_wireless_1';
      default: return 'zigbee_universal';
    }
  }
  
  generateDeviceId(data) {
    const { modelId, manufacturerName, mac } = data;
    const str = `${modelId || 'unknown'}_${manufacturerName || 'unknown'}_${mac || Date.now()}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return `unknown_${Math.abs(hash).toString(16)}`;
  }
  
  logDeviceReport(data, analysis) {
    this.homey.log(`[UnknownDevice] Report: Model=${data.modelId}, Type=${analysis.deviceType}, Driver=${analysis.suggestedDriver}`);
  }
  
  async saveDeviceReport(deviceId, data, analysis) {
    const report = { deviceId, timestamp: new Date().toISOString(), discoveryData: data, analysis };
    this.homey.log('[UnknownDevice] Report generated:', JSON.stringify(report, null, 2));
  }
  
  getUnknownDevices() { return Array.from(this.unknownDevices.values()); }
  clearUnknownDevices() { this.unknownDevices.clear(); }
}

module.exports = UnknownDeviceHandler;
