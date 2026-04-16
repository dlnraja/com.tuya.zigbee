'use strict';

/**
 * UniversalPairingManager - Universal Device Pairing
 * 
 * Inspired by fairecasoimeme/ZiGate pairing patterns
 * Intelligent device identification and configuration
 * 
 * Features:
 * - Automatic device type detection
 * - Quirk application
 * - Endpoint fixing
 * - Cluster configuration
 * - Custom initialization
 */

const QuirksDatabase = require('../quirks/QuirksDatabase');

class UniversalPairingManager {
  
  constructor(homey) {
    this.homey = homey;
  }
  
  /**
   * Identify and configure device
   */
  async identifyDevice(zclNode, options = {}) {
    try {
      const { manufacturerName, modelId } = zclNode;
      
      this.log(`[Pairing] Identifying device: ${manufacturerName} / ${modelId}`);
      
      // Check quirks database
      const quirk = QuirksDatabase.findQuirk(manufacturerName, modelId);
      
      if (quirk) {
        this.log(`[Pairing] Quirk found: ${quirk.name}`);
        await this.applyQuirk(zclNode, quirk);
      }
      
      // Detect device type
      const deviceType = await this.detectDeviceType(zclNode);
      this.log(`[Pairing] Device type detected: ${deviceType}`);
      
      // Configure based on type
      await this.configureDevice(zclNode, deviceType, quirk);
      
      return {
        success: true,
        deviceType: deviceType,
        quirk: quirk ? quirk.name : null
      };
      
    } catch (err) {
      this.error('[Pairing] Identification failed:', err);
      throw err;
    }
  }
  
  /**
   * Apply device quirk
   */
  async applyQuirk(zclNode, quirk) {
    const quirks = quirk.quirks;
    
    // Force OnOff cluster
    if (quirks.forceOnOff) {
      this.log('[Pairing] Applying forceOnOff quirk');
      zclNode.forceCluster = 'onOff';
      
      // Disable level control if specified
      if (quirks.disableLevelControl) {
        zclNode.disableLevelControl = true;
      }
    }
    
    // Multi-endpoint handling
    if (quirks.multiEndpoint && quirks.endpoints) {
      this.log('[Pairing] Applying multiEndpoint quirk');
      
      for (const [epId, clusters] of Object.entries(quirks.endpoints)) {
        const endpoint = zclNode.endpoints[epId];
        if (endpoint) {
          endpoint.expectedClusters = clusters;
        }
      }
    }
    
    // Fix endpoint descriptor
    if (quirks.fixEndpoint) {
      this.log('[Pairing] Fixing endpoint descriptor');
      await this.fixEndpointDescriptor(zclNode);
    }
    
    // Tuya DP device
    if (quirks.tuyaDP) {
      this.log('[Pairing] Configuring Tuya DP device');
      zclNode.isTuyaDP = true;
      zclNode.tuyaClusters = quirks.clusters || [0xEF00];
    }
    
    // Xiaomi special handling
    if (quirks.xiaomiSpecial) {
      this.log('[Pairing] Enabling Xiaomi special handling');
      zclNode.isXiaomi = true;
      zclNode.manufacturerCode = quirks.manufacturerCode || 0x115F;
    }
    
    // Keep-alive
    if (quirks.keepAlive) {
      this.log('[Pairing] Enabling keep-alive');
      zclNode.keepAlive = true;
      zclNode.keepAliveInterval = quirks.keepAliveInterval || 3600000;
    }
    
    // Custom init function
    if (quirks.customInit && typeof quirks.customInit === 'function') {
      this.log('[Pairing] Running custom init');
      await quirks.customInit(zclNode);
    }
  }
  
  /**
   * Detect device type from clusters and attributes
   */
  async detectDeviceType(zclNode) {
    const endpoint = zclNode.endpoints[1];
    
    if (!endpoint) {
      return 'unknown';
    }
    
    const clusters = endpoint.clusters || {};
    
    // Check for specific cluster combinations
    
    // Tuya DP devices
    if (clusters[0xEF00] || clusters[0xED00]) {
      return 'tuya_dp';
    }
    
    // Switches (On/Off)
    if (clusters.onOff) {
      // Check if multi-endpoint (multiple gangs)
      const endpointCount = Object.keys(zclNode.endpoints).length;
      
      if (endpointCount > 2) {
        return `switch_${endpointCount - 1}gang`;
      }
      
      // Check if dimmable
      if (clusters.levelControl) {
        return 'dimmer';
      }
      
      return 'switch';
    }
    
    // Lighting
    if (clusters.colorControl) {
      return 'light_color';
    }
    
    if (clusters.levelControl && !clusters.onOff) {
      return 'light_dimmable';
    }
    
    // Sensors
    if (clusters.occupancySensing) {
      return 'motion_sensor';
    }
    
    if (clusters.temperatureMeasurement) {
      if (clusters.relativeHumidity) {
        return 'temp_humidity_sensor';
      }
      return 'temperature_sensor';
    }
    
    if (clusters.illuminanceMeasurement) {
      return 'light_sensor';
    }
    
    // IAS Zone (contact, motion, water, smoke)
    if (clusters.iasZone) {
      const zoneType = endpoint.clusters.iasZone.zoneType;
      
      switch (zoneType) {
      case 0x0015: return 'contact_sensor';
      case 0x000D: return 'motion_sensor';
      case 0x002A: return 'water_leak_sensor';
      case 0x0028: return 'smoke_detector';
      default: return 'alarm_sensor';
      }
    }
    
    // Window covering
    if (clusters.windowCovering) {
      return 'curtain';
    }
    
    // Thermostat
    if (clusters.thermostat) {
      return 'thermostat';
    }
    
    // Door lock
    if (clusters.doorLock) {
      return 'lock';
    }
    
    // Smart plug (metering)
    if (clusters.metering || clusters.electricalMeasurement) {
      return 'plug';
    }
    
    return 'unknown';
  }
  
