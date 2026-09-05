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
const { classifyInterview } = require('../utils/interviewEndpoints');

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
  
  _getCluster(endpoint, clusterRef) {
    if (!endpoint?.clusters) {return null;}
    try {
      const { findClusterOnEndpoint } = require('../zigbee/ZclClusterLexicon');
      const found = findClusterOnEndpoint(endpoint, clusterRef);
      if (found) {return found;}
    } catch (_e) { /* fallback */ }
    return endpoint.clusters[clusterRef] || null;
  }

  /**
   * Detect device type from clusters and attributes
   */
  async detectDeviceType(zclNode) {
    if (!zclNode || !zclNode.endpoints) {
      return 'unknown';
    }
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      return 'unknown';
    }
    
    // Check for specific cluster combinations
    
    // Tuya DP devices (0xEF00 / 0xED00 / 0x4000)
    if (this._getCluster(endpoint, 0xEF00) || this._getCluster(endpoint, 0xED00) || this._getCluster(endpoint, 0x4000)) {
      return 'tuya_dp';
    }
    
    // Switches (On/Off) — never count Green Power EP 242 as a gang.
    // Homey interviews for TS0002 are {1,2,242}; TS0043 remotes have 4
    // OnOff endpoints but must stay buttons (DEVICE_INTERVIEWS INT-170).
    const onOffCl = this._getCluster(endpoint, 0x0006);
    if (onOffCl) {
      const classified = classifyInterview(zclNode);
      if (classified.class === 'button' || classified.class === 'sos') {
        return classified.class;
      }
      if (classified.class === 'tuya_dp') {
        return 'tuya_dp';
      }
      if (classified.gangs >= 2) {
        return `switch_${classified.gangs}gang`;
      }
      if (this._getCluster(endpoint, 0x0008)) {
        return 'dimmer';
      }
      return classified.gangs === 1 ? 'switch' : 'switch';
    }
    
    // Lighting
    if (this._getCluster(endpoint, 0x0300)) {
      return 'light_color';
    }
    
    if (this._getCluster(endpoint, 0x0008) && !onOffCl) {
      return 'light_dimmable';
    }
    
    // Sensors
    if (this._getCluster(endpoint, 0x0406)) {
      return 'motion_sensor';
    }
    
    if (this._getCluster(endpoint, 0x0402)) {
      if (this._getCluster(endpoint, 0x0405)) {
        return 'temp_humidity_sensor';
      }
      return 'temperature_sensor';
    }
    
    if (this._getCluster(endpoint, 0x0400)) {
      return 'light_sensor';
    }
    
    // IAS Zone (contact, motion, water, smoke)
    const iasCl = this._getCluster(endpoint, 0x0500);
    if (iasCl) {
      const zoneType = iasCl.zoneType;
      
      switch (zoneType) {
      case 0x0015: return 'contact_sensor';
      case 0x000D: return 'motion_sensor';
      case 0x002A: return 'water_leak_sensor';
      case 0x0028: return 'smoke_detector';
      default: return 'alarm_sensor';
      }
    }
    
    // Window covering
    if (this._getCluster(endpoint, 0x0102)) {
      return 'curtain';
    }
    
    // Thermostat
    if (this._getCluster(endpoint, 0x0201)) {
      return 'thermostat';
    }
    
    // Door lock
    if (this._getCluster(endpoint, 0x0101)) {
      return 'lock';
    }
    
    // Smart plug (metering / electrical)
    if (this._getCluster(endpoint, 0x0702) || this._getCluster(endpoint, 0x0B04)) {
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
    const onOff = this._getCluster(endpoint, 0x0006);
    if (onOff) {
      // Configure reporting
      await onOff.configureReporting({
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
      const onOff = this._getCluster(endpoint, 0x0006);
      if (onOff) {
        await onOff.configureReporting({
          onOff: {
            minInterval: 0,
            maxInterval: 300,
            minChange: 1
          }
        }).catch(err => {});
      }
      
      // Configure Level reporting
      const levelControl = this._getCluster(endpoint, 0x0008);
      if (levelControl) {
        await levelControl.configureReporting({
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
    const iasZone = this._getCluster(endpoint, 0x0500);
    if (iasZone) {
      // Enroll IAS Zone
      await iasZone.zoneEnrollResponse({
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
    const metering = this._getCluster(endpoint, 0x0702);
    if (metering) {
      await metering.configureReporting({
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
    const windowCovering = this._getCluster(endpoint, 0x0102);
    if (windowCovering) {
      // Configure reporting
      await windowCovering.configureReporting({
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
    const thermostat = this._getCluster(endpoint, 0x0201);
    if (thermostat) {
      // Configure reporting
      await thermostat.configureReporting({
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
    if (this.homey?.log) {
      this.homey.log('[UniversalPairingManager]', ...args);
    }
  }

  error(...args) {
    if (this.homey?.error) {
      this.homey.error('[UniversalPairingManager]', ...args);
    }
  }
}

module.exports = UniversalPairingManager;
