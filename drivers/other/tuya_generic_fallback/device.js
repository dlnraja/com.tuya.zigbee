'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaGenericFallbackDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('TuyaGenericFallbackDevice initialized - Universal learning mode');

    // Dynamic capability registration based on detected features
    this.registeredCapabilities = new Set();
    this.dataPointLog = new Map();
    this.clusterLog = new Map();
    
    // Register basic capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registeredCapabilities.add('onoff');

    // Register all possible Tuya clusters for comprehensive logging
    this.registerCluster('manuSpecificTuya', {
      onDataReport: (data) => {
        if (this.getSetting('enable_logging')) {
          this.log('🔍 Tuya EF00 Data:', JSON.stringify(data, null, 2));
          this.logDataPoint(data);
        }
        this.handleUnknownTuyaDataPoint(data);
      }
    });

    // Register standard Zigbee clusters with logging
    const standardClusters = ['genBasic', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 
                            'msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement',
                            'genPowerCfg', 'ssIasZone', 'hvacThermostat', 'closuresWindowCovering'];

    standardClusters.forEach(cluster => {
      try {
        this.registerCluster(cluster, {
          onDataReport: (data) => {
            if (this.getSetting('enable_logging')) {
              this.log(`📊 Standard cluster ${cluster}:`, JSON.stringify(data, null, 2));
              this.logClusterData(cluster, data);
            }
            this.handleStandardClusterData(cluster, data);
          }
        });
      } catch (err) {
        // Cluster not supported - ignore
      }
    });

    // AI Analysis mode for pattern recognition
    if (this.getSetting('ai_analysis_mode')) {
      this.startAIAnalysis();
    }
  }

  logDataPoint(data) {
    const { dp, value, datatype } = data;
    const key = `DP${dp}`;
    
    if (!this.dataPointLog.has(key)) {
      this.dataPointLog.set(key, {
        dp,
        datatype,
        values: [],
        frequency: 0,
        firstSeen: new Date()
      });
    }
    
    const dpInfo = this.dataPointLog.get(key);
    dpInfo.values.push({ value, timestamp: new Date() });
    dpInfo.frequency++;
    dpInfo.lastSeen = new Date();
    
    // Keep only last 10 values to prevent memory issues
    if (dpInfo.values.length > 10) {
      dpInfo.values = dpInfo.values.slice(-10);
    }
    
    this.dataPointLog.set(key, dpInfo);
  }

  logClusterData(cluster, data) {
    if (!this.clusterLog.has(cluster)) {
      this.clusterLog.set(cluster, {
        attributes: new Set(),
        frequency: 0,
        firstSeen: new Date()
      });
    }
    
    const clusterInfo = this.clusterLog.get(cluster);
    if (data.attributeName) {
      clusterInfo.attributes.add(data.attributeName);
    }
    clusterInfo.frequency++;
    clusterInfo.lastSeen = new Date();
  }

  handleUnknownTuyaDataPoint(data) {
    const { dp, value, datatype } = data;
    
    // Common DP patterns based on Zigbee2MQTT analysis
    switch (dp) {
      case 1: // Usually on/off or main function
        if (typeof value === 'boolean' || (typeof value === 'number' && (value === 0 || value === 1))) {
          this.setCapabilityValue('onoff', Boolean(value)).catch(this.error);
          this.triggerGenericFlow('dp1_onoff', Boolean(value));
        }
        break;
        
      case 2: // Often brightness/level
        if (typeof value === 'number' && value >= 0 && value <= 255) {
          this.addCapabilityIfMissing('dim');
          this.setCapabilityValue('dim', value / 255).catch(this.error);
          this.triggerGenericFlow('dp2_level', value);
        }
        break;
        
      case 101: // Commonly battery
        if (typeof value === 'number' && value >= 0 && value <= 100) {
          this.addCapabilityIfMissing('measure_battery');
          this.setCapabilityValue('measure_battery', value).catch(this.error);
          this.triggerGenericFlow('dp101_battery', value);
        }
        break;
        
      case 102: // Often temperature
        if (typeof value === 'number') {
          this.addCapabilityIfMissing('measure_temperature');
          const temp = value > 1000 ? value / 100 : value / 10; // Handle different scales
          this.setCapabilityValue('measure_temperature', temp).catch(this.error);
          this.triggerGenericFlow('dp102_temperature', temp);
        }
        break;
        
      case 103: // Often humidity
        if (typeof value === 'number' && value >= 0 && value <= 100) {
          this.addCapabilityIfMissing('measure_humidity');
          this.setCapabilityValue('measure_humidity', value).catch(this.error);
          this.triggerGenericFlow('dp103_humidity', value);
        }
        break;
        
      default:
        // Unknown DP - expose as generic capability
        this.setCapabilityValue('measure_generic', value).catch(this.error);
        this.triggerGenericFlow('unknown_dp', { dp, value, datatype });
        
        // AI Analysis Mode - try to infer device type
        if (this.getSetting('ai_analysis_mode')) {
          this.analyzeDevicePattern(dp, value, datatype);
        }
    }
  }

  handleStandardClusterData(cluster, data) {
    switch (cluster) {
      case 'genOnOff':
        if (data.attributeName === 'onOff') {
          this.setCapabilityValue('onoff', Boolean(data.value)).catch(this.error);
        }
        break;
        
      case 'genLevelCtrl':
        if (data.attributeName === 'currentLevel') {
          this.addCapabilityIfMissing('dim');
          this.setCapabilityValue('dim', data.value / 254).catch(this.error);
        }
        break;
        
      case 'msTemperatureMeasurement':
        if (data.attributeName === 'measuredValue') {
          this.addCapabilityIfMissing('measure_temperature');
          this.setCapabilityValue('measure_temperature', data.value / 100).catch(this.error);
        }
        break;
        
      case 'msRelativeHumidity':
        if (data.attributeName === 'measuredValue') {
          this.addCapabilityIfMissing('measure_humidity');
          this.setCapabilityValue('measure_humidity', data.value / 100).catch(this.error);
        }
        break;
    }
  }

  addCapabilityIfMissing(capability) {
    if (!this.registeredCapabilities.has(capability) && !this.hasCapability(capability)) {
      try {
        this.addCapability(capability);
        this.registeredCapabilities.add(capability);
        this.log(`🎯 Auto-added capability: ${capability}`);
      } catch (err) {
        this.log(`Failed to add capability ${capability}:`, err);
      }
    }
  }

  triggerGenericFlow(flowName, data) {
    try {
      this.homey.flow.getDeviceTriggerCard('unknown_data_received')
        .trigger(this, { flow: flowName, data: JSON.stringify(data) })
        .catch(this.error);
    } catch (err) {
      // Flow card not available - ignore
    }
  }

  analyzeDevicePattern(dp, value, datatype) {
    // Simple AI pattern recognition
    const patterns = this.getPatternAnalysis();
    
    // Detect likely device type based on DP patterns
    if (patterns.hasTemperature && patterns.hasHumidity && !patterns.hasOnOff) {
      this.log('🤖 AI Analysis: Likely environmental sensor');
      this.suggestedDeviceType = 'sensor';
    } else if (patterns.hasOnOff && patterns.hasLevel) {
      this.log('🤖 AI Analysis: Likely light or dimmer');
      this.suggestedDeviceType = 'light';
    } else if (patterns.hasOnOff && patterns.hasPower) {
      this.log('🤖 AI Analysis: Likely smart plug');
      this.suggestedDeviceType = 'socket';
    }
  }

  getPatternAnalysis() {
    const analysis = {
      hasOnOff: this.dataPointLog.has('DP1'),
      hasLevel: this.dataPointLog.has('DP2'),
      hasTemperature: this.dataPointLog.has('DP102'),
      hasHumidity: this.dataPointLog.has('DP103'),
      hasBattery: this.dataPointLog.has('DP101'),
      hasPower: false
    };
    
    // Check for power-related DPs
    for (let [key, data] of this.dataPointLog) {
      if (key.includes('18') || key.includes('19') || key.includes('20')) { // Common power DPs
        analysis.hasPower = true;
        break;
      }
    }
    
    return analysis;
  }

  startAIAnalysis() {
    // Periodic analysis every 5 minutes
    this.aiAnalysisInterval = this.homey.setInterval(() => {
      if (this.dataPointLog.size > 0) {
        this.log('🧠 AI Analysis Report:');
        this.log('📊 Detected DataPoints:', Array.from(this.dataPointLog.keys()));
        this.log('📊 Pattern Analysis:', this.getPatternAnalysis());
        
        if (this.suggestedDeviceType) {
          this.log(`💡 Suggested Device Type: ${this.suggestedDeviceType}`);
        }
      }
    }, 5 * 60 * 1000);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('ai_analysis_mode')) {
      if (newSettings.ai_analysis_mode && !this.aiAnalysisInterval) {
        this.startAIAnalysis();
      } else if (!newSettings.ai_analysis_mode && this.aiAnalysisInterval) {
        this.homey.clearInterval(this.aiAnalysisInterval);
        this.aiAnalysisInterval = null;
      }
    }
  }

  async onDeleted() {
    if (this.aiAnalysisInterval) {
      this.homey.clearInterval(this.aiAnalysisInterval);
    }
  }

  // Export logged data for analysis
  getLoggedData() {
    return {
      dataPoints: Object.fromEntries(this.dataPointLog),
      clusters: Object.fromEntries(this.clusterLog),
      suggestedDeviceType: this.suggestedDeviceType,
      analysisTimestamp: new Date()
    };
  }

}

module.exports = TuyaGenericFallbackDevice;
