'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Enhanced Device Recognition System
 * Implements advanced algorithms for device identification and fallback handling
 * Based on Johan Benz standards and community feedback
 */
class EnhancedDeviceRecognition {
  constructor() {
    this.devicePatterns = new Map();
    this.manufacturerProfiles = new Map();
    this.capabilityMappings = new Map();
    this.initializePatterns();
  }

  /**
   * Initialize device recognition patterns from forum analysis
   */
  initializePatterns() {
    // Sensor patterns with enhanced NLP
    this.devicePatterns.set('radar_motion', {
      manufacturerIds: [
        '_TZE200_ztc6ggyl', '_TZE204_qasjif9e', '_TZE204_ijxvkhd0', 
        '_TZE204_sxm7l9xa', '_TZE200_ar0slwnd', '_TZE200_sfiy5tcs'
      ],
      keywords: ['radar', 'mmwave', 'motion', 'presence', 'occupancy'],
      capabilities: ['alarm_motion', 'alarm_generic', 'measure_battery'],
      clusters: [61184, 1280, 1282], // EF00, IAS Zone, Occupancy
      confidence: 0.95
    });

    this.devicePatterns.set('soil_moisture', {
      manufacturerIds: [
        '_TZE200_myd45weu', '_TZE200_ga1maeof', '_TZE284_aao3yzhs',
        '_TZE200_9cqcpkgb', '_TZE284_sgabhwa6'
      ],
      keywords: ['soil', 'moisture', 'humidity', 'plant', 'garden'],
      capabilities: ['measure_humidity.soil', 'measure_temperature', 'alarm_water'],
      clusters: [61184, 1026, 1029], // EF00, Temperature, Humidity
      confidence: 0.92
    });

    this.devicePatterns.set('air_quality', {
      manufacturerIds: [
        '_TZE200_yvx5lh6k', '_TZE200_8ygsuhe1', '_TZE200_mja3fuja',
        '_TZE200_ryfmq5rl', '_TZE200_c2fmom5z'
      ],
      keywords: ['air', 'quality', 'co2', 'pm25', 'tvoc', 'aqi'],
      capabilities: ['measure_co2', 'measure_pm25', 'alarm_co2'],
      clusters: [61184, 1037, 1043], // EF00, CO2, PM2.5
      confidence: 0.90
    });

    // Traditional device patterns
    this.devicePatterns.set('temperature_humidity', {
      manufacturerIds: [
        '_TZ3000_i8jfiezr', '_TZ3000_bguser20', '_TZ3000_dowj6gyi'
      ],
      keywords: ['temperature', 'humidity', 'climate', 'weather'],
      capabilities: ['measure_temperature', 'measure_humidity'],
      clusters: [1026, 1029], // Temperature, Humidity
      confidence: 0.85
    });

    this.devicePatterns.set('smart_plug', {
      manufacturerIds: [
        '_TZ3000_kdi2o9m6', '_TZ3000_mraovvmm', '_TZ3000_cphmq0q7'
      ],
      keywords: ['plug', 'socket', 'power', 'energy', 'switch'],
      capabilities: ['onoff', 'measure_power', 'meter_power'],
      clusters: [6, 1794, 2820], // OnOff, Metering, Electrical
      confidence: 0.88
    });
  }

  /**
   * Enhanced device identification using multiple algorithms
   */
  async identifyDevice(node) {
    const results = [];
    
    // Algorithm 1: Manufacturer ID exact matching
    const manufacturerMatch = this.matchByManufacturer(node);
    if (manufacturerMatch) results.push(manufacturerMatch);

    // Algorithm 2: Cluster analysis with ML-like scoring
    const clusterMatch = this.matchByClusters(node);
    if (clusterMatch) results.push(clusterMatch);

    // Algorithm 3: NLP-based model name analysis
    const modelMatch = this.matchByModelName(node);
    if (modelMatch) results.push(modelMatch);

    // Algorithm 4: Capability inference from endpoints
    const capabilityMatch = this.inferFromCapabilities(node);
    if (capabilityMatch) results.push(capabilityMatch);

    // Select best match using weighted scoring
    return this.selectBestMatch(results);
  }

