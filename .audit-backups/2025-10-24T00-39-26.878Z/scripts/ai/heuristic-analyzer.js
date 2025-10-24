#!/usr/bin/env node
'use strict';

/**
 * Heuristic Analyzer - Intelligent Device Analysis
 * Uses AI-like heuristics to determine best driver configuration
 */

const fs = require('fs');
const path = require('path');

class HeuristicAnalyzer {
  constructor(enrichedData) {
    this.data = enrichedData;
    this.analysis = {
      driver_config: {},
      capabilities: [],
      clusters: [],
      dp_mapping: {},
      profile: null,
      confidence: 0
    };
  }

  analyze() {
    console.log('🧠 Starting heuristic analysis...');
    
    try {
      // 1. Determine device type and category
      this.analyzeDeviceType();
      
      // 2. Detect capabilities based on patterns
      this.detectCapabilities();
      
      // 3. Determine Zigbee clusters
      this.determineClusters();
      
      // 4. DP mapping for TS0601 devices
      if (this.data.modelId === 'TS0601') {
        this.analyzeDataPoints();
      }
      
      // 5. Select best profile from DP Engine
      this.selectProfile();
      
      // 6. Generate driver configuration
      this.generateDriverConfig();
      
      // 7. Calculate confidence score
      this.calculateConfidence();
      
      console.log('✅ Analysis complete');
      console.log(`   Confidence: ${this.analysis.confidence}%`);
      
      return this.analysis;
      
    } catch (err) {
      console.error('⚠️ Analysis error:', err.message);
      return this.analysis;
    }
  }

