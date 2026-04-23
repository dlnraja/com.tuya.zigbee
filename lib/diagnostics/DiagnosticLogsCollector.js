'use strict';

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


/**
 * DiagnosticLogsCollector - Mixin pour ajouter la collecte de logs
 * aux rapports diagnostics de device
 * 
 * Usage:
 * // A8: NaN Safety - use safeDivide/safeMultiply
  require('./DiagnosticLogsCollector');
 * 
 * class MyDevice extends DiagnosticLogsCollector(ZigBeeDevice) {
 *   // Logs seront automatiquement collectÃ©s
 * }
 */

function DiagnosticLogsCollector(superclass) {
  return class extends superclass {
    
    constructor(...args) {
      super(...args);
      
      // Buffer pour stocker les logs locaux
      this.diagnosticLogsBuffer = [];
      this.maxDiagnosticLogs = 2000;
      
      // Intercepter les mÃ©thodes log/error
      this._originalLog = this.log.bind(this);
      this._originalError = this.error.bind(this);
      
      // Override log method (use defineProperty to handle read-only prototypes)
      try {
        Object.defineProperty(this, 'log', {
          value: (...args) => {
            this._originalLog(...args);
            this.addToDiagnosticBuffer('log', args);
          },
          writable: true,
          configurable: true
        });
      } catch (e) {
        // Fallback: if log is truly locked, skip diagnostic interception
      }
      
      // Override error method
      try {
        Object.defineProperty(this, 'error', {
          value: (...args) => {
            this._originalError(...args);
            this.addToDiagnosticBuffer('error', args);
          },
          writable: true,
          configurable: true
        });
      } catch (e) {
        // Fallback: if error is truly locked, skip diagnostic interception
      }
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
     * RÃ©cupÃ¨re les logs pour le diagnostic report
     */
    async onGetDiagnosticData() {
      this.log(' [DIAGNOSTIC] Collecting device diagnostic data...');
      
      const diagnosticData = {
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
        node
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
                  attributes: Object.keys(cluster.attributes || {})
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
     * Collecte complete Tuya DP state: EF00 manager, dpMappings, adaptive parser, last DP values
     */
    async collectTuyaState() {
      const state = { protocol: 'unknown', dpMappings, ef00Manager, lastDpValues: {}, adaptiveParser };
      try {
        if (this._protocol) state.protocol = this._protocol;
        else if (this._tuyaEF00Manager) state.protocol = 'TUYA_DP';
        else state.protocol = 'ZCL';
        if (typeof this.dpMappings === 'object') {
          try { state.dpMappings = JSON.parse(JSON.stringify(this.dpMappings)); } catch(e) { state.dpMappings = 'error: ' + e.message; }
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
        for (let dp = 1; dp <= 120; dp++) {
          try {
            const v = this.getStoreValue ? await this.getStoreValue('dp_' + dp + '_value') : null;
            if (v !== null && v !== undefined) state.lastDpValues['store_dp' + dp] = v;
          } catch(e) {}
        }
      } catch(e) { state.error = e.message; }
      return state;
    }
    /**
     * Dump all relevant store values for full context
     */
    async collectStoreValues() {
      const store = {};
      const keys = [
        'lastSeen', 'last_data_received', 'last_battery_update', 'last_real_battery',
        'protocolMode', 'deviceProfile', 'gangCount', 'endpointMap', 'switchMode',
        'backlightMode', 'powerOnBehavior', 'childLock', 'indicatorMode',
        'calibration', 'direction', 'motorReverse', 'coverType',
        'tempOffset', 'humidityOffset', 'occupancySensitivity',
        'alarmType', 'alarmDuration', 'alarmVolume', 'alarmMelody',
        'lastPhysicalPress', 'lastAppCommand', 'firmwareVersion',
        'tuyaMcuVersion', 'adaptationResult', 'clusterBindResults',
        'reportingConfigured', 'timeSyncResult', 'sceneMode'
      ];
      for (const k of keys) {
        try {
          const v = this.getStoreValue ? await this.getStoreValue(k) : undefined;
          if (v !== null && v !== undefined) store[k] = v;
        } catch(e) {}
      }
      return store;
    }

    /**
     * Collect protocol detection info and class hierarchy
     */
    collectProtocolInfo() {
      const info = { baseClass: 'unknown', mixins: [], protocolDetection, deviceProfile };
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
          try { info.protocolDetection = this._detectProtocol(); } catch(e) { info.protocolDetection = 'error: ' + e.message; }
        }
        if (this.getDeviceProfile) {
          try {
            const p = this.getDeviceProfile();
            info.deviceProfile = p ? { id: p.id, deviceType: p.deviceType, protocol: p.protocol, gangCount: p.gangCount, quirks: p.quirks };
          } catch(e) {}
        }
        if (typeof this.mainsPowered !== 'undefined') info.mainsPowered = this.mainsPowered;
        if (this._gangCount) info.gangCount = this._gangCount;
      } catch(e) { info.error = e.message; }
      return info;
    }
    /**
     * Architecture reference embedded in every diagnostic for AI reasoning
     */
    collectArchitectureContext() {
      return {
        appArchitecture: {
          baseClasses: {
            BaseUnifiedDevice: 'Ultimate base - handles both Tuya DP (CLUSTERS.TUYA_EF00) and ZCL protocols with auto-detection',
            UnifiedSwitchBase: 'Multi-gang switches with physical button detection and power-on/backlight settings',
            UnifiedSensorBase: 'All sensors - motion, contact, temp/humidity, air quality, soil, rain, smoke',
            UnifiedPlugBase: 'Smart plugs, water valves, energy monitoring with metering clusters',
            UnifiedCoverBase: 'Curtain motors, blinds, shutters with position/tilt control',
            UnifiedLightBase: 'Bulbs, LED strips, dimmers with color temp and RGB support',
            UnifiedThermostatBase: 'TRVs, thermostats with schedule and temperature control',
            ButtonDevice: 'Wireless buttons, scene switches with multi-press detection'
          },
          protocols: {
            TUYA_DP: 'Cluster CLUSTERS.TUYA_EF00 (CLUSTERS.TUYA_EF00) - DP types: 0=Raw, 1=Bool, 2=Value(4byte), 3=String, 4=Enum, 5=Bitmap',
            ZCL: 'Standard Zigbee Cluster Library - onOff, levelControl, colorControl, etc.',
            HYBRID: 'Auto-detected per device based on manufacturerName/modelId patterns'
          },
          keyManagers: {
            TuyaEF00Manager: 'Handles DP report parsing, AdaptiveDataParser for auto-type/divisor, dpMappings for capability mapping',
            DeviceProfileRegistry: 'Per-fingerprint config: DP mappings, cluster configs, quirks, timing'
          },
          settingsKeys: { modelId: 'zb_model_id', manufacturerName: 'zb_manufacturer_name' },
          commonDPs: {
            switches: 'DP1-8=gang states, DP14=power-on, DP15=backlight, DP101=child_lock',
            sensors: 'DP1-4=primary measurements (varies by mfr), DP14=battery_state, DP15=battery_pct',
            covers: 'DP1=control(open/stop/close), DP2=position(0-100), DP3=direction, DP7=work_state',
            thermostats: 'DP1=on/off, DP2=target_temp, DP3=current_temp, DP4=mode'
          }
        },
        knownBugs: {
          doubleDivision: 'EF00Manager auto-converts via AdaptiveDataParser THEN dpMappings divisor divides again => wrong values. Fix: skip auto-convert when dpMappings divisor != 1',
          falseBattery: 'Mains devices with mainsPowered=true must NOT have measure_battery capability',
          unknownDevice: 'Check settings keys zb_model_id and zb_manufacturer_name (NOT camelCase)',
          physicalButtonMiss: 'appCommandPending timeout must be 2000ms, check _markAppCommand pattern',
          duplicateFlowTriggers: 'Need deduplication with 500ms window per capability+value'
        },
        diagnosticCodes: {
          D101: 'No manufacturerName', D102: 'No productId',
          D200: 'Cluster bind failed', D300: 'No time sync mechanism',
          D400: 'High duplicate event rate', D401: 'No events received in 24h'
        }
      };
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
      
      report.push(''.repeat(70));
      report.push(` DEVICE DIAGNOSTIC REPORT: ${data.deviceInfo.name}`);
      report.push(''.repeat(70));
      report.push('');
      report.push(`Generated: ${data.timestamp}`);
      report.push('');
      
      // Device Info
      report.push(''.repeat(70));
      report.push(' DEVICE INFORMATION');
      report.push(''.repeat(70));
      report.push(`Name: ${data.deviceInfo.name}`);
      report.push(`ID: ${data.deviceInfo.id}`);
      report.push(`Class: ${data.deviceInfo.class}`);
      report.push(`Driver: ${data.deviceInfo.driverId}`);
      report.push(`Available: ${data.deviceInfo.available ? 'YES' : 'NO'}`);
      report.push(`Last Seen: ${data.deviceInfo.lastSeen}`);
      report.push('');
      
      // Capabilities
      report.push(''.repeat(70));
      report.push(' CAPABILITIES');
      report.push(''.repeat(70));
      report.push(`Capabilities (${data.capabilities.capabilities.length}): ${data.capabilities.capabilities.join(', ')}`);
      report.push('');
      report.push('Current Values:');
      for (const [cap, value] of Object.entries(data.capabilities.values)) {
        report.push(`   ${cap}: ${value}`);
      }
      if (data.capabilities.errors.length > 0) {
        report.push('');
        report.push('  Capability Errors:');
        data.capabilities.errors.forEach(err => {
          report.push(`   ${err.capability}: ${err.error}`);
      });
      }
      report.push('');
      
      // Zigbee Info
      report.push(''.repeat(70));
      report.push(' ZIGBEE INFORMATION');
      report.push(''.repeat(70));
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
        report.push(' Smart Adaptation:');
        report.push(`   Success: ${data.zigbeeInfo.smartAdaptation.success ? 'YES' : 'NO'}`);
        report.push(`   Device Type: ${data.zigbeeInfo.smartAdaptation.deviceType || 'unknown'}`);
        report.push(`   Power Source: ${data.zigbeeInfo.smartAdaptation.powerSource || 'unknown'}`);
        report.push(`   Features: ${data.zigbeeInfo.smartAdaptation.features?.join(', ') || 'none'}`);
        report.push(`   Needs Adaptation: ${data.zigbeeInfo.smartAdaptation.needsAdaptation ? 'YES' : 'NO'}`);
      }
      report.push('');
      
      // Settings
      report.push(''.repeat(70));
      report.push('  SETTINGS');
      report.push(''.repeat(70));
      if (data.settings.error) {
        report.push(`Error: ${data.settings.error}`);
      } else {
        for (const [key, value] of Object.entries(data.settings)) {
          report.push(`   ${key}: ${value}`);
        }
      }
      report.push('');
      
      // Statistics
      report.push(''.repeat(70));
      report.push(' STATISTICS');
      report.push(''.repeat(70));
      report.push(`Total Logs: ${data.statistics.totalLogs}`);
      report.push(`Total Errors: ${data.statistics.totalErrors}`);
      report.push(`Oldest Log: ${data.statistics.oldestLog}`);
      report.push(`Newest Log: ${data.statistics.newestLog}`);
      report.push('');
      
      // Protocol Info
      report.push(''.repeat(70));
      report.push(' PROTOCOL & CLASS HIERARCHY');
      report.push(''.repeat(70));
      if (data.protocolInfo) {
        report.push('Class Chain: ' + (data.protocolInfo.classChain || []).join('  '));
        report.push('Mixins: ' + (data.protocolInfo.mixins || []).join(', '));
        if (data.protocolInfo.protocolDetection) report.push('Protocol Detection: ' + JSON.stringify(data.protocolInfo.protocolDetection));
        if (data.protocolInfo.deviceProfile) report.push('Device Profile: ' + JSON.stringify(data.protocolInfo.deviceProfile));
        if (data.protocolInfo.mainsPowered !== undefined) report.push('Mains Powered: ' + data.protocolInfo.mainsPowered);
        if (data.protocolInfo.gangCount) report.push('Gang Count: ' + data.protocolInfo.gangCount);
      }
      report.push('');

      // Tuya DP State
      report.push(''.repeat(70));
      report.push(' TUYA DP STATE');
      report.push(''.repeat(70));
      if (data.tuyaState) {
        report.push('Protocol: ' + data.tuyaState.protocol);
        if (data.tuyaState.ef00Manager) report.push('EF00 Manager: ' + JSON.stringify(data.tuyaState.ef00Manager));
        if (data.tuyaState.adaptiveParser) report.push('Adaptive Parser: ' + JSON.stringify(data.tuyaState.adaptiveParser));
        if (data.tuyaState.dpMappings) report.push('DP Mappings: ' + JSON.stringify(data.tuyaState.dpMappings, null, 2));
        if (Object.keys(data.tuyaState.lastDpValues).length > 0) {
          report.push('Last DP Values:');
          for (const [dp, val] of Object.entries(data.tuyaState.lastDpValues)) {
            report.push('   ' + dp + ': ' + JSON.stringify(val));
          }
        }
      }
      report.push('');

      // Store Values
      report.push(''.repeat(70));
      report.push(' STORE VALUES');
      report.push(''.repeat(70));
      if (data.storeValues && Object.keys(data.storeValues).length > 0) {
        for (const [k, v] of Object.entries(data.storeValues)) {
          report.push('   ' + k + ': ' + JSON.stringify(v));
        }
      } else {
        report.push('   (no store values)');
      }
      report.push('');

      // ALL Logs (untruncated)
      report.push(''.repeat(70));
      report.push(` ALL LOGS (${data.allLogs.length} entries)`);
      report.push(''.repeat(70));
      data.allLogs.forEach(log => {
        report.push(`[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`);
      });
      report.push('');
      
      // Error Logs
      if (data.errorLogs.length > 0) {
        report.push(''.repeat(70));
        report.push(` ALL ERROR LOGS ( ${data.errorLogs.length})`);
        report.push(''.repeat(70));
        data.errorLogs.forEach(log => {
          report.push(`[${log.timestamp}] ${log.message}`);
      });
        report.push('');
      }
      
      // Architecture Context for AI
      report.push(''.repeat(70));
      report.push('  ARCHITECTURE REFERENCE (for AI reasoning)');
      report.push(''.repeat(70));
      if (data.architectureContext) {
        report.push(JSON.stringify(data.architectureContext, null, 2));
      }
      report.push('');

      report.push(''.repeat(70));
      report.push('END OF DEVICE DIAGNOSTIC REPORT');
      report.push(''.repeat(70));
      
      return report.join('\n');
    }
  };
}

module.exports = DiagnosticLogsCollector;