  /**
   * Manufacturer ID pattern matching
   */
  matchByManufacturer(node) {
    const manufacturerId = node.zclNode?.manufacturerName || '';
    
    for (const [deviceType, pattern] of this.devicePatterns) {
      if (pattern.manufacturerIds.includes(manufacturerId)) {
        return {
          deviceType,
          confidence: pattern.confidence,
          source: 'manufacturer_id',
          capabilities: pattern.capabilities,
          clusters: pattern.clusters
        };
      }
    }
    return null;
  }

  /**
   * Cluster-based device identification
   */
  matchByClusters(node) {
    const nodeClusters = this.extractClusters(node);
    let bestMatch = null;
    let highestScore = 0;

    for (const [deviceType, pattern] of this.devicePatterns) {
      const score = this.calculateClusterScore(nodeClusters, pattern.clusters);
      if (score > highestScore && score > 0.6) {
        highestScore = score;
        bestMatch = {
          deviceType,
          confidence: score * 0.8, // Slightly lower confidence for cluster matching
          source: 'cluster_analysis',
          capabilities: pattern.capabilities,
          clusters: pattern.clusters
        };
      }
    }
    return bestMatch;
  }

  /**
   * NLP-based model name analysis
   */
  matchByModelName(node) {
    const modelId = node.zclNode?.modelId || '';
    const manufacturerId = node.zclNode?.manufacturerName || '';
    
    // Enhanced NLP processing
    const deviceDescription = `${manufacturerId} ${modelId}`.toLowerCase();
    
    for (const [deviceType, pattern] of this.devicePatterns) {
      const keywordMatches = pattern.keywords.filter(keyword => 
        deviceDescription.includes(keyword)
      );
      
      if (keywordMatches.length > 0) {
        const confidence = (keywordMatches.length / pattern.keywords.length) * 0.7;
        return {
          deviceType,
          confidence,
          source: 'nlp_analysis',
          matchedKeywords: keywordMatches,
          capabilities: pattern.capabilities
        };
      }
    }
    return null;
  }

  /**
   * Capability inference from endpoint analysis
   */
  inferFromCapabilities(node) {
    const endpoints = node.zclNode?.endpoints || {};
    const availableClusters = new Set();
    
    // Collect all clusters from all endpoints
    Object.values(endpoints).forEach(endpoint => {
      if (endpoint.clusters) {
        Object.keys(endpoint.clusters).forEach(clusterId => {
          availableClusters.add(parseInt(clusterId));
        });
      }
    });

    // Enhanced capability inference
    const inferredCapabilities = [];
    
    // Temperature measurement
    if (availableClusters.has(1026)) {
      inferredCapabilities.push('measure_temperature');
    }
    
    // Humidity measurement  
    if (availableClusters.has(1029)) {
      inferredCapabilities.push('measure_humidity');
    }
    
    // Motion detection
    if (availableClusters.has(1280) || availableClusters.has(1030)) {
      inferredCapabilities.push('alarm_motion');
    }
    
    // Power measurement
    if (availableClusters.has(1794) || availableClusters.has(2820)) {
      inferredCapabilities.push('measure_power');
    }
    
    // Tuya EF00 cluster indicates advanced sensor
    if (availableClusters.has(61184)) {
      inferredCapabilities.push('tuya_advanced_sensor');
    }

    if (inferredCapabilities.length > 0) {
      return {
        deviceType: 'inferred_sensor',
        confidence: 0.6,
        source: 'capability_inference',
        capabilities: inferredCapabilities,
        clusters: Array.from(availableClusters)
      };
    }
    
    return null;
  }

  /**
   * Select best match using weighted algorithm
   */
  selectBestMatch(results) {
    if (results.length === 0) return null;
    
    // Weight factors for different identification methods
    const weights = {
      manufacturer_id: 1.0,
      cluster_analysis: 0.8,
      nlp_analysis: 0.7,
      capability_inference: 0.5
    };
    
    let bestResult = null;
    let highestWeightedScore = 0;
    
    results.forEach(result => {
      const weight = weights[result.source] || 0.5;
      const weightedScore = result.confidence * weight;
      
      if (weightedScore > highestWeightedScore) {
        highestWeightedScore = weightedScore;
        bestResult = result;
      }
    });
    
    return bestResult;
  }

