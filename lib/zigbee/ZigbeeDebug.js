'use strict';

/**
 * ZIGBEE DEBUG HELPER
 * 
 * Helper pour debugger les devices Zigbee selon la documentation SDK v3
 * - Inspection des clusters
 * - Test d'attributs
 * - Monitoring des reports
 * - Diagnostic complet
 */

const { CLUSTER } = require('zigbee-clusters');

class ZigbeeDebug {
  constructor(device, logger) {
    this.device = device;
    this.logger = logger;
  }

  /**
   * Diagnostic complet du device Zigbee
   */
  async fullDiagnostic(zclNode) {
    this.logger.info('🔬 Starting full Zigbee diagnostic...');
    
    try {
      // 1. Node information
      await this.inspectNode(zclNode);
      
      // 2. Endpoints
      await this.inspectEndpoints(zclNode);
      
      // 3. Clusters sur chaque endpoint
      for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
        await this.inspectClusters(endpoint, epId);
      }
      
      // 4. Attributs supportés
      await this.discoverAttributes(zclNode);
      
      this.logger.info('[OK] Diagnostic complete');
      
    } catch (err) {
      this.logger.exception('[ERROR] Diagnostic failed', err);
    }
  }

  /**
   * Inspecter le ZigBeeNode
   */
  async inspectNode(zclNode) {
    const nodeInfo = {
      ieeeAddress: zclNode.ieeeAddress || 'N/A',
      manufacturerName: zclNode.manufacturerName || 'N/A',
      productId: zclNode.productId || 'N/A',
      endpoints: Object.keys(zclNode.endpoints || {})
    };
    
    this.logger.zigbeeNode(zclNode);
    return nodeInfo;
  }

  /**
   * Inspecter les endpoints
   */
  async inspectEndpoints(zclNode) {
    this.logger.zigbeeEndpoints(zclNode);
    
    const endpoints = {};
    for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
      endpoints[epId] = {
        deviceId: endpoint.deviceId,
        profileId: endpoint.profileId,
        clusterCount: Object.keys(endpoint.clusters || {}).length
      };
    }
    
    return endpoints;
  }

  /**
   * Inspecter les clusters d'un endpoint
   */
  async inspectClusters(endpoint, epId = 1) {
    this.logger.zigbeeClusters(endpoint, epId);
    
    const clusters = {};
    for (const [clusterId, cluster] of Object.entries(endpoint.clusters || {})) {
      clusters[clusterId] = {
        name: cluster.name || this._getClusterName(clusterId),
        hasAttributes: Object.keys(cluster.attrs || {}).length > 0,
        hasCommands: Object.keys(cluster.commands || {}).length > 0
      };
    }
    
    return clusters;
  }

  /**
   * Découvrir les attributs supportés
   */
  async discoverAttributes(zclNode) {
    this.logger.debug('[SEARCH] Discovering supported attributes...');
    
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      this.logger.warn('No endpoint 1 found');
      return;
    }

    // Clusters communs à tester
    const commonClusters = [
      'basic',
      'powerConfiguration',
      'temperatureMeasurement',
      'relativeHumidity',
      'illuminanceMeasurement',
      'occupancySensing',
      'iasZone',
      'onOff'
    ];

    for (const clusterName of commonClusters) {
      if (endpoint.clusters[clusterName]) {
        await this.testCluster(endpoint.clusters[clusterName], clusterName);
      }
    }
  }

  /**
   * Tester un cluster spécifique
   */
  async testCluster(cluster, clusterName) {
    this.logger.debug(`[DATA] Testing cluster: ${clusterName}`);
    
    try {
      // Lire attributs disponibles
      const attrs = cluster.attrs || {};
      const attrNames = Object.keys(attrs);
      
      if (attrNames.length > 0) {
        this.logger.debug(`Cluster ${clusterName} has ${attrNames.length} attributes:`, attrNames);
        
        // Tenter de lire quelques attributs communs
        const commonAttrs = this._getCommonAttributes(clusterName);
        for (const attrName of commonAttrs) {
          if (attrs[attrName]) {
            try {
              const value = await cluster.readAttributes(attrName);
              this.logger.zigbeeReadAttribute(clusterName, attrName, value);
            } catch (err) {
              this.logger.trace(`Cannot read ${clusterName}.${attrName}: ${err.message}`);
            }
          }
        }
      }
    } catch (err) {
      this.logger.trace(`Error testing cluster ${clusterName}: ${err.message}`);
    }
  }

  /**
   * Monitor les reports en temps réel
   */
  setupReportMonitoring(endpoint, clusterName) {
    try {
      const cluster = endpoint.clusters[clusterName];
      if (!cluster) {
        this.logger.warn(`Cluster ${clusterName} not found on endpoint`);
        return;
      }

      // Intercepter les reports
      const originalOn = cluster.on?.bind(cluster);
      if (originalOn) {
        cluster.on = (event, listener) => {
          const wrappedListener = (...args) => {
            this.logger.zigbeeReport(clusterName, { event, args });
            return listener(...args);
          };
          return originalOn(event, wrappedListener);
        };
        
        this.logger.debug(`[OK] Report monitoring enabled for ${clusterName}`);
      }
    } catch (err) {
      this.logger.exception(`Failed to setup monitoring for ${clusterName}`, err);
    }
  }

  /**
   * Obtenir le nom d'un cluster par son ID
   */
  _getClusterName(clusterId) {
    const clusterMap = {
      0: 'basic',
      1: 'powerConfiguration',
      3: 'identify',
      6: 'onOff',
      8: 'levelControl',
      1024: 'illuminanceMeasurement',
      1026: 'temperatureMeasurement',
      1029: 'relativeHumidity',
      1030: 'pressureMeasurement',
      1280: 'iasZone',
      61184: 'tuyaManufacturerCluster'
    };
    
    return clusterMap[clusterId] || `cluster_${clusterId}`;
  }

  /**
   * Attributs communs par cluster
   */
  _getCommonAttributes(clusterName) {
    const commonAttrs = {
      basic: ['manufacturerName', 'modelId', 'powerSource', 'zclVersion'],
      powerConfiguration: ['batteryPercentageRemaining', 'batteryVoltage'],
      temperatureMeasurement: ['measuredValue', 'minMeasuredValue', 'maxMeasuredValue'],
      relativeHumidity: ['measuredValue'],
      illuminanceMeasurement: ['measuredValue'],
      occupancySensing: ['occupancy', 'occupancySensorType'],
      iasZone: ['zoneState', 'zoneType', 'zoneStatus', 'iasCieAddress'],
      onOff: ['onOff']
    };
    
    return commonAttrs[clusterName] || [];
  }

  /**
   * Dump complet d'un device (pour debug)
   */
  async dumpDevice(zclNode) {
    const dump = {
      timestamp: new Date().toISOString(),
      device: {
        name: this.device.getName(),
        class: this.device.getClass(),
        capabilities: this.device.getCapabilities(),
        settings: this.device.getSettings(),
        state: this.device.getState()
      },
      zigbee: {
        ieeeAddress: zclNode.ieeeAddress,
        manufacturerName: zclNode.manufacturerName,
        productId: zclNode.productId,
        endpoints: {}
      }
    };

    // Dump endpoints
    for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
      dump.zigbee.endpoints[epId] = {
        deviceId: endpoint.deviceId,
        profileId: endpoint.profileId,
        clusters: {}
      };

      // Dump clusters
      for (const [clusterId, cluster] of Object.entries(endpoint.clusters || {})) {
        dump.zigbee.endpoints[epId].clusters[clusterId] = {
          name: cluster.name || this._getClusterName(clusterId),
          attributes: Object.keys(cluster.attrs || {}),
          commands: Object.keys(cluster.commands || {})
        };
      }
    }

    this.logger.debug('📋 Complete device dump:', dump);
    return dump;
  }
}

module.exports = ZigbeeDebug;
