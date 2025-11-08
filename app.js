'use strict';

const Homey = require('homey');
const { registerCustomClusters } = require('./lib/registerClusters');
const FlowCardManager = require('./lib/FlowCardManager');
const CapabilityManager = require('./lib/utils/CapabilityManager');
const AdvancedAnalytics = require('./lib/analytics/AdvancedAnalytics');
const SmartDeviceDiscovery = require('./lib/discovery/SmartDeviceDiscovery');
const PerformanceOptimizer = require('./lib/performance/PerformanceOptimizer');
const UnknownDeviceHandler = require('./lib/UnknownDeviceHandler');
const SystemLogsCollector = require('./lib/SystemLogsCollector');
const DeviceIdentificationDatabase = require('./lib/DeviceIdentificationDatabase');
const DiagnosticAPI = require('./lib/diagnostics/DiagnosticAPI');
const { LogBuffer } = require('./lib/utils/LogBuffer');
const SuggestionEngine = require('./lib/smartadapt/SuggestionEngine');
const { processMigrationQueue } = require('./lib/utils/migration-queue'); // ✅ FIX CRITIQUE

class UniversalTuyaZigbeeApp extends Homey.App {
  _flowCardsRegistered = false;
  flowCardManager = null;
  capabilityManager = null;
  analytics = null;
  discovery = null;
  optimizer = null;
  unknownHandler = null;
  systemLogsCollector = null;
  identificationDatabase = null;
  diagnosticAPI = null; // 🔬 For MCP/AI integration
  logBuffer = null; // 📝 MCP-accessible log buffer
  suggestionEngine = null; // 🤖 Non-destructive Smart-Adapt


  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    // PATCH 5: Global unhandledRejection handler to prevent cascade crashes
    process.on('unhandledRejection', (reason, promise) => {
      try {
        this.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
        // Log but don't crash the entire app
      } catch (e) {
        console.error('Error logging unhandledRejection', e);
      }
    });

    if (this._flowCardsRegistered) {
      this.log('⏭️  Flow cards already registered');
      return;
    }
    
    this._flowCardsRegistered = true;

    this.log('Universal Tuya Zigbee App is initializing...');

    // Initialize CapabilityManager for safe capability creation
    this.capabilityManager = new CapabilityManager(this.homey);
    this.log('✅ CapabilityManager initialized');
    
    // 🤖 Initialize Intelligent Device Identification Database
    // Scans ALL drivers and builds comprehensive ID database
    this.identificationDatabase = new DeviceIdentificationDatabase(this.homey);
    await this.identificationDatabase.buildDatabase();
    this.log('✅ Intelligent Device Identification Database built');

    // CRITICAL: Register custom Zigbee clusters FIRST
    // This must happen before any devices initialize
    try {
      registerCustomClusters(this);
      this.log('✅ Custom Zigbee clusters registered');
    } catch (err) {
      this.error('❌ Failed to register custom clusters:', err);
    }

    // Register ALL flow cards (+33 nouveaux!)
    this.flowCardManager = new FlowCardManager(this.homey);
    this.flowCardManager.registerAll();
    this.log('✅ Flow cards registered (+33 nouveaux)');
    
    // Initialize Advanced Analytics
    this.analytics = new AdvancedAnalytics(this.homey);
    await this.analytics.initialize();
    this.log('✅ Advanced Analytics initialized');
    
    // Initialize Smart Device Discovery
    this.discovery = new SmartDeviceDiscovery(this.homey);
    await this.discovery.initialize();
    this.log('✅ Smart Device Discovery initialized');
    
    // Initialize Performance Optimizer
    this.optimizer = new PerformanceOptimizer({
      maxCacheSize: 1000,
      maxCacheMemory: 10 * 1024 * 1024 // 10 MB
    });
    this.log('✅ Performance Optimizer initialized');
    
    // Initialize Unknown Device Handler
    this.unknownHandler = new UnknownDeviceHandler(this.homey);
    this.log('✅ Unknown Device Handler initialized');
    
    // Initialize System Logs Collector for Diagnostics
    this.systemLogsCollector = new SystemLogsCollector(this.homey);
    this.log('✅ System Logs Collector initialized');
    
    // 🔬 Initialize Diagnostic API for MCP/AI integration
    this.diagnosticAPI = new DiagnosticAPI(this);
    this.log('✅ Diagnostic API initialized (MCP-ready)');
    
    // 📝 Initialize LogBuffer for MCP-accessible logs
    this.logBuffer = new LogBuffer(this.homey);
    this.log('✅ LogBuffer initialized (accessible via ManagerSettings)');
    