  analyzeDeviceType() {
    console.log('  → Analyzing device type...');
    
    const model = (this.data.model || '').toLowerCase();
    const mfr = (this.data.manufacturerName || '').toLowerCase();
    const category = (this.data.category || '').toLowerCase();
    
    // Pattern matching pour type de device
    const patterns = {
      'smart_plug': ['plug', 'socket', 'outlet'],
      'bulb': ['bulb', 'light', 'lamp'],
      'switch': ['switch', 'gang'],
      'sensor_motion': ['motion', 'pir', 'radar'],
      'sensor_contact': ['door', 'window', 'contact'],
      'sensor_temp': ['temperature', 'temp', 'humidity'],
      'sensor_smoke': ['smoke', 'fire'],
      'sensor_water': ['water', 'leak', 'flood'],
      'thermostat': ['thermostat', 'trv', 'valve'],
      'curtain': ['curtain', 'blind', 'shade'],
      'dimmer': ['dimmer'],
      'button': ['button', 'remote', 'scene']
    };
    
    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some(k => model.includes(k) || category.includes(k))) {
        this.analysis.device_type = type;
        this.analysis.category = this.mapTypeToCategory(type);
        console.log(`  ✅ Type detected: ${type}`);
        return;
      }
    }
    
    // Fallback to provided category
    this.analysis.device_type = 'unknown';
    this.analysis.category = this.data.category || 'uncategorized';
    console.log(`  ⚠️ Type unclear, using: ${this.analysis.category}`);
  }

  mapTypeToCategory(type) {
    const mapping = {
      'smart_plug': 'plugs',
      'bulb': 'lighting',
      'switch': 'switches',
      'dimmer': 'switches',
      'sensor_motion': 'sensors/motion',
      'sensor_contact': 'sensors/contact',
      'sensor_temp': 'sensors/climate',
      'sensor_smoke': 'sensors/safety',
      'sensor_water': 'sensors/safety',
      'thermostat': 'climate',
      'curtain': 'motors',
      'button': 'buttons'
    };
    
    return mapping[type] || 'uncategorized';
  }

  detectCapabilities() {
    console.log('  → Detecting capabilities...');
    
    const type = this.analysis.device_type;
    const capabilities = [];
    
    // Capabilities par type de device
    const capabilityMap = {
      'smart_plug': ['onoff', 'measure_power', 'measure_current', 'measure_voltage', 'meter_power'],
      'bulb': ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation'],
      'switch': ['onoff'],
      'dimmer': ['onoff', 'dim'],
      'sensor_motion': ['alarm_motion', 'measure_luminance', 'measure_battery'],
      'sensor_contact': ['alarm_contact', 'measure_battery'],
      'sensor_temp': ['measure_temperature', 'measure_humidity', 'measure_battery'],
      'sensor_smoke': ['alarm_smoke', 'alarm_battery', 'measure_battery'],
      'sensor_water': ['alarm_water', 'measure_battery'],
      'thermostat': ['target_temperature', 'measure_temperature', 'thermostat_mode'],
      'curtain': ['windowcoverings_state', 'windowcoverings_set'],
      'button': ['button']
    };
    
    if (capabilityMap[type]) {
      capabilities.push(...capabilityMap[type]);
    }
    
    // Ajustements basés sur power source
    if (this.data.powerSource?.toLowerCase().includes('battery')) {
      if (!capabilities.includes('measure_battery')) {
        capabilities.push('measure_battery');
      }
    } else if (this.data.powerSource?.toLowerCase().includes('ac')) {
      // AC devices might have energy monitoring
      if (type === 'smart_plug' && !capabilities.includes('measure_power')) {
        capabilities.push('measure_power');
      }
    }
    
    // Ajustements basés sur Z2M capabilities
    if (this.data.z2m_capabilities) {
      const z2mText = JSON.stringify(this.data.z2m_capabilities).toLowerCase();
      
      if (z2mText.includes('temperature') && !capabilities.includes('measure_temperature')) {
        capabilities.push('measure_temperature');
      }
      if (z2mText.includes('humidity') && !capabilities.includes('measure_humidity')) {
        capabilities.push('measure_humidity');
      }
      if (z2mText.includes('illuminance') && !capabilities.includes('measure_luminance')) {
        capabilities.push('measure_luminance');
      }
    }
    
    this.analysis.capabilities = [...new Set(capabilities)]; // Remove duplicates
    console.log(`  ✅ Capabilities: ${this.analysis.capabilities.join(', ')}`);
  }

  determineClusters() {
    console.log('  → Determining Zigbee clusters...');
    
    const type = this.analysis.device_type;
    const clusters = [];
    
    // Base clusters pour tous
    clusters.push(0);  // basic
    clusters.push(3);  // identify
    
    // Clusters par type
    const clusterMap = {
      'smart_plug': [6, 2820, 1794], // onOff, electricalMeasurement, metering
      'bulb': [6, 8, 768], // onOff, levelControl, colorControl
      'switch': [6], // onOff
      'dimmer': [6, 8], // onOff, levelControl
      'sensor_motion': [1, 1024, 1030, 1280], // powerConfiguration, illuminance, occupancy, iasZone
      'sensor_contact': [1, 1280], // powerConfiguration, iasZone
      'sensor_temp': [1, 1026, 1029], // powerConfiguration, temperature, humidity
      'sensor_smoke': [1, 1280], // powerConfiguration, iasZone
      'sensor_water': [1, 1280], // powerConfiguration, iasZone
      'thermostat': [513], // thermostat
      'curtain': [258], // windowCovering
      'button': [6] // onOff (for commands)
    };
    
    if (clusterMap[type]) {
      clusters.push(...clusterMap[type]);
    }
    
    this.analysis.clusters = [...new Set(clusters)];
    console.log(`  ✅ Clusters: ${this.analysis.clusters.join(', ')}`);
  }

  analyzeDataPoints() {
    console.log('  → Analyzing TS0601 Data Points...');
    
    const dpText = this.data.datapoints || '';
    const dpMapping = {};
    
    // Parse DP definitions from issue
    const dpLines = dpText.split('\n');
    dpLines.forEach(line => {
      const match = line.match(/dp[:\s]*(\d+)[:\s]*(.+)/i);
      if (match) {
        const dpNum = parseInt(match[1]);
        const description = match[2].toLowerCase();
        
        // Map DP to capability
        if (description.includes('onoff') || description.includes('switch')) {
          dpMapping['onoff'] = { dp: dpNum, type: 'bool' };
        } else if (description.includes('brightness') || description.includes('dim')) {
          dpMapping['dim'] = { dp: dpNum, type: 'value', max: 1000 };
        } else if (description.includes('temperature')) {
          dpMapping['measure_temperature'] = { dp: dpNum, type: 'value', scale: 10 };
        } else if (description.includes('humidity')) {
          dpMapping['measure_humidity'] = { dp: dpNum, type: 'value', scale: 10 };
        } else if (description.includes('power')) {
          dpMapping['measure_power'] = { dp: dpNum, type: 'value', scale: 10 };
        } else if (description.includes('current')) {
          dpMapping['measure_current'] = { dp: dpNum, type: 'value', scale: 1000 };
        } else if (description.includes('voltage')) {
          dpMapping['measure_voltage'] = { dp: dpNum, type: 'value', scale: 10 };
        }
      }
    });
    
    this.analysis.dp_mapping = dpMapping;
    console.log(`  ✅ DP mappings: ${Object.keys(dpMapping).length} found`);
  }

  selectProfile() {
    console.log('  → Selecting DP Engine profile...');
    
    // Load existing profiles
    const profilesPath = path.join(__dirname, '../../lib/tuya-dp-engine/profiles.json');
    let profiles = {};
    
    try {
      profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).profiles || {};
    } catch (err) {
      console.log('  ⚠️ Could not load profiles');
    }
    
    // Find best matching profile
    const type = this.analysis.device_type;
    const profileNames = Object.keys(profiles);
    
    const profileMap = {
      'smart_plug': 'smart-plug-energy',
      'bulb': 'bulb-rgb',
      'switch': 'switch-1gang',
      'dimmer': 'dimmer-1gang',
      'sensor_motion': 'motion-illuminance',
      'sensor_contact': 'contact-basic',
      'sensor_temp': 'temperature-humidity',
      'thermostat': 'thermostat-basic',
      'curtain': 'curtain-motor',
      'button': 'button-1'
    };
    
    const suggestedProfile = profileMap[type];
    
    if (suggestedProfile && profileNames.includes(suggestedProfile)) {
      this.analysis.profile = suggestedProfile;
      console.log(`  ✅ Profile: ${suggestedProfile}`);
    } else {
      this.analysis.profile = 'generic-ts0601';
      console.log(`  ⚠️ Using generic profile`);
    }
  }

  generateDriverConfig() {
    console.log('  → Generating driver configuration...');
    
    this.analysis.driver_config = {
      id: this.generateDriverId(),
      name: {
        en: this.generateDriverName()
      },
      class: this.determineDeviceClass(),
      capabilities: this.analysis.capabilities,
      zigbee: {
        manufacturerName: [this.data.manufacturerName],
        productId: [this.data.modelId],
        endpoints: {
          1: {
            clusters: this.analysis.clusters
          }
        },
        learnmode: {
          instruction: {
            en: `Press and hold the pairing button for 5 seconds until LED blinks rapidly.`
          }
        }
      },
      profile: this.analysis.profile,
      category: this.analysis.category
    };
    
    // Add DP mapping if TS0601
    if (this.data.modelId === 'TS0601' && Object.keys(this.analysis.dp_mapping).length > 0) {
      this.analysis.driver_config.dp_mapping = this.analysis.dp_mapping;
    }
    
    console.log(`  ✅ Driver ID: ${this.analysis.driver_config.id}`);
  }

  generateDriverId() {
    const category = this.analysis.category.replace('/', '_');
    const type = this.analysis.device_type;
    const power = (this.data.powerSource || 'ac').toLowerCase().includes('battery') ? 'battery' : 'ac';
    
    return `${type}_${power}`.replace(/[^a-z0-9_]/g, '_');
  }

  generateDriverName() {
    const brand = this.data.brand || 'Tuya';
    const model = this.data.model || 'Device';
    const type = this.analysis.device_type.replace('_', ' ');
    
    return `${brand} ${model} (${type})`;
  }

  determineDeviceClass() {
    const classMap = {
      'smart_plug': 'socket',
      'bulb': 'light',
      'switch': 'socket',
      'dimmer': 'socket',
      'sensor_motion': 'sensor',
      'sensor_contact': 'sensor',
      'sensor_temp': 'sensor',
      'sensor_smoke': 'sensor',
      'sensor_water': 'sensor',
      'thermostat': 'thermostat',
      'curtain': 'curtain',
      'button': 'button'
    };
    
    return classMap[this.analysis.device_type] || 'other';
  }

  calculateConfidence() {
    let score = 0;
    
    // Data completeness
    if (this.data.manufacturerName) score += 20;
    if (this.data.modelId) score += 20;
    if (this.data.fingerprint) score += 15;
    if (this.analysis.device_type !== 'unknown') score += 15;
    if (this.analysis.capabilities.length > 0) score += 15;
    if (this.analysis.clusters.length > 2) score += 10;
    if (this.analysis.profile && this.analysis.profile !== 'generic-ts0601') score += 5;
    
    this.analysis.confidence = Math.min(score, 100);
  }
}

// Main execution
async function main() {
  const enrichedDataStr = process.argv[2];
  if (!enrichedDataStr) {
    console.error('❌ No enriched data provided');
    process.exit(1);
  }
  
  const enrichedData = JSON.parse(enrichedDataStr);
  const analyzer = new HeuristicAnalyzer(enrichedData);
  const analysis = analyzer.analyze();
  
  // Output for GitHub Actions
  console.log('\n📊 Analysis Results:');
  console.log(JSON.stringify(analysis, null, 2));
  
  // Save to file
  fs.writeFileSync(
    path.join(process.cwd(), 'analysis-output.json'),
    JSON.stringify(analysis, null, 2)
  );
  
  // Set GitHub Actions output
  console.log(`::set-output name=analysis::${JSON.stringify(analysis)}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = HeuristicAnalyzer;
