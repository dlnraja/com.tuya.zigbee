#!/usr/bin/env node
'use strict';

/**
 * PATHFINDER_CONVERTER.js
 * Système de conversion intelligent entre différents formats de databases
 * Trouve automatiquement les chemins de correspondance (pathfinding)
 */

const fs = require('fs');
const path = require('path');

/**
 * MATRICE COMPLÈTE DE CONVERSION
 * Mapping entre différents formats et standards
 */
const CONVERSION_MATRICES = {
  
  // Manufacturer ID variations à travers différentes plateformes
  manufacturerIdMapping: {
    // Blakadder → Zigbee2MQTT → Homey
    '_TZ3000_mmtwjmaq': {
      blakadder: '_TZ3000_mmtwjmaq',
      zigbee2mqtt: '_TZ3000_mmtwjmaq',
      homey: ['_TZ3000_mmtwjmaq'],
      productId: 'TS0202',
      type: 'motion_sensor',
      verified: true
    },
    '_TZE200_cwbvmsar': {
      blakadder: '_TZE200_cwbvmsar',
      zigbee2mqtt: '_TZE200_cwbvmsar',
      homey: ['_TZE200_cwbvmsar'],
      productId: 'TS0601',
      type: 'climate_sensor',
      verified: true
    },
    '_TZ3000_g5xawfcq': {
      blakadder: '_TZ3000_g5xawfcq',
      zigbee2mqtt: '_TZ3000_g5xawfcq',
      homey: ['_TZ3000_g5xawfcq'],
      productId: 'TS011F',
      type: 'plug',
      verified: true
    }
  },
  
  // Product ID normalization
  productIdMapping: {
    'TS0202': {
      variations: ['TS0202', 'ts0202', 'TS_0202'],
      type: 'motion_sensor',
      clusters: [0, 1, 3, 1280, 1026],
      endpoints: { 1: {} }
    },
    'TS0601': {
      variations: ['TS0601', 'ts0601', 'TS_0601'],
      type: 'tuya_proprietary',
      clusters: [0, 4, 5, 61184],
      endpoints: { 1: {} }
    },
    'TS011F': {
      variations: ['TS011F', 'ts011f', 'TS_011F'],
      type: 'plug',
      clusters: [0, 3, 4, 5, 6, 1794, 2820],
      endpoints: { 1: {} }
    },
    'TS0203': {
      variations: ['TS0203', 'ts0203'],
      type: 'contact_sensor',
      clusters: [0, 1, 3, 1280],
      endpoints: { 1: {} }
    }
  },
  
  // Device type synonyms (cross-platform)
  deviceTypeMapping: {
    'motion_sensor': {
      blakadder: ['pir', 'motion', 'occupancy'],
      zigbee2mqtt: ['occupancy', 'motion_sensor', 'pir_sensor'],
      homey: ['motion_sensor', 'pir_sensor', 'occupancy_sensor'],
      capabilities: ['alarm_motion', 'measure_battery']
    },
    'contact_sensor': {
      blakadder: ['contact', 'door', 'window'],
      zigbee2mqtt: ['contact', 'door_sensor', 'window_sensor'],
      homey: ['contact_sensor', 'door_sensor', 'window_sensor'],
      capabilities: ['alarm_contact', 'measure_battery']
    },
    'climate_sensor': {
      blakadder: ['temperature', 'humidity', 'climate'],
      zigbee2mqtt: ['temperature_sensor', 'humidity_sensor', 'climate'],
      homey: ['temperature_sensor', 'humidity_sensor', 'climate_sensor'],
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery']
    },
    'plug': {
      blakadder: ['plug', 'socket', 'outlet'],
      zigbee2mqtt: ['plug', 'smart_plug', 'socket'],
      homey: ['plug', 'socket', 'outlet'],
      capabilities: ['onoff', 'measure_power', 'meter_power']
    },
    'switch': {
      blakadder: ['switch', 'relay'],
      zigbee2mqtt: ['switch', 'relay', 'wall_switch'],
      homey: ['switch', 'relay', 'wall_switch'],
      capabilities: ['onoff']
    }
  },
  
  // Cluster ID normalization (decimal ↔ hex)
  clusterMapping: {
    0: { hex: '0x0000', name: 'basic', homey: 'basic' },
    1: { hex: '0x0001', name: 'powerConfiguration', homey: 'powerConfiguration' },
    3: { hex: '0x0003', name: 'identify', homey: 'identify' },
    4: { hex: '0x0004', name: 'groups', homey: 'groups' },
    5: { hex: '0x0005', name: 'scenes', homey: 'scenes' },
    6: { hex: '0x0006', name: 'onOff', homey: 'onOff' },
    8: { hex: '0x0008', name: 'levelControl', homey: 'levelControl' },
    1024: { hex: '0x0400', name: 'illuminanceMeasurement', homey: 'msIlluminanceMeasurement' },
    1026: { hex: '0x0402', name: 'temperatureMeasurement', homey: 'msTemperatureMeasurement' },
    1029: { hex: '0x0405', name: 'relativeHumidity', homey: 'msRelativeHumidity' },
    1280: { hex: '0x0500', name: 'iasZone', homey: 'iasZone' },
    1794: { hex: '0x0702', name: 'metering', homey: 'metering' },
    2820: { hex: '0x0B04', name: 'electricalMeasurement', homey: 'haElectricalMeasurement' },
    61184: { hex: '0xEF00', name: 'tuya', homey: 'tuya' }
  },
  
  // Capability mapping (Zigbee → Homey)
  capabilityMapping: {
    'onOff': { homey: 'onoff', cluster: 6 },
    'levelControl': { homey: 'dim', cluster: 8 },
    'temperatureMeasurement': { homey: 'measure_temperature', cluster: 1026 },
    'relativeHumidity': { homey: 'measure_humidity', cluster: 1029 },
    'illuminanceMeasurement': { homey: 'measure_luminance', cluster: 1024 },
    'powerConfiguration': { homey: 'measure_battery', cluster: 1 },
    'iasZone_motion': { homey: 'alarm_motion', cluster: 1280 },
    'iasZone_contact': { homey: 'alarm_contact', cluster: 1280 },
    'metering': { homey: 'meter_power', cluster: 1794 },
    'electricalMeasurement': { homey: 'measure_power', cluster: 2820 }
  }
};