    // 🤖 Initialize SuggestionEngine for non-destructive Smart-Adapt
    this.suggestionEngine = new SuggestionEngine(this.homey, this.logBuffer);
    this.log('✅ SuggestionEngine initialized (non-destructive mode)');
    
    // DISABLED: SDK3 doesn't allow overriding this.log (read-only property)
    // this._setupDiagnosticLogging();
    // DiagnosticAPI and LogBuffer still work via direct calls
    
    // Register additional global flow cards
    this.registerFlowCards();
    
    // Initialize Homey Insights
    await this.initializeInsights();

    this.log('✅ Universal Tuya Zigbee App has been initialized');
    this.log('🚀 Advanced systems: Analytics, Discovery, Performance, Unknown Device Detection, System Logs, Intelligent ID Database');
    
    // Log capability stats
    const stats = this.capabilityManager.getStats();
    this.log(`📊 Capabilities managed: ${stats.created}`);
    
    // ✅ FIX CRITIQUE: Worker migration queue (60s delay)
    setTimeout(() => {
      this.processMigrations().catch(err => {
        this.error('[MIGRATION-WORKER] Error:', err.message);
      });
    }, 60000); // Wait 60s for Zigbee to be ready
  }
  
  /**
   * Process migration queue worker
   * ✅ FIX: Exécute les migrations en queue de manière sécurisée
   */
  async processMigrations() {
    try {
      this.log('[MIGRATION-WORKER] 🔄 Starting...');
      const processed = await processMigrationQueue(this.homey);
      this.log(`[MIGRATION-WORKER] ✅ Processed ${processed} migrations`);
    } catch (err) {
      this.error('[MIGRATION-WORKER] ❌ Error:', err.message);
    }
  }
  
  /**
   * Get system logs for diagnostic reports
   * This method is called by Homey when generating diagnostic reports
   */
  async onDiagnostic() {
    this.log('📊 Generating diagnostic report with system logs...');
    
    try {
      // Collect all system logs
      const systemLogsReport = await this.systemLogsCollector.formatForDiagnosticReport();
      
      // Get app-specific information
      const appInfo = {
        appId: this.homey.manifest.id,
        version: this.homey.manifest.version,
        capabilities: this.capabilityManager ? this.capabilityManager.getStats() : {},
        analytics: this.analytics ? await this.analytics.getAnalyticsReport() : {},
        performance: this.optimizer ? this.optimizer.getStats() : {},
        identificationDatabase: this.identificationDatabase ? this.identificationDatabase.getStats() : null,
        diagnostics: this.diagnosticAPI ? this.diagnosticAPI.getFullReport(true) : null // 🔬 MCP/AI data
      };
      
      // Combine everything
      const report = [
        '═'.repeat(80),
        '📊 UNIVERSAL TUYA ZIGBEE - COMPREHENSIVE DIAGNOSTIC REPORT',
        '═'.repeat(80),
        '',
        `Generated: ${new Date().toISOString()}`,
        `App: ${appInfo.appId} v${appInfo.version}`,
        '',
        '─'.repeat(80),
        '📱 APP-SPECIFIC INFORMATION',
        '─'.repeat(80),
        `Capabilities Created: ${appInfo.capabilities.created || 0}`,
        `Capabilities Cached: ${appInfo.capabilities.cached || 0}`,
        '',
        appInfo.identificationDatabase ? [
          '─'.repeat(80),
          '🤖 INTELLIGENT DEVICE IDENTIFICATION DATABASE',
          '─'.repeat(80),
          `Device Types: ${appInfo.identificationDatabase.deviceTypes || 0}`,
          `Total Manufacturer IDs: ${appInfo.identificationDatabase.totalManufacturerIds || 0}`,
          `Total Product IDs: ${appInfo.identificationDatabase.totalProductIds || 0}`,
          `Drivers Scanned: ${appInfo.identificationDatabase.drivers || 0}`,
          `Last Update: ${appInfo.identificationDatabase.lastUpdate || 'Never'}`,
          ''
        ].join('\n') : '',
        appInfo.diagnostics ? [
          '─'.repeat(80),
          '🔬 DIAGNOSTIC API - MCP/AI INTEGRATION',
          '─'.repeat(80),
          `Total Logs: ${appInfo.diagnostics.diagnostics.summary.totalLogs || 0}`,
          `Total Errors: ${appInfo.diagnostics.diagnostics.summary.totalErrors || 0}`,
          `Total Devices: ${appInfo.diagnostics.diagnostics.summary.totalDevices || 0}`,
          `Critical Errors: ${appInfo.diagnostics.diagnostics.summary.criticalErrors || 0}`,
          `Recent Errors (5min): ${appInfo.diagnostics.diagnostics.summary.recentErrors || 0}`,
          '',
          appInfo.diagnostics.diagnostics.topErrors.length > 0 ? [
            'Top Errors:',
            ...appInfo.diagnostics.diagnostics.topErrors.slice(0, 5).map((e, i) => 
              `  ${i + 1}. [${e.category}] ${e.message.substring(0, 80)} (${e.count}x)`
            ),
            ''
          ].join('\n') : '',
          appInfo.diagnostics.diagnostics.recommendations.length > 0 ? [
            'AI Recommendations:',
            ...appInfo.diagnostics.diagnostics.recommendations.slice(0, 3).map((r, i) => 
              `  ${i + 1}. [${r.priority}] ${r.suggestedFix}`
            ),
            ''
          ].join('\n') : ''
        ].join('\n') : '',
        systemLogsReport,
        '',
        '═'.repeat(80),
        'END OF DIAGNOSTIC REPORT',
        '═'.repeat(80)
      ].join('\n');
      
      this.log('✅ Diagnostic report generated successfully');
      
      return report;
      
    } catch (err) {
      this.error('❌ Failed to generate diagnostic report:', err);
      return `Error generating diagnostic report: ${err.message}`;
    }
  }

  /**
   * Register Homey Native Flow Cards
   * Implements all native Homey SDK3 flow functionality
   */
  registerFlowCards() {
    this.log('📋 Registering Homey Native Flow Cards...');

    try {
      // CONDITION: Device is online/offline - REMOVED (not defined in flow cards)
      // this.homey.flow.getConditionCard('is_online')
      //   .registerRunListener(async (args) => {
      //     return args.device.getAvailable();
      //   });
      
      // CONDITION: Battery below threshold - REMOVED (not defined in flow cards)
      // this.homey.flow.getConditionCard('battery_below')
      //   .registerRunListener(async (args) => {
      //     if (!args.device.hasCapability('measure_battery')) {
      //       return false;
      //     }
      //     const batteryLevel = args.device.getCapabilityValue('measure_battery');
      //     return batteryLevel < args.percentage;
      //   });
      
      // ACTION: Identify device (blink/beep)
      // DISABLED: Flow card not defined in app.json - causes "Invalid Flow Card ID: identify_device" error
      // this.homey.flow.getActionCard('identify_device')
      //   .registerRunListener(async (args) => {
      //     if (typeof args.device.identify === 'function') {
      //       await args.device.identify();
      //     } else {
      //       // Fallback: toggle device quickly
      //       if (args.device.hasCapability('onoff')) {
      //         const original = args.device.getCapabilityValue('onoff');
      //         await args.device.setCapabilityValue('onoff', !original);
      //         await new Promise(resolve => setTimeout(resolve, 500));
      //         await args.device.setCapabilityValue('onoff', original);
      //       }
      //     }
      //   });
      
      // ACTION: Check firmware updates
      // DISABLED: Flow card not defined in app.json - would cause "Invalid Flow Card ID" error
      // this.homey.flow.getActionCard('check_firmware_update')
      //   .registerRunListener(async (args) => {
      //     if (typeof args.device.checkFirmwareUpdate === 'function') {
      //       await args.device.checkFirmwareUpdate();
      //     }
      //   });
      
      // ACTION: Reset device to defaults
      // DISABLED: Flow card not defined in app.json - would cause "Invalid Flow Card ID" error
      // this.homey.flow.getActionCard('reset_device')
      //   .registerRunListener(async (args) => {
      //     if (typeof args.device.resetDevice === 'function') {
      //       await args.device.resetDevice();
      //     }
      //   });

      this.log('✅ Homey Native Flow Cards registered (0 cards - all custom cards disabled to prevent errors)');
    } catch (err) {
      this.error('⚠️  Error registering flow cards:', err.message);
      // Don't crash the app if flow cards fail to register
    }
  }
  
  /**
   * Setup diagnostic logging to capture all logs for MCP/AI
   */
  _setupDiagnosticLogging() {
    // Store original methods
    const originalLog = this.log.bind(this);
    const originalError = this.error.bind(this);
    
    // Override log method
    this.log = (...args) => {
      const message = args.join(' ');
      
      // Determine category and level
      let category = 'APP';
      let level = 'INFO';
      
      if (message.includes('ZIGBEE')) category = 'ZIGBEE';
      else if (message.includes('CLUSTER')) category = 'CLUSTER';
      else if (message.includes('DEVICE')) category = 'DEVICE';
      else if (message.includes('FLOW')) category = 'FLOW';
      else if (message.includes('BATTERY')) category = 'BATTERY';
      
      if (message.includes('⚠️') || message.includes('WARN')) level = 'WARN';
      
      // Add to diagnostic API
      if (this.diagnosticAPI) {
        this.diagnosticAPI.addLog(level, category, message);
      }
      
      // Add to LogBuffer (for MCP access via ManagerSettings)
      if (this.logBuffer) {
        this.logBuffer.push(level, category, message).catch(() => {
          // Ignore errors to prevent crash
        });
      }
      
      // Call original
      originalLog(...args);
    };
    
    // Override error method
    this.error = (...args) => {
      const message = args.join(' ');
      
      // Determine category
      let category = 'APP';
      if (message.includes('ZIGBEE')) category = 'ZIGBEE';
      else if (message.includes('CLUSTER')) category = 'CLUSTER';
      else if (message.includes('DEVICE')) category = 'DEVICE';
      else if (message.includes('FLOW')) category = 'FLOW';
      
      // Add to diagnostic API
      if (this.diagnosticAPI) {
        this.diagnosticAPI.addLog('ERROR', category, message);
      }
      
      // Add to LogBuffer (for MCP access via ManagerSettings)
      if (this.logBuffer) {
        this.logBuffer.push('ERROR', category, message).catch(() => {
          // Ignore errors to prevent crash
        });
      }
      
      // Call original
      originalError(...args);
    };
  }
  
  /**
   * Get diagnostic API report (accessible for MCP/AI)
   * Can be called externally for real-time diagnostics
   */
  getDiagnosticReport() {
    if (!this.diagnosticAPI) {
      return { error: 'DiagnosticAPI not initialized' };
    }
    return this.diagnosticAPI.exportForAI();
  }
  
  /**
   * Get LogBuffer logs (MCP-accessible via ManagerSettings)
   * @returns {Promise<Object>} MCP-formatted log export
   */
  async getMCPLogs() {
    if (!this.logBuffer) {
      return { error: 'LogBuffer not initialized' };
    }
    return await this.logBuffer.exportForMCP();
  }
  
  /**
   * Get Smart-Adapt suggestions (non-destructive)
   * @returns {Object} MCP-formatted suggestions export
   */
  getMCPSuggestions() {
    if (!this.suggestionEngine) {
      return { error: 'SuggestionEngine not initialized' };
    }
    return this.suggestionEngine.exportForMCP();
  }
  
  /**
   * Get complete MCP diagnostic package
   * @returns {Promise<Object>} All diagnostic data for MCP/AI
   */
  async getCompleteMCPDiagnostics() {
    return {
      version: '1.0.0',
      exported: new Date().toISOString(),
      diagnosticAPI: this.getDiagnosticReport(),
      logBuffer: await this.getMCPLogs(),
      suggestions: this.getMCPSuggestions(),
      mcp: {
        protocol: 'homey-universal-tuya-zigbee',
        readable: true,
        settingsKey: 'debug_log_buffer'
      }
    };
  }
  
  /**
   * Initialize Homey Insights
   */
  async initializeInsights() {
    this.log('📊 Initializing Homey Insights...');
    
    try {
      // Battery health insight
      await this.homey.insights.createLog('battery_health', {
        title: { en: 'Battery Health', fr: 'Santé Batterie' },
        type: 'number',
        units: '%',
        decimals: 0
      }).catch(() => {}); // Already exists
      
      // Device uptime insight
      await this.homey.insights.createLog('device_uptime', {
        title: { en: 'Device Uptime', fr: 'Disponibilité' },
        type: 'number',
        units: '%',
        decimals: 1
      }).catch(() => {});
      
      // Zigbee LQI insight
      await this.homey.insights.createLog('zigbee_lqi', {
        title: { en: 'Zigbee Link Quality', fr: 'Qualité Lien Zigbee' },
        type: 'number',
        units: '',
        decimals: 0
      }).catch(() => {});
      
      // Command success rate insight
      await this.homey.insights.createLog('command_success_rate', {
        title: { en: 'Command Success Rate', fr: 'Taux Succès Commandes' },
        type: 'number',
        units: '%',
        decimals: 1
      }).catch(() => {});
      
      this.log('✅ Homey Insights initialized (4 logs)');
    } catch (err) {
      this.error('⚠️  Error initializing insights:', err.message);
    }
  }

}

module.exports = UniversalTuyaZigbeeApp;
