'use strict';

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');

/**
 * DiagnosticLogsCollector - Mixin pour ajouter la collecte de logs
 * aux rapports diagnostics de device
 */
function DiagnosticLogsCollector(superclass) {
  return class extends superclass {
    
    constructor(...args) {
      super(...args);
      
      this.diagnosticLogsBuffer = [];
      this.maxDiagnosticLogs = 2000;
      
      this._originalLog = this.log.bind(this);
      this._originalError = this.error.bind(this);
      
      try {
        Object.defineProperty(this, 'log', {
          value: (...args) => {
            this._originalLog(...args);
            this.addToDiagnosticBuffer('log', args);
          },
          writable: true,
          configurable: true
        });
      } catch (e) {}
      
      try {
        Object.defineProperty(this, 'error', {
          value: (...args) => {
            this._originalError(...args);
            this.addToDiagnosticBuffer('error', args);
          },
          writable: true,
          configurable: true
        });
      } catch (e) {}
    }
    
    addToDiagnosticBuffer(level, args) {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message: args.map(arg => {
          if (typeof arg === 'object') {
            try { return JSON.stringify(arg); } catch { return String(arg); }
          }
          return String(arg);
        }).join(' ')
      };
      
      this.diagnosticLogsBuffer.push(entry);
      if (this.diagnosticLogsBuffer.length > this.maxDiagnosticLogs) {
        this.diagnosticLogsBuffer.shift();
      }
    }
    
    async onGetDiagnosticData() {
      this.log(' [DIAGNOSTIC] Collecting device diagnostic data...');
      
      return {
        timestamp: new Date().toISOString(),
        deviceInfo: await this.collectDeviceInfo(),
        capabilities: await this.collectCapabilitiesInfo(),
        settings: await this.collectSettingsInfo(),
        zigbeeInfo: await this.collectZigbeeInfo(),
        allLogs: this.diagnosticLogsBuffer,
        errorLogs: this.diagnosticLogsBuffer.filter(l => l.level === 'error'),
        tuyaState: await this.collectTuyaState(),
        storeValues: await this.collectStoreValues(),
        protocolInfo: this.collectProtocolInfo(),
        architectureContext: this.collectArchitectureContext(),
        statistics: await this.collectStatistics()
      };
    }
    
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
    
    async collectCapabilitiesInfo() {
      const info = { capabilities: this.getCapabilities(), values: {}, errors: [] };
      for (const cap of info.capabilities) {
        try {
          info.values[cap] = await this.getCapabilityValue(cap);
        } catch (err) {
          info.errors.push({ capability: cap, error: err.message });
        }
      }
      return info;
    }
    
    async collectSettingsInfo() {
      try { return this.getSettings(); } catch (err) { return { error: err.message }; }
    }
    
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
        
        for (const epId of info.node.endpoints) {
          const endpoint = this.zclNode.endpoints[epId];
          if (endpoint) {
            info.endpoints[epId] = {
              deviceId: endpoint.deviceId,
              profileId: endpoint.profileId,
              clusters: Object.keys(endpoint.clusters || {})
            };
            
            for (const clusterName of Object.keys(endpoint.clusters || {})) {
              const cluster = endpoint.clusters[clusterName];
              if (cluster) {
                if (!info.clusters[clusterName]) info.clusters[clusterName] = [];
                info.clusters[clusterName].push({
                  endpoint: epId,
                  id: cluster.id,
                  attributes: Object.keys(cluster.attributes || {})
                });
              }
            }
          }
        }
      }
      
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
    
    async collectTuyaState() {
      const state = { protocol: 'unknown', dpMappings: null, ef00Manager: null, lastDpValues: {}, adaptiveParser: null };
      try {
        if (this._protocol) state.protocol = this._protocol;
        else if (this._tuyaEF00Manager) state.protocol = 'TUYA_DP';
        else state.protocol = 'ZCL';
        
        if (typeof this.dpMappings === 'object') {
          try { state.dpMappings = JSON.parse(JSON.stringify(this.dpMappings)); } catch(e) {}
        }
        
        if (this._tuyaEF00Manager) {
          const mgr = this._tuyaEF00Manager;
          state.ef00Manager = {
            initialized: !!mgr._initialized,
            passiveMode: !!mgr.passiveMode,
            dpCount: mgr._dpHandlers ? Object.keys(mgr._dpHandlers).length : 0,
            registeredDPs: mgr._dpHandlers ? Object.keys(mgr._dpHandlers).map(Number) : [],
            lastSeqNr: mgr._seqNr || 0,
            pendingCommands: mgr._pendingCommands?.length || 0
          };
          if (mgr._adaptiveDataParser) {
            state.adaptiveParser = {
              learnedTypes: mgr._adaptiveDataParser._learnedTypes ? Object.fromEntries(mgr._adaptiveDataParser._learnedTypes) : {},
              divisors: mgr._adaptiveDataParser._divisors ? Object.fromEntries(mgr._adaptiveDataParser._divisors) : {}
            };
          }
          if (mgr._lastDpValues) {
            for (const [dp, val] of Object.entries(mgr._lastDpValues)) {
              state.lastDpValues[dp] = { value: val.value, type: val.type, ts: val.timestamp ? new Date(val.timestamp).toISOString() : null };
            }
          }
        }
      } catch(e) { state.error = e.message; }
      return state;
    }
    
    async collectStoreValues() {
      const store = {};
      const keys = ['lastSeen', 'last_data_received', 'deviceProfile', 'gangCount', 'sceneMode'];
      for (const k of keys) {
        try {
          const v = this.getStoreValue ? await this.getStoreValue(k) : undefined;
          if (v !== null && v !== undefined) store[k] = v;
        } catch(e) {}
      }
      return store;
    }

    collectProtocolInfo() {
      const info = { baseClass: 'unknown', mixins: [], protocolDetection: null, deviceProfile: null };
      try {
        const chain = [];
        let proto = Object.getPrototypeOf(this);
        while (proto && proto.constructor && proto.constructor.name && proto.constructor.name !== 'Object') {
          chain.push(proto.constructor.name);
          proto = Object.getPrototypeOf(proto);
        }
        info.baseClass = chain[chain.length - 1] || 'unknown';
        info.classChain = chain;
        info.mixins = chain.filter(n => /Mixin/.test(n));
        
        if (this._detectProtocol) {
          try { info.protocolDetection = this._detectProtocol(); } catch(e) {}
        }
        
        if (this.getDeviceProfile) {
          try {
            const p = this.getDeviceProfile();
            info.deviceProfile = p ? { id: p.id, deviceType: p.deviceType, protocol: p.protocol, gangCount: p.gangCount } : null;
          } catch(e) {}
        }
      } catch(e) { info.error = e.message; }
      return info;
    }

    collectArchitectureContext() {
      return {
        appArchitecture: {
          protocols: {
            TUYA_DP: 'Cluster CLUSTERS.TUYA_EF00',
            ZCL: 'Standard Zigbee Cluster Library'
          }
        }
      };
    }

    async collectStatistics() {
      return {
        totalLogs: this.diagnosticLogsBuffer.length,
        totalErrors: this.diagnosticLogsBuffer.filter(l => l.level === 'error').length
      };
    }
    
    async formatDiagnosticReport() {
      const data = await this.onGetDiagnosticData();
      return JSON.stringify(data, null, 2);
    }
  };
}

module.exports = DiagnosticLogsCollector;