/**
 * Pathfinder: Trouve le chemin de conversion optimal
 */
class ConversionPathfinder {
  
  constructor() {
    this.matrices = CONVERSION_MATRICES;
  }
  
  /**
   * Trouve manufacturer ID à travers plateformes
   */
  findManufacturerId(input, targetPlatform = 'homey') {
    // Direct match
    if (this.matrices.manufacturerIdMapping[input]) {
      return this.matrices.manufacturerIdMapping[input][targetPlatform];
    }
    
    // Wildcard search
    for (const [key, mapping] of Object.entries(this.matrices.manufacturerIdMapping)) {
      if (key.startsWith(input.split('_').slice(0, 2).join('_'))) {
        return mapping[targetPlatform];
      }
    }
    
    // Pattern matching
    if (input.includes('_TZ')) {
      return [input]; // Keep as-is if follows Tuya pattern
    }
    
    return null;
  }
  
  /**
   * Normalise product ID
   */
  normalizeProductId(input) {
    input = input.toUpperCase();
    
    for (const [standard, mapping] of Object.entries(this.matrices.productIdMapping)) {
      if (mapping.variations.some(v => v.toUpperCase() === input)) {
        return {
          normalized: standard,
          type: mapping.type,
          clusters: mapping.clusters,
          endpoints: mapping.endpoints
        };
      }
    }
    
    return { normalized: input, type: 'unknown', clusters: [], endpoints: {} };
  }
  
  /**
   * Convertit device type entre plateformes
   */
  convertDeviceType(type, sourcePlatform, targetPlatform = 'homey') {
    for (const [standard, mapping] of Object.entries(this.matrices.deviceTypeMapping)) {
      if (mapping[sourcePlatform]?.includes(type)) {
        return {
          type: mapping[targetPlatform][0],
          allVariations: mapping[targetPlatform],
          capabilities: mapping.capabilities
        };
      }
    }
    
    return { type, allVariations: [type], capabilities: [] };
  }
  
  /**
   * Convertit cluster ID (any format → Homey format)
   */
  convertCluster(input) {
    // Already decimal
    if (typeof input === 'number') {
      return this.matrices.clusterMapping[input] || { homey: `cluster_${input}` };
    }
    
    // Hex format
    if (typeof input === 'string' && input.startsWith('0x')) {
      const decimal = parseInt(input, 16);
      return this.matrices.clusterMapping[decimal] || { homey: `cluster_${decimal}` };
    }
    
    // Name format
    if (typeof input === 'string') {
      const found = Object.values(this.matrices.clusterMapping).find(
        m => m.name === input
      );
      return found || { homey: input };
    }
    
    return { homey: 'unknown' };
  }
  
  /**
   * Génère configuration Homey depuis device externe
   */
  generateHomeyConfig(externalDevice) {
    const config = {
      manufacturerName: [],
      productId: [],
      endpoints: {},
      capabilities: []
    };
    
    // Manufacturer ID
    const manuId = this.findManufacturerId(
      externalDevice.manufacturerId || externalDevice.manufacturerName,
      'homey'
    );
    if (manuId) {
      config.manufacturerName = Array.isArray(manuId) ? manuId : [manuId];
    }
    
    // Product ID
    if (externalDevice.productId || externalDevice.modelId) {
      const normalized = this.normalizeProductId(
        externalDevice.productId || externalDevice.modelId
      );
      config.productId = [normalized.normalized];
      
      // Auto-add clusters if available
      if (normalized.clusters.length > 0) {
        config.endpoints = {
          1: {
            clusters: normalized.clusters
          }
        };
      }
    }
    
    // Device type → capabilities
    if (externalDevice.type || externalDevice.category) {
      const typeConversion = this.convertDeviceType(
        externalDevice.type || externalDevice.category,
        'blakadder',
        'homey'
      );
      config.capabilities = typeConversion.capabilities;
    }
    
    // Endpoints (if provided)
    if (externalDevice.endpoints) {
      config.endpoints = externalDevice.endpoints;
    }
    
    return config;
  }
  
