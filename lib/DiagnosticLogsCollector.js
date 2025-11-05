'use strict';

/**
 * DiagnosticLogsCollector - Mixin pour ajouter la collecte de logs
 * aux rapports diagnostics de device
 * 
 * Usage:
 * const DiagnosticLogsCollector = require('./DiagnosticLogsCollector');
 * 
 * class MyDevice extends DiagnosticLogsCollector(ZigBeeDevice) {
 *   // Logs seront automatiquement collectés
 * }
 */

function DiagnosticLogsCollector(superclass) {
  return class extends superclass {
    
    constructor(...args) {
      super(...args);
      
      // Buffer pour stocker les logs locaux
      this.diagnosticLogsBuffer = [];
      this.maxDiagnosticLogs = 500; // Max 500 logs par device
      
      // Intercepter les méthodes log/error
      this._originalLog = this.log.bind(this);
      this._originalError = this.error.bind(this);
      
      // Override log method
      this.log = (...args) => {
        this._originalLog(...args);
        this.addToDiagnosticBuffer('log', args);
      };
      
      // Override error method
      this.error = (...args) => {
        this._originalError(...args);
        this.addToDiagnosticBuffer('error', args);
      };
    }
    
    /**
     * Ajoute un log au buffer de diagnostic
     */
    addToDiagnosticBuffer(level, args) {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message: args.map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ')
      };
      
      this.diagnosticLogsBuffer.push(entry);
      
      // Limiter la taille du buffer
      if (this.diagnosticLogsBuffer.length > this.maxDiagnosticLogs) {
        this.diagnosticLogsBuffer.shift();
      }
    }
    
    /**
     * Récupère les logs pour le diagnostic report
     */
    async onGetDiagnosticData() {
      this.log('📊 [DIAGNOSTIC] Collecting device diagnostic data...');
      
      const diagnosticData = {
        timestamp: new Date().toISOString(),
        deviceInfo: await this.collectDeviceInfo(),
        capabilities: await this.collectCapabilitiesInfo(),
        settings: await this.collectSettingsInfo(),
        zigbeeInfo: await this.collectZigbeeInfo(),
        recentLogs: this.diagnosticLogsBuffer.slice(-100), // Last 100 logs
        errorLogs: this.diagnosticLogsBuffer.filter(l => l.level === 'error').slice(-20), // Last 20 errors
        statistics: await this.collectStatistics()
      };
      
      return diagnosticData;
    }
    
    /**
     * Collecte les informations du device
     */
    async collectDeviceInfo() {
      return {
        id: this.getData().id || 'unknown',
        name: this.getName(),
        class: this.getClass(),
        driverId: this.driver?.id || 'unknown',
        available: this.getAvailable(),
        lastSeen: this.getStoreValue('lastSeen') || 'unknown'
      };
    }
    
    /**
     * Collecte les informations des capabilities
     */
    async collectCapabilitiesInfo() {
      const info = {
        capabilities: this.getCapabilities(),
        values: {},
        errors: []
      };
      
      for (const cap of info.capabilities) {
        try {
          info.values[cap] = await this.getCapabilityValue(cap);
        } catch (err) {
          info.errors.push({
            capability: cap,
            error: err.message
          });
        }
      }
      
      return info;
    }
    
    /**
     * Collecte les settings
     */
    async collectSettingsInfo() {
      try {
        return this.getSettings();
      } catch (err) {
        return { error: err.message };
      }
    }
    
    /**
     * Collecte les informations Zigbee
     */
    async collectZigbeeInfo() {
      const info = {
        ieee: this.getData().ieee || 'unknown',
        endpoints: {},
        clusters: {},
        node: null
      };
      
      if (this.zclNode) {
        info.node = {
          manufacturerName: this.zclNode.manufacturerName || 'unknown',
          modelId: this.zclNode.modelId || 'unknown',
          available: this.zclNode.available,
          endpoints: Object.keys(this.zclNode.endpoints || {})
        };
        
        // Collecter info des endpoints
        for (const epId of info.node.endpoints) {
          const endpoint = this.zclNode.endpoints[epId];
          if (endpoint) {
            info.endpoints[epId] = {
              deviceId: endpoint.deviceId,
              profileId: endpoint.profileId,
              clusters: Object.keys(endpoint.clusters || {})
            };
            
            // Collecter info des clusters
            for (const clusterName of Object.keys(endpoint.clusters || {})) {
              const cluster = endpoint.clusters[clusterName];
              if (cluster) {
                if (!info.clusters[clusterName]) {
                  info.clusters[clusterName] = [];
                }
                info.clusters[clusterName].push({
                  endpoint: epId,
                  id: cluster.id,
                  attributes: Object.keys(cluster.attributes || {}).slice(0, 20) // Limiter à 20
                });
              }
            }
          }
        }
      }
      
      // Smart Adaptation Info
      if (this.smartAdaptationResult) {
        info.smartAdaptation = {
          success: this.smartAdaptationResult.success,
          deviceType: this.smartAdaptationResult.clusterAnalysis?.deviceType,
          powerSource: this.smartAdaptationResult.clusterAnalysis?.powerSource,
          features: this.smartAdaptationResult.clusterAnalysis?.features,
          needsAdaptation: this.smartAdaptationResult.comparison?.needsAdaptation
        };
      }
      
      return info;
    }
    
    /**
     * Collecte les statistiques
     */
    async collectStatistics() {
      return {
        totalLogs: this.diagnosticLogsBuffer.length,
        totalErrors: this.diagnosticLogsBuffer.filter(l => l.level === 'error').length,
        oldestLog: this.diagnosticLogsBuffer[0]?.timestamp || 'none',
        newestLog: this.diagnosticLogsBuffer[this.diagnosticLogsBuffer.length - 1]?.timestamp || 'none'
      };
    }
    
    /**
     * Formate le diagnostic en texte lisible
     */
    async formatDiagnosticReport() {
      const data = await this.onGetDiagnosticData();
      
      const report = [];
      
      report.push('═'.repeat(70));
      report.push(`📊 DEVICE DIAGNOSTIC REPORT: ${data.deviceInfo.name}`);
      report.push('═'.repeat(70));
      report.push('');
      report.push(`Generated: ${data.timestamp}`);
      report.push('');
      
      // Device Info
      report.push('─'.repeat(70));
      report.push('📱 DEVICE INFORMATION');
      report.push('─'.repeat(70));
      report.push(`Name: ${data.deviceInfo.name}`);
      report.push(`ID: ${data.deviceInfo.id}`);
      report.push(`Class: ${data.deviceInfo.class}`);
      report.push(`Driver: ${data.deviceInfo.driverId}`);
      report.push(`Available: ${data.deviceInfo.available ? 'YES' : 'NO'}`);
      report.push(`Last Seen: ${data.deviceInfo.lastSeen}`);
      report.push('');
      
      // Capabilities
      report.push('─'.repeat(70));
      report.push('✨ CAPABILITIES');
      report.push('─'.repeat(70));
      report.push(`Capabilities (${data.capabilities.capabilities.length}): ${data.capabilities.capabilities.join(', ')}`);
      report.push('');
      report.push('Current Values:');
      for (const [cap, value] of Object.entries(data.capabilities.values)) {
        report.push(`   ${cap}: ${value}`);
      }
      if (data.capabilities.errors.length > 0) {
        report.push('');
        report.push('⚠️  Capability Errors:');
        data.capabilities.errors.forEach(err => {
          report.push(`   ${err.capability}: ${err.error}`);
        });
      }
      report.push('');
      
      // Zigbee Info
      report.push('─'.repeat(70));
      report.push('🔷 ZIGBEE INFORMATION');
      report.push('─'.repeat(70));
      report.push(`IEEE Address: ${data.zigbeeInfo.ieee}`);
      if (data.zigbeeInfo.node) {
        report.push(`Manufacturer: ${data.zigbeeInfo.node.manufacturerName}`);
        report.push(`Model ID: ${data.zigbeeInfo.node.modelId}`);
        report.push(`ZCL Node Available: ${data.zigbeeInfo.node.available ? 'YES' : 'NO'}`);
        report.push(`Endpoints: ${data.zigbeeInfo.node.endpoints.join(', ')}`);
        report.push('');
        report.push('Clusters by Endpoint:');
        for (const [epId, epInfo] of Object.entries(data.zigbeeInfo.endpoints)) {
          report.push(`   Endpoint ${epId}:`);
          report.push(`      Clusters: ${epInfo.clusters.join(', ')}`);
        }
      }
      
      // Smart Adaptation
      if (data.zigbeeInfo.smartAdaptation) {
        report.push('');
        report.push('🤖 Smart Adaptation:');
        report.push(`   Success: ${data.zigbeeInfo.smartAdaptation.success ? 'YES' : 'NO'}`);
        report.push(`   Device Type: ${data.zigbeeInfo.smartAdaptation.deviceType || 'unknown'}`);
        report.push(`   Power Source: ${data.zigbeeInfo.smartAdaptation.powerSource || 'unknown'}`);
        report.push(`   Features: ${data.zigbeeInfo.smartAdaptation.features?.join(', ') || 'none'}`);
        report.push(`   Needs Adaptation: ${data.zigbeeInfo.smartAdaptation.needsAdaptation ? 'YES' : 'NO'}`);
      }
      report.push('');
      
      // Settings
      report.push('─'.repeat(70));
      report.push('⚙️  SETTINGS');
      report.push('─'.repeat(70));
      if (data.settings.error) {
        report.push(`Error: ${data.settings.error}`);
      } else {
        for (const [key, value] of Object.entries(data.settings)) {
          report.push(`   ${key}: ${value}`);
        }
      }
      report.push('');
      
      // Statistics
      report.push('─'.repeat(70));
      report.push('📊 STATISTICS');
      report.push('─'.repeat(70));
      report.push(`Total Logs: ${data.statistics.totalLogs}`);
      report.push(`Total Errors: ${data.statistics.totalErrors}`);
      report.push(`Oldest Log: ${data.statistics.oldestLog}`);
      report.push(`Newest Log: ${data.statistics.newestLog}`);
      report.push('');
      
      // Recent Logs
      report.push('─'.repeat(70));
      report.push(`📋 RECENT LOGS (Last ${Math.min(20, data.recentLogs.length)})`);
      report.push('─'.repeat(70));
      data.recentLogs.slice(-20).forEach(log => {
        report.push(`[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`);
      });
      report.push('');
      
      // Error Logs
      if (data.errorLogs.length > 0) {
        report.push('─'.repeat(70));
        report.push(`❌ ERROR LOGS (Last ${data.errorLogs.length})`);
        report.push('─'.repeat(70));
        data.errorLogs.forEach(log => {
          report.push(`[${log.timestamp}] ${log.message}`);
        });
        report.push('');
      }
      
      report.push('═'.repeat(70));
      report.push('END OF DEVICE DIAGNOSTIC REPORT');
      report.push('═'.repeat(70));
      
      return report.join('\n');
    }
  };
}

module.exports = DiagnosticLogsCollector;