  /**
   * Configure device based on type
   */
  async configureDevice(zclNode, deviceType, quirk) {
    this.log(`[Pairing] Configuring device type: ${deviceType}`);
    
    // Type-specific configuration
    switch (deviceType) {
    case 'tuya_dp':
      await this.configureTuyaDP(zclNode);
      break;
        
    case 'switch':
    case 'dimmer':
      await this.configureSwitch(zclNode);
      break;
        
    case 'light_color':
    case 'light_dimmable':
      await this.configureLight(zclNode);
      break;
        
    case 'motion_sensor':
    case 'contact_sensor':
    case 'water_leak_sensor':
    case 'smoke_detector':
      await this.configureSensor(zclNode);
      break;
        
    case 'plug':
      await this.configurePlug(zclNode);
      break;
        
    case 'curtain':
      await this.configureCurtain(zclNode);
      break;
        
    case 'thermostat':
      await this.configureThermostat(zclNode);
      break;
    }
  }
  
  /**
   * Configure Tuya DP device
   */
  async configureTuyaDP(zclNode) {
    // Mark as Tuya DP
    zclNode.isTuyaDP = true;
    
    // Set expected clusters
    const endpoint = zclNode.endpoints[1];
    if (endpoint) {
      endpoint.expectedClusters = [0, 3, 4, 5, 0xEF00];
    }
  }
  
  /**
   * Configure switch
   */
  async configureSwitch(zclNode) {
    const endpoint = zclNode.endpoints[1];
    
    if (endpoint && endpoint.clusters.onOff) {
      // Configure reporting
      await endpoint.clusters.onOff.configureReporting({
        onOff: {
          minInterval: 0,
          maxInterval: 300,
          minChange: 1
        }
      }).catch(err => {
        this.error('[Pairing] Configure reporting failed:', err);
      });
    }
  }
  
  /**
   * Configure light
   */
  async configureLight(zclNode) {
    const endpoint = zclNode.endpoints[1];
    
    if (endpoint) {
      // Configure OnOff reporting
      if (endpoint.clusters.onOff) {
        await endpoint.clusters.onOff.configureReporting({
          onOff: {
            minInterval: 0,
            maxInterval: 300,
            minChange: 1
          }
        }).catch(err => {});
      }
      
      // Configure Level reporting
      if (endpoint.clusters.levelControl) {
        await endpoint.clusters.levelControl.configureReporting({
          currentLevel: {
            minInterval: 1,
            maxInterval: 300,
            minChange: 5
          }
        }).catch(err => {});
      }
    }
  }
  
  /**
   * Configure sensor
   */
  async configureSensor(zclNode) {
    const endpoint = zclNode.endpoints[1];
    
    if (endpoint && endpoint.clusters.iasZone) {
      // Enroll IAS Zone
      await endpoint.clusters.iasZone.zoneEnrollResponse({
        enrollResponseCode: 0,
        zoneId: 255
      }).catch(err => {
        this.error('[Pairing] IAS Zone enroll failed:', err);
      });
    }
  }
  
  /**
   * Configure plug
   */
  async configurePlug(zclNode) {
    await this.configureSwitch(zclNode);
    
    const endpoint = zclNode.endpoints[1];
    
    // Configure metering
    if (endpoint && endpoint.clusters.metering) {
      await endpoint.clusters.metering.configureReporting({
        currentSummationDelivered: {
          minInterval: 10,
          maxInterval: 300,
          minChange: 1
        }
      }).catch(err => {});
    }
  }
  
  /**
   * Configure curtain
   */
  async configureCurtain(zclNode) {
    const endpoint = zclNode.endpoints[1];
    
    if (endpoint && endpoint.clusters.windowCovering) {
      // Configure reporting
      await endpoint.clusters.windowCovering.configureReporting({
        currentPositionLiftPercentage: {
          minInterval: 1,
          maxInterval: 300,
          minChange: 1
        }
      }).catch(err => {});
    }
  }
  
  /**
   * Configure thermostat
   */
  async configureThermostat(zclNode) {
    const endpoint = zclNode.endpoints[1];
    
    if (endpoint && endpoint.clusters.thermostat) {
      // Configure reporting
      await endpoint.clusters.thermostat.configureReporting({
        localTemperature: {
          minInterval: 10,
          maxInterval: 300,
          minChange: 50
        },
        occupiedHeatingSetpoint: {
          minInterval: 10,
          maxInterval: 300,
          minChange: 50
        }
      }).catch(err => {});
    }
  }
  
  /**
   * Fix endpoint descriptor
   */
  async fixEndpointDescriptor(zclNode) {
    // Force endpoint re-discovery
    for (const endpoint of Object.values(zclNode.endpoints)) {
      if (endpoint.discoverAttributes) {
        await endpoint.discoverAttributes().catch(err => {
          this.error('[Pairing] Discover attributes failed:', err);
        });
      }
    }
  }
  
  // Logging helpers
  log(...args) {
    console.log('[UniversalPairingManager]', ...args);
  }
  
  error(...args) {
    console.error('[UniversalPairingManager]', ...args);
  }
}

module.exports = UniversalPairingManager;