  /**
   * Trouve le meilleur match avec scoring
   */
  findBestPath(localDriver, externalDevices) {
    const paths = [];
    
    for (const external of externalDevices) {
      let score = 0;
      const conversions = [];
      
      // Check manufacturer match
      const localManu = Array.isArray(localDriver.manufacturerName)
        ? localDriver.manufacturerName[0]
        : localDriver.manufacturerName;
      
      const externalManu = external.manufacturerId || external.manufacturerName;
      
      if (localManu === externalManu) {
        score += 50;
        conversions.push('Exact manufacturer match');
      } else {
        const converted = this.findManufacturerId(externalManu, 'homey');
        if (converted && (Array.isArray(converted) ? converted.includes(localManu) : converted === localManu)) {
          score += 40;
          conversions.push('Converted manufacturer match');
        }
      }
      
      // Check product match
      const localProd = Array.isArray(localDriver.productId)
        ? localDriver.productId[0]
        : localDriver.productId;
      
      const externalProd = external.productId || external.modelId;
      
      if (localProd && externalProd) {
        const normalized = this.normalizeProductId(externalProd);
        if (normalized.normalized === localProd.toUpperCase()) {
          score += 50;
          conversions.push('Product ID match');
        }
      }
      
      if (score > 0) {
        paths.push({
          external,
          score,
          conversions,
          homeyConfig: this.generateHomeyConfig(external)
        });
      }
    }
    
    return paths.sort((a, b) => b.score - a.score);
  }
}

/**
 * Export conversion matrices pour usage externe
 */
function getConversionMatrix(type) {
  return CONVERSION_MATRICES[type] || null;
}

/**
 * Convertit batch de devices
 */
function convertBatch(devices, sourcePlatform, targetPlatform = 'homey') {
  const pathfinder = new ConversionPathfinder();
  const converted = [];
  
  for (const device of devices) {
    const homeyConfig = pathfinder.generateHomeyConfig(device);
    converted.push({
      original: device,
      converted: homeyConfig,
      sourcePlatform,
      targetPlatform
    });
  }
  
  return converted;
}

// Export
module.exports = {
  ConversionPathfinder,
  CONVERSION_MATRICES,
  getConversionMatrix,
  convertBatch
};

// CLI usage
if (require.main === module) {
  const pathfinder = new ConversionPathfinder();
  
  // Example usage
  console.log('🔍 PATHFINDER CONVERTER - TEST');
  console.log('═'.repeat(60));
  
  // Test manufacturer conversion
  console.log('\n📋 Manufacturer ID Conversion:');
  const testManu = '_TZ3000_mmtwjmaq';
  const converted = pathfinder.findManufacturerId(testManu, 'homey');
  console.log(`  ${testManu} → ${JSON.stringify(converted)}`);
  
  // Test product normalization
  console.log('\n📋 Product ID Normalization:');
  const testProd = 'ts0202';
  const normalized = pathfinder.normalizeProductId(testProd);
  console.log(`  ${testProd} → ${JSON.stringify(normalized)}`);
  
  // Test device type conversion
  console.log('\n📋 Device Type Conversion:');
  const testType = 'pir';
  const typeConverted = pathfinder.convertDeviceType(testType, 'blakadder', 'homey');
  console.log(`  ${testType} (blakadder) → ${JSON.stringify(typeConverted)}`);
  
  // Test cluster conversion
  console.log('\n📋 Cluster Conversion:');
  const testCluster = '0x0500';
  const clusterConverted = pathfinder.convertCluster(testCluster);
  console.log(`  ${testCluster} → ${JSON.stringify(clusterConverted)}`);
  
  // Test full device conversion
  console.log('\n📋 Full Device Conversion:');
  const externalDevice = {
    manufacturerId: '_TZ3000_g5xawfcq',
    productId: 'TS011F',
    type: 'plug',
    endpoints: { 1: { clusters: [0, 3, 4, 5, 6, 1794, 2820] } }
  };
  const homeyConfig = pathfinder.generateHomeyConfig(externalDevice);
  console.log('  External device:', JSON.stringify(externalDevice, null, 2));
  console.log('  Homey config:', JSON.stringify(homeyConfig, null, 2));
  
  console.log('\n✅ Test complete!');
}