  /**
   * Extract clusters from device node
   */
  extractClusters(node) {
    const clusters = new Set();
    const endpoints = node.zclNode?.endpoints || {};
    
    Object.values(endpoints).forEach(endpoint => {
      if (endpoint.clusters) {
        Object.keys(endpoint.clusters).forEach(clusterId => {
          clusters.add(parseInt(clusterId));
        });
      }
    });
    
    return Array.from(clusters);
  }

  /**
   * Calculate cluster matching score
   */
  calculateClusterScore(nodeClusters, patternClusters) {
    if (!patternClusters || patternClusters.length === 0) return 0;
    
    const matches = patternClusters.filter(cluster => 
      nodeClusters.includes(cluster)
    );
    
    return matches.length / patternClusters.length;
  }

  /**
   * Generate fallback driver configuration
   */
  generateFallbackConfig(identificationResult, node) {
    if (!identificationResult) {
      return this.getUniversalFallback(node);
    }

    const config = {
      driverType: identificationResult.deviceType,
      capabilities: identificationResult.capabilities || [],
      clusters: identificationResult.clusters || [],
      confidence: identificationResult.confidence,
      settings: this.generateSettings(identificationResult),
      flows: this.generateFlowCards(identificationResult)
    };

    return config;
  }

  /**
   * Universal fallback for unknown devices
   */
  getUniversalFallback(node) {
    const clusters = this.extractClusters(node);
    const basicCapabilities = ['onoff']; // Safe default
    
    // Add capabilities based on detected clusters
    if (clusters.includes(1026)) basicCapabilities.push('measure_temperature');
    if (clusters.includes(1029)) basicCapabilities.push('measure_humidity');
    if (clusters.includes(1280)) basicCapabilities.push('alarm_motion');
    if (clusters.includes(6)) basicCapabilities.push('onoff');
    
    return {
      driverType: 'universal_fallback',
      capabilities: basicCapabilities,
      clusters,
      confidence: 0.3,
      isUniversal: true
    };
  }

  /**
   * Generate device-specific settings
   */
  generateSettings(identificationResult) {
    const baseSettings = [
      {
        id: 'reporting_interval',
        type: 'number',
        label: { en: 'Reporting Interval (seconds)' },
        value: 300,
        min: 60,
        max: 3600
      }
    ];

    // Add device-specific settings
    switch (identificationResult.deviceType) {
      case 'radar_motion':
        baseSettings.push({
          id: 'sensitivity',
          type: 'number',
          label: { en: 'Detection Sensitivity (1-10)' },
          value: 5,
          min: 1,
          max: 10
        });
        break;
        
      case 'soil_moisture':
        baseSettings.push({
          id: 'moisture_threshold',
          type: 'number',
          label: { en: 'Low Moisture Alert Threshold (%)' },
          value: 20,
          min: 0,
          max: 100
        });
        break;
        
      case 'air_quality':
        baseSettings.push({
          id: 'co2_threshold',
          type: 'number',
          label: { en: 'High CO2 Alert Threshold (ppm)' },
          value: 1000,
          min: 400,
          max: 5000
        });
        break;
    }

    return baseSettings;
  }

  /**
   * Generate flow cards for device type
   */
  generateFlowCards(identificationResult) {
    const flows = {
      triggers: [],
      conditions: [],
      actions: []
    };

    // Add common triggers
    if (identificationResult.capabilities.includes('alarm_motion')) {
      flows.triggers.push({
        id: 'motion_detected',
        title: { en: 'Motion detected' },
        args: [{ name: 'device', type: 'device' }]
      });
    }

    if (identificationResult.capabilities.includes('measure_temperature')) {
      flows.triggers.push({
        id: 'temperature_changed',
        title: { en: 'Temperature changed' },
        args: [{ name: 'device', type: 'device' }]
      });
    }

    // Add device-specific flows
    switch (identificationResult.deviceType) {
      case 'radar_motion':
        flows.actions.push({
          id: 'set_sensitivity',
          title: { en: 'Set detection sensitivity' },
          args: [
            { name: 'device', type: 'device' },
            { name: 'sensitivity', type: 'number', min: 1, max: 10 }
          ]
        });
        break;
        
      case 'air_quality':
        flows.conditions.push({
          id: 'co2_above_threshold',
          title: { en: 'CO2 level is above threshold' },
          args: [{ name: 'device', type: 'device' }]
        });
        break;
    }

    return flows;
  }
}

module.exports = { EnhancedDeviceRecognition };
