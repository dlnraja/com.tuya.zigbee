const Homey = require('homey');

// v7.5.8: Global Flow Card Helper for SDK3 compatibility
// Fixes "this._getFlowCard is not a function" in legacy-style drivers
Homey.Driver.prototype._getFlowCard = function(id, type) {
  try {
    if (type === 'trigger') return this.homey.flow.getDeviceTriggerCard(id);
    if (type === 'condition') return this.homey.flow.getDeviceConditionCard(id);
    if (type === 'action') return this.homey.flow.getDeviceActionCard(id);
    // Fallback for generic calls
    return this.homey.flow.getDeviceTriggerCard(id) 
        || this.homey.flow.getDeviceConditionCard(id) 
        || this.homey.flow.getDeviceActionCard(id);
  } catch (e) {
    if (this.error) this.error(`[FLOW-SAFE] Failed to get flow card ${id}: ${e.message}`);
    return null;
  }
};

const { safeDivide, safeMultiply, safeParse } = require('./lib/utils/tuyaUtils.js');

// v5.11.185: Suppress punycode DEP0040 deprecation from transitive deps
// (whatwg-url@5/tr46@0.0.3 via node-fetch@2  not our code)
require('./lib/suppress-punycode');

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
const { processMigrationQueue } = require('./lib/utils/migration-queue'); //  FIX CRITIQUE
const OTAUpdateManager = require('./lib/ota/OTAUpdateManager'); //  OTA Firmware Updates
const QuirksDatabase = require('./lib/quirks/QuirksDatabase'); //  Device Quirks
const EmergencyDeviceFix = require('./lib/emergency/EmergencyDeviceFix'); //  Emergency Fix System
// NOTE: Database updates are handled by GitHub Actions ONLY, NOT at runtime
// See: .github / workflows/MASTER-intelligent-enrichment.yml
let SourceCredits = {};
try {
  SourceCredits = require('./lib/data/SourceCredits'); //  Source attributions
} catch (_e) {
  SourceCredits = {
    contributors: [],
    licenses: { MIT: 'https://opensource.org/licenses/MIT' },
    attribution: 'Based on work by Johan Bendz and community contributors'
  };
}
const TuyaUDPDiscovery = require('./lib/tuya-local/TuyaUDPDiscovery');
const SmartValueProcessor = require('./lib/utils/SmartValueProcessor');
const CapabilityAutoAdapter = require('./lib/utils/CapabilityAutoAdapter');

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
  diagnosticAPI = null; // For MCP/AI integration
  logBuffer = null; //  MCP-accessible log buffer
  suggestionEngine = null; //  Non-destructive Smart-Adapt
  otaManager = null; //  OTA Firmware Update Manager
  quirksDatabase = null; //  Device Quirks Database
  _tuyaUDPDiscovery = null; //  Tuya WiFi UDP Discovery
  // NOTE: Database updates handled by GitHub Actions, not at runtime
  developerDebugMode = false; //  AUDIT V2: Contrôle verbosity logs
  experimentalSmartAdapt = false; //  AUDIT V2: Modifications capabilities opt-in
  experimentalCloudMirror = false; //  v7.0.22: Zigbee-to-Cloud mirroring opt-in


  /**
   * onInit is called when the app is initialized.
   */
  /**
   * Safe getter for flow trigger cards
   * prevents SDK3 crashes when flowId is missing in app.json
   */
  _safeGetTriggerCard(id) {
    try {
      const card = this.homey.flow.getTriggerCard(id);
      if (!card) {
        this.log(`[FLOW-SAFE]  Trigger card not found: ${id}`);
        return null;
      }
      return card;
    } catch (e) {
      this.log(`[FLOW-SAFE]  getTriggerCard crashed for ${id}: ${e.message}`);
      return null;
    }
  }

  /**
   * Safe getter for flow condition cards
   */
  _safeGetConditionCard(id) {
    try {
      const card = this.homey.flow.getConditionCard(id);
      if (!card) {
        this.log(`[FLOW-SAFE]  Condition card not found: ${id}`);
        return null;
      }
      return card;
    } catch (e) {
      this.log(`[FLOW-SAFE]  getConditionCard crashed for ${id}: ${e.message}`);
      return null;
    }
  }

  /**
   * Safe getter for flow action cards
   */
  _safeGetActionCard(id) {
    try {
      const card = this.homey.flow.getActionCard(id);
      if (!card) {
        this.log(`[FLOW-SAFE]  Action card not found: ${id}`);
        return null;
      }
      return card;
    } catch (e) {
      this.log(`[FLOW-SAFE]  getActionCard crashed for ${id}: ${e.message}`);
      return null;
    }
  }

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

    this.initStartTime = Date.now();
    if (this._flowCardsRegistered) {
      this.log('  Flow cards already registered');
      return;
    }

    this._flowCardsRegistered = true;

    this.log('Universal Tuya Zigbee App is initializing...');
    this.log(` Mode: ${this.developerDebugMode ? 'DEVELOPER (verbose)' : 'PRODUCTION (minimal logs)'}`);
    this.log(` Smart-Adapt: ${this.experimentalSmartAdapt ? 'EXPERIMENTAL (modifies)' : 'READ-ONLY (safe)'}`);
    this.log(` Cloud Mirror: ${this.experimentalCloudMirror ? 'ENABLED (experimental)' : 'DISABLED (safe-local)'}`);
    this.log(` MaxListeners: ${EventEmitter.defaultMaxListeners} (prevents warnings with many devices)`);

    // Initialize CapabilityManager for safe capability creation
    this.capabilityManager = new CapabilityManager(this.homey);
    this.log(' CapabilityManager initialized');

    // v7.0.22: Initialize Shadow-Pulsar singleton
    const TuyaShadowPulsar = require('./lib/tuya-local/TuyaShadowPulsar');
    TuyaShadowPulsar.setEnabled(this.experimentalCloudMirror);

    //  Initialize Intelligent Device Identification Database
    // Scans ALL drivers and builds comprehensive ID database
    this.identificationDatabase = new DeviceIdentificationDatabase(this.homey);
    try {
      await this.identificationDatabase.buildDatabase();
      this.log(' Intelligent Device Identification Database built');
    } catch (err) {
      this.error(' Device ID Database build failed (non-critical):', err.message);
    }

    // CRITICAL: Register custom Zigbee clusters FIRST
    // This must happen before any devices initialize
    try {
      registerCustomClusters(this);
      this.log(' Custom Zigbee clusters registered');
    } catch (err) {
      this.error(' Failed to register custom clusters:', err);
    }

    // Register ALL flow cards (+33 nouveaux!)
    try {
      this.flowCardManager = new FlowCardManager(this.homey);
      this.flowCardManager.registerAll();
      this.log(' Flow cards registered (+33 nouveaux)');
    } catch (err) {
      this.error(' FlowCardManager failed (non-critical):', err.message);
    }

    // v5.5.597: Universal Flow Card Loader for sub-capabilities and generic DP
    try {
      this.universalFlowLoader = new UniversalFlowCardLoader(this.homey);
      await this.universalFlowLoader.initialize();
      this.log(' Universal Flow Card Loader initialized (sub-capabilities + DP)');
    } catch (err) {
      this.error(' Universal Flow Loader failed (non-critical):', err.message);
    }

    //  v7.0.22: Sub-manager initialization (Parallelized for Performance)
    const initTasks = [
      // Advanced Analytics
      (async () => {
        try {
          this.analytics = new AdvancedAnalytics(this.homey);
          await this.analytics.initialize();
          this.log(' Advanced Analytics initialized');
        } catch (err) { this.error(' Analytics failed:', err.message); }
      })(),

      // Smart Device Discovery
      (async () => {
        try {
          this.discovery = new SmartDeviceDiscovery(this.homey);
          await this.discovery.initialize();
          this.log(' Smart Device Discovery initialized');
        } catch (err) { this.error(' Discovery failed:', err.message); }
      })(),

      // Performance Optimizer
      (async () => {
        try {
          this.optimizer = new PerformanceOptimizer({
            maxCacheSize: 1000,
            maxCacheMemory: safeMultiply(10, 1048576) // 10 MB
          });
          this.log(' Performance Optimizer initialized');
        } catch (err) { this.error(' Optimizer failed:', err.message); }
      })(),

      // Diagnostic & Logs (Safe to run in parallel)
      (async () => {
        try {
          this.unknownHandler = new UnknownDeviceHandler(this.homey);
          this.systemLogsCollector = new SystemLogsCollector(this.homey);
          this.diagnosticAPI = new DiagnosticAPI(this);
          this.logBuffer = new LogBuffer(this.homey);
          this.log(' Diagnostic Suite initialized');
        } catch (err) { this.error(' Diagnostic Suite failed:', err.message); }
      })(),

      // OTA & Quirks
      (async () => {
        try {
          this.otaManager = new OTAUpdateManager(this.homey);
          this.quirksDatabase = QuirksDatabase;
          this.log(' OTA & Quirks initialized');
        } catch (err) { this.error(' OTA/Quirks failed:', err.message); }
      })()
    ];

    // Wait for all non-critical init tasks
    Promise.all(initTasks).then(() => {
      const startupTime = ((Date.now() - (this.initStartTime || Date.now())) / 1000).toFixed(2);
      this.log(` All auxiliary managers initialized in ${startupTime}s`);
    }).catch(err => {
      this.error(' Parallel initialization error:', err.message);
    });

    //  Initialize SuggestionEngine for non-destructive Smart-Adapt (Needs LogBuffer)
    try {
      this.suggestionEngine = new SuggestionEngine(this.homey, this.logBuffer);
      this.log(' SuggestionEngine initialized');
    } catch (err) { this.error(' SuggestionEngine failed:', err.message); }

    //  Database updates handled by GitHub Actions ONLY (not at runtime)
    // See: .github / workflows/MASTER-intelligent-enrichment.yml (weekly)
    // See: .github / workflows/AUTO-discover-new-devices.yml (daily)
    try {
      this.log(` Data sources: ${SourceCredits.getAllSources().length} contributors credited`);
    } catch (err) { this.error(' SourceCredits failed:', err.message); }
    this.log(' Database updates: GitHub Actions only (no runtime fetches)');

    //  Initialize Quirks Database
    try {
      this.quirksDatabase = QuirksDatabase;
      this.log(' Quirks Database initialized');
    } catch (err) { this.error(' Quirks failed:', err.message); }

    //  Initialize Tuya WiFi UDP Discovery
    try {
      this._tuyaUDPDiscovery = new TuyaUDPDiscovery({ log: this.log.bind(this) });
      await this._tuyaUDPDiscovery.start();
      this.log(' Tuya WiFi UDP Discovery started (ports 6666/6667)');
    } catch (err) {
      this.log(' Tuya UDP Discovery failed (non-critical):', err.message);
    }

    // DISABLED: SDK3 doesn't allow overriding this.log (read-only property)
    // this._setupDiagnosticLogging();
    // DiagnosticAPI and LogBuffer still work via direct calls

    // v5.8.45: Removed registerFlowCards() and registerOTAFlowCards()
    // All 87+ phantom flow card registrations were never defined in app.json
    // DP/sub-capability cards  UniversalFlowCardLoader
    // Switch/plug cards  FlowCardManager

    // v5.8.46: Manual OTA Checker action card
    try {
      this.homey.flow.getActionCard('ota_check_updates').registerRunListener(async (args) => {
        this.log('[OTA] Manual check sequence initiated via Flow');
        if (!args.device) return false;
        
        try {
          const update = await this.otaManager?.checkUpdate(args.device);
          if (update?.available) {
            await this.homey.notifications.createNotification({
              excerpt: `OTA Update found for ${args.device.getName()} (v${update.newVersion}). Use a Tuya hub or Z2M to flash it safely.`
            });
            this.log(`[OTA] Found update v${update.newVersion} for ${args.device.getName()}`);
          } else {
            await this.homey.notifications.createNotification({
              excerpt: `Your device ${args.device.getName()} is on the latest Tuya firmware.`
            });
            this.log(`[OTA] No update found for ${args.device.getName()}`);
          }
          return true;
        } catch (err) {
          this.error(`[OTA] Checking failed:`, err.message);
          return false;
        }
      });
      this.log(' Registered OTA Update Manual Check flow card');
    } catch (err) {
      this.error(' Could not register OTA check card:', err.message);
    }

    // Initialize Homey Insights
    try {
      await this.initializeInsights();
    } catch (err) { this.error(' Insights failed:', err.message); }

    this.log(' Universal Tuya Zigbee App has been initialized');
    this.log(' Advanced systems: Analytics, Discovery, Performance, OTA, Quirks, System Logs, Intelligent ID Database');
    this.homey.markReady();

    // Log capability stats
    try {
      const stats = this.capabilityManager?.getStats() || {};
      this.log(` Capabilities managed: ${stats.created || 0}`);
    } catch (err) { /* non-critical */ }

    // v5.3.63: Scan for phantom sub-devices and mark them unavailable
    this._scanForPhantomDevices();

    // v5.3.68: Clear old migration queue on startup (prevents notification spam)
    this._clearMigrationQueue();

    //  FIX CRITIQUE: Worker migration queue (60s delay) - DISABLED in v5.3.68
    // Migration notifications were confusing users with "undefined  soil_sensor"
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
      this.log('[MIGRATION]  Migration queue cleared');
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

      this.error(`[PHANTOM]  Phantom device detected: "${deviceName}" (subDeviceId: ${subDeviceId})`);
      this.error('[PHANTOM]  SDK3 cannot delete devices programmatically!');
      this.error('[PHANTOM]  User must delete this device manually from Homey app');

      // Mark as unavailable with clear message
      await device.setUnavailable(' PHANTOM - Supprimez manuellement dans l\'app Homey').catch(() => { });

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
   *  FIX: Exécute les migrations en queue de manière sécurisée
   */
  async processMigrations() {
    try {
      this.log('[MIGRATION-WORKER]  Starting...');
      const processed = await processMigrationQueue(this.homey);
      this.log(`[MIGRATION-WORKER]  Processed ${processed} migrations`);

      //  v5.2.30: Run emergency device fix after migrations
      this.log('[EMERGENCY-FIX]  Running emergency device fixes...');
      const fixResults = await EmergencyDeviceFix.runAll(this.homey);
      this.log(`[EMERGENCY-FIX]  Fixed: migrations=${fixResults.migrationFixed}, devices=${fixResults.devicesFixed}, DPs=${fixResults.dpRequestsSent}`);

    } catch (err) {
      this.error('[MIGRATION-WORKER]  Error:', err.message);
    }
  }

  /**
   * v5.3.63: Scan all devices for phantom sub-devices and mark them unavailable
   * Phantom devices have a subDeviceId but shouldn't exist (e.g., climate sensors)
   */
  async _scanForPhantomDevices() {
    try {
      this.log('[PHANTOM-SCAN]  Scanning for phantom sub-devices...');

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
              this.log(`[PHANTOM-SCAN]  PHANTOM: ${device.getName?.()} (subDeviceId: ${data.subDeviceId})`);

              // Mark as unavailable with clear message
              if (typeof device.setUnavailable === 'function') {
                device.setUnavailable(
                  " Appareil fantôme (subDevice " + data.subDeviceId + "). Supprimez cet appareil."
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
        this.log(`[PHANTOM-SCAN]  Found ${phantomCount} phantom devices - marked as unavailable`);
        this.log(`[PHANTOM-SCAN]  ${realCount} real devices OK`);
        this.log(`[PHANTOM-SCAN]  User should DELETE phantom devices from Homey app`);
      } else {
        this.log(`[PHANTOM-SCAN]  No phantom devices found (${realCount} devices OK)`);
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
    this.log(' Generating diagnostic report with system logs...');

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
        identificationDatabase: this.identificationDatabase ? this.identificationDatabase.getStats() : {},
        diagnostics: this.diagnosticAPI ? this.diagnosticAPI.getFullReport(true) : {} // MCP/AI data
      };

      // Combine everything
      const report = [
        ''.repeat(80),
        ' UNIVERSAL TUYA ZIGBEE - COMPREHENSIVE DIAGNOSTIC REPORT',
        ''.repeat(80),
        '',
        `Generated: ${new Date().toISOString()}`,
        `App: ${appInfo.appId} v${appInfo.version}`,
        '',
        ''.repeat(80),
        ' APP-SPECIFIC INFORMATION',
        ''.repeat(80),
        `Capabilities Created: ${appInfo.capabilities.created || 0}`,
        `Capabilities Cached: ${appInfo.capabilities.cached || 0}`,
        '',
        appInfo.identificationDatabase ? [
          ''.repeat(80),
          ' INTELLIGENT DEVICE IDENTIFICATION DATABASE',
          ''.repeat(80),
          `Device Types: ${appInfo.identificationDatabase.deviceTypes || 0}`,
          `Total Manufacturer IDs: ${appInfo.identificationDatabase.totalManufacturerIds || 0}`,
          `Total Product IDs: ${appInfo.identificationDatabase.totalProductIds || 0}`,
          `Drivers Scanned: ${appInfo.identificationDatabase.drivers || 0}`,
          `Last Update: ${appInfo.identificationDatabase.lastUpdate || 'Never'}`,
          ''
        ].join('\n') : '',
        appInfo.diagnostics ? [
          ''.repeat(80),
          ' DIAGNOSTIC API - MCP/AI INTEGRATION',
          ''.repeat(80),
          `Total Logs: ${appInfo.diagnostics.diagnostics.summary.totalLogs || 0}`,
          `Total Errors: ${appInfo.diagnostics.diagnostics.summary.totalErrors || 0}`,
          `Total Devices: ${appInfo.diagnostics.diagnostics.summary.totalDevices || 0}`,
          `Critical Errors: ${appInfo.diagnostics.diagnostics.summary.totalLogs || 0}`,
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
        ''.repeat(80),
        'END OF DIAGNOSTIC REPORT',
        ''.repeat(80)
      ].join('\n');

      this.log(' Diagnostic report generated successfully');

      return report;

    } catch (err) {
      this.error(' Failed to generate diagnostic report:', err);
      return `Error generating diagnostic report: ${err.message}`;
    }
  }


  _registerUniversalFlowCards() {
    try {
      // TRIGGER: Any DP changed
      this.homey.flow.getTriggerCard('tuya_dp_changed').registerRunListener(async (args, state) => true);

      // TRIGGER: Bitmap changed
      this.homey.flow.getTriggerCard('tuya_bitmap_changed').registerRunListener(async (args, state) => {
        return !args.dp || args.dp === 0 || state.dp_number === args.dp;
      });

      // TRIGGER: Raw received
      this.homey.flow.getTriggerCard('tuya_raw_received').registerRunListener(async (args, state) => {
        return !args.dp || args.dp === 0 || state.dp_number === args.dp;
      });

      // TRIGGER: Cluster event
      this.homey.flow.getTriggerCard('tuya_cluster_received').registerRunListener(async (args, state) => true);

      // TRIGGER: DP received (existing card, ensure registered)
      this.homey.flow.getTriggerCard('tuya_dp_received').registerRunListener(async (args, state) => {
        return !args.dp || args.dp === 0 || state.dp === args.dp;
      });

      // TRIGGER: Threshold crossed
      this.homey.flow.getTriggerCard('tuya_dp_threshold_crossed').registerRunListener(async (args, state) => {
        return state.dp === args.dp;
      });

      // ACTION: Send typed DP
      this.homey.flow.getActionCard('tuya_dp_send_typed').registerRunListener(async (args) => {
        const dev = args.device;
        if (dev._universalBridge) {
          let val = args.value;
          if (args.dp_type === 'bool') val = val === 'true' || val === '1';
          else if (['value','enum','bitmap'].includes(args.dp_type)) val = parseInt(val , 10);
          return dev._universalBridge.sendDP(args.dp, val, args.dp_type);
        }
        return false;
      });

      // ACTION: Send DP (existing simple card)
      this.homey.flow.getActionCard('tuya_dp_send').registerRunListener(async (args) => {
        const dev = args.device;
        if (dev._universalBridge) {
          return dev._universalBridge.sendDP(args.dp, args.value, 'value');
        }
        return false;
      });

      // CONDITION: DP type is
      this.homey.flow.getConditionCard('tuya_dp_type_is').registerRunListener(async (args) => {
        const dev = args.device;
        const bridge = dev._universalBridge;
        if (!bridge) return false;
        const hist = bridge.getDPHistory();
        return hist[args.dp] !== undefined;
      });

      // CONDITION: DP equals
      this.homey.flow.getConditionCard('tuya_dp_equals').registerRunListener(async (args) => {
        const dev = args.device;
        const bridge = dev._universalBridge;
        if (!bridge) return false;
        const hist = bridge.getDPHistory();
        return String(hist[args.dp]) === String(args.value);
      });

      this.log(' v5.12.2: Universal flow cards registered (10 cards)');
    } catch (e) {
      this.log(' Universal flow cards error: ' + e.message);
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
   * Setup diagnostic logging to capture all logs for (MCP / AI)
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

      if (message.includes('') || message.includes('WARN')) level = 'WARN';

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
   * Get diagnostic API report (accessible for (MCP / AI))
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
   * @returns {Promise<Object>} All diagnostic data for (MCP / AI)
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
    this.log(' Initializing Homey Insights...');

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

      this.log(' Homey Insights initialized (6 logs)');
    } catch (err) {
      this.error('  Error initializing insights:', err.message);
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
    this.experimentalCloudMirror = this.homey.settings.get('experimental_cloud_mirror') ?? false;

    // Listen for settings changes
    this.homey.settings.on('set', (key) => {
      const TuyaShadowPulsar = require('./lib/tuya-local/TuyaShadowPulsar');

      if (key === 'developer_debug_mode') {
        this.developerDebugMode = this.homey.settings.get('developer_debug_mode');
        this.log(` [AUDIT V2] Developer Debug Mode: ${this.developerDebugMode ? 'ENABLED (verbose)' : 'DISABLED (minimal)'}`);
      }

      if (key === 'experimental_smart_adapt') {
        this.experimentalSmartAdapt = this.homey.settings.get('experimental_smart_adapt');
        this.log(` [AUDIT V2] Experimental Smart-Adapt: ${this.experimentalSmartAdapt ? 'ENABLED (modifies capabilities)' : 'DISABLED (read-only)'}`);

        // Warn user if enabling experimental mode
        if (this.experimentalSmartAdapt) {
          this.log('  WARNING: Experimental Smart-Adapt will MODIFY device capabilities!');
          this.log('  Only enable if you understand the risks.');
        }
      }

      if (key === 'experimental_cloud_mirror') {
        this.experimentalCloudMirror = this.homey.settings.get('experimental_cloud_mirror');
        this.log(` [v7.0.22] Experimental Cloud Mirror: ${this.experimentalCloudMirror ? 'ENABLED' : 'DISABLED'}`);
        TuyaShadowPulsar.setEnabled(this.experimentalCloudMirror);
      }
    });

    // Log initial state
    this.log(`[AUDIT V2] Settings initialized:`);
    this.log(`  - Developer Debug: ${this.developerDebugMode}`);
    this.log(`  - Experimental Smart-Adapt: ${this.experimentalSmartAdapt}`);
    this.log(`  - Experimental Cloud Mirror: ${this.experimentalCloudMirror}`);
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

  async onUninit() {
    this.log('Universal Tuya Zigbee App is de-initializing...');

    // Stop Tuya UDP Discovery
    if (this._tuyaUDPDiscovery) {
      try { await this._tuyaUDPDiscovery.stop(); } catch (e) {}
    }

    // Cleanup all sub-managers to prevent resource leaks
    const cleanup = [
      ['analytics', this.analytics],
      ['discovery', this.discovery],
      ['optimizer', this.optimizer],
      ['systemLogsCollector', this.systemLogsCollector],
      ['diagnosticAPI', this.diagnosticAPI],
      ['logBuffer', this.logBuffer],
      ['suggestionEngine', this.suggestionEngine],
      ['otaManager', this.otaManager],
      ['flowCardManager', this.flowCardManager],
      ['universalFlowLoader', this.universalFlowLoader],
      ['identificationDatabase', this.identificationDatabase],
    ];
    for (const [name, mgr] of cleanup) {
      if (mgr && typeof mgr.destroy === 'function') {
        try { mgr.destroy(); } catch (e) {}
      } else if (mgr && typeof mgr.stop === 'function') {
        try { mgr.stop(); } catch (e) {}
      }
    }

    // Reset state
    this._flowCardsRegistered = false;
    this.analytics = null;
    this.discovery = null;
    this.optimizer = null;
    this.systemLogsCollector = null;
    this.diagnosticAPI = null;
    this.logBuffer = null;
    this.suggestionEngine = null;
    this.otaManager = null;
    this.flowCardManager = null;
    this.universalFlowLoader = null;
    this.identificationDatabase = null;

    this.log(' Universal Tuya Zigbee App has been de-initialized');
  }

}

module.exports = UniversalTuyaZigbeeApp;
