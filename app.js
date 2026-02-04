'use strict';

// v5.8.25: Patch color-space module to fix Homey sandbox require('./rgb') error
// Must be BEFORE any homey-zigbeedriver imports
try {
  const colorShim = require('./lib/shims/color-space-shim');
  require.cache[require.resolve('color-space/hsv')] = { exports: colorShim.hsv };
  require.cache[require.resolve('color-space/rgb')] = { exports: colorShim.rgb };
  require.cache[require.resolve('color-space/xyz')] = { exports: colorShim.xyz };
  require.cache[require.resolve('color-space/xyy')] = { exports: colorShim.xyy };
} catch (e) { /* Shim not critical if color-space works */ }

// v5.3.62: Prevent MaxListenersExceededWarning for apps with many devices
// This is a global fix that applies to ALL EventEmitters in the app
const { EventEmitter } = require('events');
EventEmitter.defaultMaxListeners = 50;

const Homey = require('homey');
const { registerCustomClusters } = require('./lib/zigbee/registerClusters');
const FlowCardManager = require('./lib/flow/FlowCardManager');
const UniversalFlowCardLoader = require('./lib/flow/UniversalFlowCardLoader');
const CapabilityManager = require('./lib/utils/CapabilityManager');
const AdvancedAnalytics = require('./lib/analytics/AdvancedAnalytics');
const SmartDeviceDiscovery = require('./lib/discovery/SmartDeviceDiscovery');
const PerformanceOptimizer = require('./lib/performance/PerformanceOptimizer');
const UnknownDeviceHandler = require('./lib/helpers/UnknownDeviceHandler');
const SystemLogsCollector = require('./lib/diagnostics/SystemLogsCollector');
const DeviceIdentificationDatabase = require('./lib/helpers/DeviceIdentificationDatabase');
const DiagnosticAPI = require('./lib/diagnostics/DiagnosticAPI');
const { LogBuffer } = require('./lib/utils/LogBuffer');
const SuggestionEngine = require('./lib/smartadapt/SuggestionEngine');
const { processMigrationQueue } = require('./lib/utils/migration-queue'); // ✅ FIX CRITIQUE
const OTAUpdateManager = require('./lib/ota/OTAUpdateManager'); // 📦 OTA Firmware Updates
const QuirksDatabase = require('./lib/quirks/QuirksDatabase'); // 🔧 Device Quirks
const EmergencyDeviceFix = require('./lib/emergency/EmergencyDeviceFix'); // 🚨 Emergency Fix System
// NOTE: Database updates are handled by GitHub Actions ONLY, NOT at runtime
// See: .github/workflows/MASTER-intelligent-enrichment.yml
const SourceCredits = require('./lib/data/SourceCredits'); // 📜 Source attributions

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
  otaManager = null; // 📦 OTA Firmware Update Manager
  quirksDatabase = null; // 🔧 Device Quirks Database
  // NOTE: Database updates handled by GitHub Actions, not at runtime
  developerDebugMode = false; // 🔍 AUDIT V2: Contrôle verbosity logs
  experimentalSmartAdapt = false; // ⚠️ AUDIT V2: Modifications capabilities opt-in


  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    // AUDIT V2: Initialize Developer Settings FIRST
    this.initializeSettings();

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
    this.log(`📊 Mode: ${this.developerDebugMode ? 'DEVELOPER (verbose)' : 'PRODUCTION (minimal logs)'}`);
    this.log(`🤖 Smart-Adapt: ${this.experimentalSmartAdapt ? 'EXPERIMENTAL (modifies)' : 'READ-ONLY (safe)'}`);
    this.log(`🔧 MaxListeners: ${EventEmitter.defaultMaxListeners} (prevents warnings with many devices)`);

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

    // v5.5.597: Universal Flow Card Loader for sub-capabilities and generic DP
    this.universalFlowLoader = new UniversalFlowCardLoader(this.homey);
    await this.universalFlowLoader.initialize();
    this.log('✅ Universal Flow Card Loader initialized (sub-capabilities + DP)');

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

    // 📦 Initialize OTA Firmware Update Manager
    this.otaManager = new OTAUpdateManager(this.homey);
    this.log('✅ OTA Update Manager initialized');

    // 📜 Database updates handled by GitHub Actions ONLY (not at runtime)
    // See: .github/workflows/MASTER-intelligent-enrichment.yml (weekly)
    // See: .github/workflows/AUTO-discover-new-devices.yml (daily)
    this.log(`📜 Data sources: ${SourceCredits.getAllSources().length} contributors credited`);
    this.log('ℹ️ Database updates: GitHub Actions only (no runtime fetches)');

    // 🔧 Initialize Quirks Database
    this.quirksDatabase = QuirksDatabase;
    this.log('✅ Quirks Database initialized');

    // DISABLED: SDK3 doesn't allow overriding this.log (read-only property)
    // this._setupDiagnosticLogging();
    // DiagnosticAPI and LogBuffer still work via direct calls

    // Register additional global flow cards
    this.registerFlowCards();

    // Register OTA flow cards
    this.registerOTAFlowCards();

    // Initialize Homey Insights
    await this.initializeInsights();

    this.log('✅ Universal Tuya Zigbee App has been initialized');
    this.log('🚀 Advanced systems: Analytics, Discovery, Performance, OTA, Quirks, System Logs, Intelligent ID Database');

    // Log capability stats
    const stats = this.capabilityManager.getStats();
    this.log(`📊 Capabilities managed: ${stats.created}`);

    // v5.3.63: Scan for phantom sub-devices and mark them unavailable
    this._scanForPhantomDevices();

    // v5.3.68: Clear old migration queue on startup (prevents notification spam)
    this._clearMigrationQueue();

    // ✅ FIX CRITIQUE: Worker migration queue (60s delay) - DISABLED in v5.3.68
    // Migration notifications were confusing users with "undefined → soil_sensor"
    // Users should delete phantom devices manually instead
    /*
    setTimeout(() => {
      this.processMigrations().catch(err => {
        this.error('[MIGRATION-WORKER] Error:', err.message);
      });
    }, 60000);
    */
  }

  /**
   * v5.3.68: Clear migration queue to stop notification spam
   */
  async _clearMigrationQueue() {
    try {
      await this.homey.settings.set('__migration_queue__', []);
      this.log('[MIGRATION] ✅ Migration queue cleared');
    } catch (err) {
      this.log('[MIGRATION] Could not clear queue:', err.message);
    }
  }

  /**
   * v5.3.85: Mark phantom device as unavailable (SDK3 cannot delete programmatically)
   * NOTE: Homey SDK3 does NOT support programmatic device deletion!
   * Users MUST delete phantom devices manually from the Homey app.
   */
  async markPhantomDevice(device) {
    try {
      const deviceData = device?.getData?.();
      const deviceName = device?.getName?.() || 'Unknown';
      const subDeviceId = deviceData?.subDeviceId;

      this.error(`[PHANTOM] ❌ Phantom device detected: "${deviceName}" (subDeviceId: ${subDeviceId})`);
      this.error('[PHANTOM] ❌ SDK3 cannot delete devices programmatically!');
      this.error('[PHANTOM] ❌ User must delete this device manually from Homey app');

      // Mark as unavailable with clear message
      await device.setUnavailable('❌ PHANTOM - Supprimez manuellement dans l\'app Homey').catch(() => { });

      return true;
    } catch (err) {
      this.error('[PHANTOM] Error marking device:', err.message);
      return false;
    }
  }

  /**
   * @deprecated Use markPhantomDevice instead
   */
  async deleteDevice(device) {
    return this.markPhantomDevice(device);
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

      // 🚨 v5.2.30: Run emergency device fix after migrations
      this.log('[EMERGENCY-FIX] 🚨 Running emergency device fixes...');
      const fixResults = await EmergencyDeviceFix.runAll(this.homey);
      this.log(`[EMERGENCY-FIX] ✅ Fixed: migrations=${fixResults.migrationFixed}, devices=${fixResults.devicesFixed}, DPs=${fixResults.dpRequestsSent}`);

    } catch (err) {
      this.error('[MIGRATION-WORKER] ❌ Error:', err.message);
    }
  }

  /**
   * v5.3.63: Scan all devices for phantom sub-devices and mark them unavailable
   * Phantom devices have a subDeviceId but shouldn't exist (e.g., climate sensors)
   */
  async _scanForPhantomDevices() {
    try {
      this.log('[PHANTOM-SCAN] 🔍 Scanning for phantom sub-devices...');

      const drivers = this.homey.drivers.getDrivers();
      let phantomCount = 0;
      let realCount = 0;

      // Drivers that should NEVER have sub-devices
      const noSubDeviceDrivers = [
        'climate_sensor',
        'motion_sensor',
        'contact_sensor',
        'water_leak_sensor',
        'smoke_sensor',
        'gas_sensor',
        'co_sensor',
        'plug_smart',
        'plug_energy_monitor',
        'bulb_dimmable',
        'bulb_rgb',
        'bulb_rgbw',
        'bulb_white',
        'bulb_tunable_white',
        'led_strip',
        'radiator_valve',
        'thermostat'
      ];

      for (const driver of Object.values(drivers)) {
        const driverId = driver.id || '';
        const devices = driver.getDevices() || [];

        for (const device of devices) {
          try {
            const data = device.getData?.() || {};
            const hasSubDeviceId = data.subDeviceId !== undefined;
            const isNoSubDeviceDriver = noSubDeviceDrivers.some(d => driverId.includes(d));

            if (hasSubDeviceId && isNoSubDeviceDriver) {
              phantomCount++;
              this.log(`[PHANTOM-SCAN] ⚠️ PHANTOM: ${device.getName?.()} (subDeviceId: ${data.subDeviceId})`);

              // Mark as unavailable with clear message
              if (typeof device.setUnavailable === 'function') {
                device.setUnavailable(
                  `⚠️ Appareil fantôme (subDevice ${data.subDeviceId}). Supprimez cet appareil.`
                ).catch(() => { });
              }
            } else {
              realCount++;
            }
          } catch (err) {
            // Skip devices that error
          }
        }
      }

      if (phantomCount > 0) {
        this.log(`[PHANTOM-SCAN] ⚠️ Found ${phantomCount} phantom devices - marked as unavailable`);
        this.log(`[PHANTOM-SCAN] ✅ ${realCount} real devices OK`);
        this.log(`[PHANTOM-SCAN] ℹ️ User should DELETE phantom devices from Homey app`);
      } else {
        this.log(`[PHANTOM-SCAN] ✅ No phantom devices found (${realCount} devices OK)`);
      }
    } catch (err) {
      this.error('[PHANTOM-SCAN] Error:', err.message);
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
   * Register OTA Firmware Update Flow Cards
   * v5.5.556: Safe registration - all errors go to stdout, not stderr
   * v5.5.551: Each flow card wrapped in individual try/catch to prevent crashes
   */
  registerOTAFlowCards() {
    this.log('📦 Registering OTA Flow Cards...');
    let registered = 0;

    // v5.5.556: Helper to safely register flow cards (no stderr output)
    const safeRegister = (type, id, handler) => {
      try {
        const method = type === 'trigger' ? 'getTriggerCard' : 
                       type === 'action' ? 'getActionCard' : 'getConditionCard';
        const card = this.homey.flow[method](id);
        if (card) {
          card.registerRunListener(handler);
          registered++;
          return card;
        }
      } catch (err) {
        // v5.5.556: Log to stdout only, not stderr
        this.log(`[FLOW] Flow card '${id}' not defined - skipping`);
      }
      return null;
    };

    try {

    // OTA Flow Cards (optional - may not be defined)
    this._otaUpdateAvailable = safeRegister('trigger', 'ota_update_available', 
      async () => true);
    
    safeRegister('trigger', 'ota_update_completed', async () => true);
    
    safeRegister('action', 'ota_check_updates', async (args) => {
      this.log('[OTA] Checking for updates via flow action...');
      const devices = Object.values(this.homey.drivers.getDrivers())
        .flatMap(driver => Object.values(driver.getDevices()));
      let updatesFound = 0;
      for (const device of devices) {
        try {
          const update = await this.otaManager?.checkUpdate(device);
          if (update?.available) {
            updatesFound++;
            if (this._otaUpdateAvailable) {
              await this._otaUpdateAvailable.trigger({
                device_name: device.getName(),
                current_version: String(update.currentVersion),
                new_version: String(update.newVersion)
              });
            }
          }
        } catch (err) { /* Continue */ }
      }
      this.log(`[OTA] Found ${updatesFound} updates available`);
      return true;
    });

    // Device Health Flow Cards (optional)
    safeRegister('trigger', 'device_offline', async () => true);
    safeRegister('trigger', 'device_online', async () => true);
    safeRegister('trigger', 'low_battery_warning', async () => true);
    safeRegister('trigger', 'zigbee_signal_weak', async () => true);

    // ACTION: Identify device - v5.5.551: Safe wrapper
    safeRegister('action', 'device_identify', async (args) => {
      try {
        if (!args?.device || typeof args.device.getName !== 'function') {
          this.error('[IDENTIFY] Device not available (may have been deleted)');
          return false;
        }
        const device = args.device;
        this.log(`[IDENTIFY] Identifying device: ${device.getName()}`);
        const endpoint = device.zclNode?.endpoints?.[1];
        if (endpoint?.clusters?.identify) {
          await endpoint.clusters.identify.identify({ identifyTime: 10 });
          this.log(`[IDENTIFY] Device ${device.getName()} is blinking`);
        } else if (device.hasCapability('onoff')) {
          const original = device.getCapabilityValue('onoff');
          await device.setCapabilityValue('onoff', !original);
          await new Promise(r => setTimeout(r, 500));
          await device.setCapabilityValue('onoff', original);
        }
        return true;
      } catch (err) {
        this.error(`[IDENTIFY] Error:`, err.message);
        return false;
      }
    });

    // CONDITION: Device is online - v5.5.551: Safe wrapper
    safeRegister('condition', 'device_is_online', async (args) => {
      try {
        if (!args?.device || typeof args.device.getAvailable !== 'function') {
          return false;
        }
        return args.device.getAvailable();
      } catch (err) {
        this.error('[FLOW] device_is_online error:', err.message);
        return false;
      }
    });

    this.log(`✅ OTA/Health Flow Cards registered (${registered} cards)`);

    // ═══════════════════════════════════════════════════════════════════
    // v5.5.409: GENERIC TUYA DP FLOW CARDS (Inspired by com.tuya2)
    // v5.5.551: All wrapped in safeRegister to prevent crashes
    // ═══════════════════════════════════════════════════════════════════
    this.log('ℹ️ Tuya DP Flow Cards skipped (SDK3 compatibility)');
      /*
      try {
        // TRIGGER: Receive DP Boolean
        this.homey.flow.getTriggerCard('receive_dp_boolean')
          .registerRunListener(async (args, state) => {
            return state.dp_id === args.dp_id;
          });

        // TRIGGER: Receive DP Number
        this.homey.flow.getTriggerCard('receive_dp_number')
          .registerRunListener(async (args, state) => {
            return state.dp_id === args.dp_id;
          });

        // TRIGGER: Receive DP String
        this.homey.flow.getTriggerCard('receive_dp_string')
          .registerRunListener(async (args, state) => {
            return state.dp_id === args.dp_id;
          });

        // TRIGGER: Receive ANY DP (for debugging)
        this.homey.flow.getTriggerCard('receive_dp_any')
          .registerRunListener(async (args, state) => true);

        this.log('✅ Tuya DP Trigger Flow Cards registered (4 cards)');
      } catch (err) {
        this.error('⚠️ Error registering DP trigger flow cards:', err.message);
      }
    */

    // v5.8.20: Removed invalid flow card registrations (send_dp_boolean, etc.)
    // Use tuya_dp_send from .homeycompose instead
    // Registration handled by UniversalFlowCardLoader
    this.log('ℹ️ Generic DP Flow Cards: use tuya_dp_send action card');
    /*
    // DISABLED: These flow cards don't exist - causes "Invalid Flow Card ID" error
    try {
        this.homey.flow.getActionCard('send_dp_boolean_DISABLED')
          .registerRunListener(async (args) => {
            try {
              const device = args.device;
              const dpId = args.dp_id;
              const value = args.value;
              this.log(`[DP-ACTION] Sending Boolean DP${dpId}=${value} to ${device.getName()}`);

              if (typeof device.sendTuyaDP === 'function') {
                await device.sendTuyaDP(dpId, 'bool', value);
              } else if (device.zclNode?.endpoints?.[1]?.clusters?.tuya) {
                const { Cluster } = require('zigbee-clusters');
                const TuyaCluster = Cluster.getCluster('tuya');
                await device.zclNode.endpoints[1].clusters.tuya.datapoint({
                  status: 0,
                  transid: Math.floor(Math.random() * 255),
                  dp: dpId,
                  datatype: 1, // Boolean
                  length: 1,
                  data: [value ? 1 : 0]
                });
              }
              return true;
            } catch (err) {
              this.error(`[DP-ACTION] Error sending boolean:`, err.message);
              return false;
            }
          });

        // ACTION: Send DP Number
        this.homey.flow.getActionCard('send_dp_number')
          .registerRunListener(async (args) => {
            try {
              const device = args.device;
              const dpId = args.dp_id;
              const value = Math.round(args.value);
              this.log(`[DP-ACTION] Sending Number DP${dpId}=${value} to ${device.getName()}`);

              if (typeof device.sendTuyaDP === 'function') {
                await device.sendTuyaDP(dpId, 'value', value);
              } else if (device.zclNode?.endpoints?.[1]?.clusters?.tuya) {
                const data = Buffer.alloc(4);
                data.writeUInt32BE(value, 0);
                await device.zclNode.endpoints[1].clusters.tuya.datapoint({
                  status: 0,
                  transid: Math.floor(Math.random() * 255),
                  dp: dpId,
                  datatype: 2, // Value (uint32)
                  length: 4,
                  data: [...data]
                });
              }
              return true;
            } catch (err) {
              this.error(`[DP-ACTION] Error sending number:`, err.message);
              return false;
            }
          });

        // ACTION: Send DP String/Enum
        this.homey.flow.getActionCard('send_dp_string')
          .registerRunListener(async (args) => {
            try {
              const device = args.device;
              const dpId = args.dp_id;
              const value = args.value;
              this.log(`[DP-ACTION] Sending String DP${dpId}="${value}" to ${device.getName()}`);

              // Try to parse as enum (number) first
              const enumValue = parseInt(value, 10);
              if (!isNaN(enumValue) && enumValue >= 0 && enumValue <= 255) {
                // It's an enum value
                if (typeof device.sendTuyaDP === 'function') {
                  await device.sendTuyaDP(dpId, 'enum', enumValue);
                } else if (device.zclNode?.endpoints?.[1]?.clusters?.tuya) {
                  await device.zclNode.endpoints[1].clusters.tuya.datapoint({
                    status: 0,
                    transid: Math.floor(Math.random() * 255),
                    dp: dpId,
                    datatype: 4, // Enum
                    length: 1,
                    data: [enumValue]
                  });
                }
              } else {
                // It's a string
                if (typeof device.sendTuyaDP === 'function') {
                  await device.sendTuyaDP(dpId, 'string', value);
                } else if (device.zclNode?.endpoints?.[1]?.clusters?.tuya) {
                  const strBuffer = Buffer.from(value, 'utf8');
                  await device.zclNode.endpoints[1].clusters.tuya.datapoint({
                    status: 0,
                    transid: Math.floor(Math.random() * 255),
                    dp: dpId,
                    datatype: 3, // String
                    length: strBuffer.length,
                    data: [...strBuffer]
                  });
                }
              }
              return true;
            } catch (err) {
              this.error(`[DP-ACTION] Error sending string:`, err.message);
              return false;
            }
          });

        // ACTION: Send DP Raw (hex bytes)
        this.homey.flow.getActionCard('send_dp_raw')
          .registerRunListener(async (args) => {
            try {
              const device = args.device;
              const dpId = args.dp_id;
              const hexValue = args.value.replace(/\s/g, '');
              const data = Buffer.from(hexValue, 'hex');
              this.log(`[DP-ACTION] Sending Raw DP${dpId}=[${hexValue}] to ${device.getName()}`);

              if (typeof device.sendTuyaDP === 'function') {
                await device.sendTuyaDP(dpId, 'raw', data);
              } else if (device.zclNode?.endpoints?.[1]?.clusters?.tuya) {
                await device.zclNode.endpoints[1].clusters.tuya.datapoint({
                  status: 0,
                  transid: Math.floor(Math.random() * 255),
                  dp: dpId,
                  datatype: 0, // Raw
                  length: data.length,
                  data: [...data]
                });
              }
              return true;
            } catch (err) {
              this.error(`[DP-ACTION] Error sending raw:`, err.message);
              return false;
            }
          });

        this.log('✅ Generic Tuya DP Flow Cards registered (8 cards)');

      } catch (err) {
        // v5.5.556: Log to stdout only, not stderr
        this.log('⚠️ Error registering DP action flow cards:', err.message);
      }
    */
    // END v5.8.20: Disabled invalid flow card registrations

    } catch (err) {
      // v5.5.556: Log to stdout only, not stderr
      this.log('⚠️ Error registering OTA flow cards:', err.message);
    }
  }

  /**
   * Get OTA Update Manager (for external access)
   */
  getOTAManager() {
    return this.otaManager;
  }

  /**
   * Get Quirks Database (for external access)
   */
  getQuirksDatabase() {
    return this.quirksDatabase;
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
      }).catch(() => { }); // Already exists

      // Device uptime insight
      await this.homey.insights.createLog('device_uptime', {
        title: { en: 'Device Uptime', fr: 'Disponibilité' },
        type: 'number',
        units: '%',
        decimals: 1
      }).catch(() => { });

      // Zigbee LQI insight
      await this.homey.insights.createLog('zigbee_lqi', {
        title: { en: 'Zigbee Link Quality', fr: 'Qualité Lien Zigbee' },
        type: 'number',
        units: '',
        decimals: 0
      }).catch(() => { });

      // Command success rate insight
      await this.homey.insights.createLog('command_success_rate', {
        title: { en: 'Command Success Rate', fr: 'Taux Succès Commandes' },
        type: 'number',
        units: '%',
        decimals: 1
      }).catch(() => { });

      // OTA update tracking insight
      await this.homey.insights.createLog('ota_updates', {
        title: { en: 'OTA Updates Available', fr: 'Mises à jour OTA disponibles' },
        type: 'number',
        units: '',
        decimals: 0
      }).catch(() => { });

      // Device offline count insight
      await this.homey.insights.createLog('devices_offline', {
        title: { en: 'Devices Offline', fr: 'Appareils hors ligne' },
        type: 'number',
        units: '',
        decimals: 0
      }).catch(() => { });

      this.log('✅ Homey Insights initialized (6 logs)');
    } catch (err) {
      this.error('⚠️  Error initializing insights:', err.message);
    }
  }

  /**
   * AUDIT V2: Initialize Developer Settings
   * Manages developer_debug_mode and experimental_smart_adapt flags
   */
  initializeSettings() {
    // Get settings with defaults
    this.developerDebugMode = this.homey.settings.get('developer_debug_mode') ?? false;
    this.experimentalSmartAdapt = this.homey.settings.get('experimental_smart_adapt') ?? false;

    // Listen for settings changes
    this.homey.settings.on('set', (key) => {
      if (key === 'developer_debug_mode') {
        this.developerDebugMode = this.homey.settings.get('developer_debug_mode');
        this.log(`🔍 [AUDIT V2] Developer Debug Mode: ${this.developerDebugMode ? 'ENABLED (verbose)' : 'DISABLED (minimal)'}`);
      }

      if (key === 'experimental_smart_adapt') {
        this.experimentalSmartAdapt = this.homey.settings.get('experimental_smart_adapt');
        this.log(`🤖 [AUDIT V2] Experimental Smart-Adapt: ${this.experimentalSmartAdapt ? 'ENABLED (modifies capabilities)' : 'DISABLED (read-only)'}`);

        // Warn user if enabling experimental mode
        if (this.experimentalSmartAdapt) {
          this.log('⚠️  WARNING: Experimental Smart-Adapt will MODIFY device capabilities!');
          this.log('⚠️  Only enable if you understand the risks.');
        }
      }
    });

    // Log initial state
    this.log(`[AUDIT V2] Settings initialized:`);
    this.log(`  - Developer Debug: ${this.developerDebugMode}`);
    this.log(`  - Experimental Smart-Adapt: ${this.experimentalSmartAdapt}`);
  }

  /**
   * Helper method for conditional logging (AUDIT V2)
   * Only logs if developer_debug_mode is enabled
   */
  debugLog(...args) {
    if (this.developerDebugMode) {
      this.log('[DEBUG]', ...args);
    }
  }

}

module.exports = UniversalTuyaZigbeeApp;
