'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


const { ZigBeeDevice } = require('homey-zigbeedriver');
const SmartDriverAdaptation = require('../managers/SmartDriverAdaptation');
const DriverMigrationManager = require('../managers/DriverMigrationManager');
const DiagnosticLogsCollector = require('../diagnostics/DiagnosticLogsCollector');
const SmartBatteryManager = require('../managers/SmartBatteryManager');
const SmartEnergyManager = require('../managers/SmartEnergyManager');
const UnknownClusterHandler = require('../clusters/UnknownClusterHandler');
const TuyaUniversalBridge = require('../TuyaUniversalBridge');
const { trackTx, trackRx } = require('../utils/UniversalThrottleManager');

/**
 * TuyaZigbeeDevice - Base class for all Tuya Zigbee devices
 * Provides common functionality for Tuya devices
 * NOW WITH:
 * -  INTELLIGENT DRIVER ADAPTATION
 * -  COMPREHENSIVE DIAGNOSTIC LOGS
 */

// Apply DiagnosticLogsCollector mixin to ZigBeeDevice
const ZigBeeDeviceWithDiagnostics = DiagnosticLogsCollector(ZigBeeDevice);

class TuyaZigbeeDevice extends ZigBeeDeviceWithDiagnostics {



  /**
   * onNodeInit is called when the device is initialized
   */
  async onNodeInit() {
    this.log('TuyaZigbeeDevice initialized');

    // Enable debug logging if needed
    this.enableDebug();

    // Print cluster information
    this.printNode();

    //  v5.8.18: SCAN AND BIND UNKNOWN CLUSTERS
    await this.scanUnknownClusters();

    //  RUN INTELLIGENT DRIVER ADAPTATION
    await this.runIntelligentAdaptation();

    //  SMART BATTERY & ENERGY DETECTION
    await this.initSmartManagers();

    //  v5.12.2: UNIVERSAL BRIDGE - connects ALL DPs/clusters to flow cards
    await this.initUniversalBridge();

    //  v5.13.0: UNIVERSAL TX/RX FALLBACK HANDLER
    this._setupRawFrameFallback();
  }

  /**
   *  UNIVERSAL RAW FRAME HANDLER
   * Intercepts unhandled ZigBee frames before Homey SDK routing
   * v5.13.2: Standardized as onZigBeeMessage (uppercase B) for driver-level hooks
   */
  _setupRawFrameFallback() {
    if (!this.node) return;
    
    // Check if handleFrame is already hijacked to prevent infinite loop
    if (this.node._rawFrameFallbackInjected) return;

    this.log(' [RX/TX] Setup Universal Raw Frame Fallback v5.13.2');
    const originalHandleFrame = this.node.handleFrame;
    
    this.node.handleFrame = (endpointId, clusterId, frame, meta) => {
      let handled = false;
      
      // 1. Standardized driver-level hook: onZigBeeMessage (uppercase B)
      if (typeof this.onZigBeeMessage === 'function') {
        try {
          if (this.onZigBeeMessage(endpointId, clusterId, frame, meta) === true) {
            handled = true;
          }
        } catch (e) {
          this.log(` [RX] Driver handling error (onZigBeeMessage): ${e.message}`);
        }
      }

      // 2. Legacy driver-level hook: onZigbeeMessage (lowercase b)
      if (!handled && typeof this.onZigbeeMessage === 'function') {
        try {
          if (this.onZigbeeMessage(endpointId, clusterId, frame, meta) === true) {
            handled = true;
          }
        } catch (e) {
          this.log(` [RX] Driver handling error (onZigbeeMessage): ${e.message}`);
        }
      }

      // 3. Track RX statistics universally
      this.trackIncomingReport();

      // If handled by specific driver, do not pass to SDK
      if (handled) return;

      // 4. Fallback to default Homey SDK native routing
      if (typeof originalHandleFrame === 'function') {
        return originalHandleFrame.call(this.node, endpointId, clusterId, frame, meta);
      }
    };
    
    this.node._rawFrameFallbackInjected = true;
  }

  /**
   *  INTELLIGENT DRIVER ADAPTATION
   * DÃ©tecte automatiquement si le driver est correct et s'adapte
   */
  async runIntelligentAdaptation() {
    // VÃ©rifier si l'adaptation est activÃ©e (par dÃ©faut: OUI)
    const enableSmartAdaptation = this.getSetting('enable_smart_adaptation');
    if (enableSmartAdaptation === false) {
      this.log(' [SMART ADAPT] Disabled by user setting');
      return;
    }

    this.log(' [SMART ADAPT] Starting intelligent driver adaptation...');

    try {
      // Attendre que le ZCL node soit prÃªt
      await this.waitForZclNode();

      // CrÃ©er l'instance d'adaptation avec base de donnÃ©es intelligente
      const identificationDatabase = this.homey.app?.identificationDatabase || null;this.smartAdaptation = new SmartDriverAdaptation(this, identificationDatabase);

      // ExÃ©cuter l'analyse et l'adaptation
      const adaptResult = await this.smartAdaptation.analyzeAndAdapt();

      // Sauvegarder le rÃ©sultat
      this.smartAdaptationResult = adaptResult;

      // GÃ©nÃ©rer le rapport
      const adaptReport = this.smartAdaptation.generateReport(adaptResult);
      this.log(adaptReport);

      // VÃ©rifier si une migration de driver est recommandÃ©e
      if (adaptResult.success && adaptResult.deviceInfo) {
        await this.checkDriverMigration(adaptResult);
      }

      // Sauvegarder le rapport dans les settings
      try {
        await this.setSettings({
          smart_adaptation_report: adaptReport,
          smart_adaptation_date: new Date().toISOString(),
          smart_adaptation_success: adaptResult.success
        });
      } catch (err) {
        // Ignore si settings non disponibles
        this.log('  [SMART ADAPT] Could not save report to settings');
      }

      this.log(' [SMART ADAPT] Intelligent adaptation complete');

    } catch (err) {
      this.error(' [SMART ADAPT] Failed:', err.message);
      this.error('   Stack:', err.stack);
    }
  }

  /**
   * VÃ©rifie si une migration de driver est nÃ©cessaire
   */
  async checkDriverMigration(adaptResult) {
    try {
      this.log(' [MIGRATION] Checking if driver migration is needed...');

      // CrÃ©er le manager de migration avec base de donnÃ©es intelligente
      const identificationDatabase = this.homey.app?.identificationDatabase || null;const migrationManager = new DriverMigrationManager(this.homey, identificationDatabase);

      // DÃ©terminer le meilleur driver
      const bestDriver = migrationManager.determineBestDriver(
        adaptResult.deviceInfo,
        adaptResult.clusterAnalysis || {}
      );

      // VÃ©rifier si migration nÃ©cessaire
      const needsMigration = migrationManager.needsMigration(
        this.driver.id,
        bestDriver.driverId,
        bestDriver.confidence
      );

      // GÃ©nÃ©rer le rapport
      const migrationReport = migrationManager.generateMigrationReport(
        this.driver.id,
        bestDriver,
        needsMigration
      );

      this.log(migrationReport);

      // Si migration nÃ©cessaire, crÃ©er une notification
      if (needsMigration) {
        this.log('  [MIGRATION] Driver migration RECOMMENDED!');
        await migrationManager.createMigrationNotification(this, bestDriver);

        // Sauvegarder dans settings
        try {
          await this.setSettings({
            recommended_driver: bestDriver.driverId,
            migration_confidence: bestDriver.confidence,
            migration_reasons: bestDriver.reason.join('; ')
          });
        } catch (err) {
          // Ignore
        }
      } else {
        this.log(' [MIGRATION] Driver is CORRECT - No migration needed');
      }

    } catch (err) {
      this.error(' [MIGRATION] Failed to check migration:', err.message);
    }
  }

  /**
   *  v5.8.18: Scan and bind safeDivide(unknown, manufacturer)-specific clusters
   */
  async scanUnknownClusters() {
    try {
      await this.waitForZclNode(5000);
      const bound = UnknownClusterHandler.scanAndBind(this.zclNode, this);
      if (bound.length > 0) {
        this.log(` [UNKNOWN] Bound ${bound.length} dynamic clusters:`, bound.map(b => `0x${b.cid.toString(16)}`).join(', '));
      }
      this.unknownClustersBound = bound;
    } catch (err) {
      this.log(` [UNKNOWN] Scan error: ${err.message}`);
    }
  }

  /**
   * Get emitter for a dynamically bound cluster
   */
  getClusterEmitter(clusterId) {
    return UnknownClusterHandler.getEmitter(clusterId);
  }

  /**
   * Attend que le ZCL node soit prÃªt
   */
  async waitForZclNode(maxWaitMs = 10000) {
    const startTime = Date.now();

    while (!this.zclNode && Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!this.zclNode) {
      throw new Error(`ZCL Node not ready after ${maxWaitMs}ms`);
    }

    return this.zclNode;
  }

  /**
   *  OTA UPDATE HANDLER (Maintenance Action UI)
   */
  async onMaintenanceAction(action) {
    if (action && action.id === 'ota_check') {
      return await this._checkOtaRoutine();
    }
    // Fallback for SDK3 signature changes
    if (typeof action === 'string' && action === 'ota_check') {
      return await this._checkOtaRoutine();
    }
  }

  async _checkOtaRoutine() {
    this.log(' [OTA] Maintenance Action Check Initiated from Device View');
    try {
      const update = await this.homey.app.otaManager?.checkUpdate(this);if (update && update.available) {
        await this.homey.notifications.createNotification({
          excerpt: `[${this.getName()}] OTA Firmware Update v${update.newVersion} is available! Please pair to Tuya or Z2M to flash.`
        });
        return `A new firmware (v${update.newVersion}) is available! Check your Homey timeline for details.`;
      } else {
        return ' Your device is on the latest Tuya firmware.';
      }
    } catch(err) {
      this.error('[OTA] Maintenance failed:', err.message);
      return `Error checking OTA: ${err.message}`;
    }
  }


  /**
   * Force une nouvelle adaptation (appelable manuellement)
   */
  async forceSmartAdaptation() {
    this.log(' [SMART ADAPT] Forcing re-adaptation...');
    return await this.runIntelligentAdaptation();
  }

  /**
   * Retourne le rÃ©sultat de l'adaptation
   */
  getSmartAdaptationResult() {
    return this.smartAdaptationResult || null;
  }

  /**
   *  SMART BATTERY & ENERGY MANAGERS
   * Auto-detect and manage safeDivide(battery, energy) capabilities
   */
  async initSmartManagers() {
    try {
      // Initialize Smart Battery Manager
      this.smartBattery = new SmartBatteryManager(this);
      await this.smartBattery.init();

      // Initialize Smart Energy Manager
      this.smartEnergy = new SmartEnergyManager(this);
      await this.smartEnergy.init();

      this.log(' [SMART] Battery & Energy managers initialized');
    } catch (err) {
      this.log(` [SMART] Manager init error: ${err.message}`);
    }
  }

  async initUniversalBridge() {
    try {
      this._universalBridge = new TuyaUniversalBridge(this);
      await this._universalBridge.init();
      this.log('[BRIDGE] Universal bridge initialized');
    } catch (e) {
      this.log('[BRIDGE] Init error: ' + e.message);
    }
  }

  /**
   * Handle Tuya DP for safeDivide(battery, energy) (call from DP handlers)
   */
  async handleSmartDP(dpId, value) {
    let handled = false;
    
    if (this.smartBattery) {
      handled = await this.smartBattery.handleDP(dpId, value) || handled;
    }
    
    if (this.smartEnergy) {
      handled = await this.smartEnergy.handleDP(dpId, value) || handled;
    }
    
    return handled;
  }

  /**
   * onDeleted is called when the user deleted the device
   */
  async onDeleted() {
    this.log('TuyaZigbeeDevice has been deleted');
  }

  /**
   * enableDebug - Enable debug logging for this device
   */
  enableDebug() {
    // Can be overridden in child classes
  }

  /**
   * parseTuyaBatteryValue - Parse Tuya battery value (0-100 or 0-200)
   */
  parseTuyaBatteryValue(value) {
    if (typeof value !== 'number') return null;

    // Tuya devices report battery in 0-100 or 0-200 scale
    const percentage = value <= 100 ? value : safeParse(value, 2);
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  /**
   * registerBatteryCapability - Register battery capability with proper reporting
   */
  async registerBatteryCapability(options = {}) {
    const {
      cluster = 'genPowerCfg',
      attribute = 'batteryPercentageRemaining',
      minInterval = 60,
      maxInterval = 86400,
      minChange = 2
    } = options;

    try {
      await this.registerCapability('measure_battery', cluster, {
        get: attribute,
        report: attribute,
        reportOpts: {
          configureAttributeReporting: {
            minInterval,
            maxInterval,
            minChange
          }
        },
        getOpts: {
          getOnStart: true,
          getOnOnline: true
        },
        reportParser: value => {
          return this.parseTuyaBatteryValue(value);
        }
      });

      this.log('Battery capability registered successfully');
    } catch (err) {
      this.error('Error registering battery capability:', err);
    }
  }

  /**
   * registerOnOffCapability - Register onOff capability
   */
  async registerOnOffCapability() {
    try {
      await this.registerCapability('onoff', 'genOnOff', {
        getOpts: {
          getOnStart: true,
          getOnOnline: true
        }
      });

      this.log('OnOff capability registered successfully');
    } catch (err) {
      this.error('Error registering onoff capability:', err);
    }
  }

  /**
   * registerTemperatureCapability - Register temperature capability
   */
  async registerTemperatureCapability() {
    try {
      await this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => safeParse(value, 100),
        getOpts: {
          getOnStart: true
        }
      });

      this.log('Temperature capability registered successfully');
    } catch (err) {
      this.error('Error registering temperature capability:', err);
    }
  }

  /**
   * registerHumidityCapability - Register humidity capability
   */
  async registerHumidityCapability() {
    try {
      await this.registerCapability('measure_humidity', 'msRelativeHumidity', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => safeParse(value, 100),
        getOpts: {
          getOnStart: true
        }
      });

      this.log('Humidity capability registered successfully');
    } catch (err) {
      this.error('Error registering humidity capability:', err);
    }
  }

  /**
   * registerLuminanceCapability - Register luminance capability with proper LUX conversion
   */
  async registerLuminanceCapability() {
    try {
      await this.registerCapability('measure_luminance', 'msIlluminanceMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Luminance raw value:', value);
          // Convert from illuminance to lux
          const lux = value > 0 ? Math.pow(10, safeDivide(value - 1, 10000)) : 0;
          this.log('Luminance lux:', lux);
          return Math.round(lux);
        }
      });

      this.log('Luminance capability registered successfully');
    } catch (err) {
      this.error('Error registering luminance capability:', err);
    }
  }

  // 
  // v5.8.31: DEFENSIVE HELPERS (forum/GitHub user problem analysis)
  // 

  /**
   * safeRegisterCapability - Prevents "Missing Capability Listener" crashes
   * Falls back to no-op listener if cluster registration fails
   */
  async safeRegisterCapability(capability, cluster, opts = {}) {
    try {
      if (!this.hasCapability(capability)) {
        await this.addCapability(capability).catch(() => {});
      }
      if (cluster) {
        await this.registerCapability(capability, cluster, opts);
        this.log(` [SAFE-REG] ${capability} via ${cluster}`);
        return true;
      }
    } catch (err) {
      this.log(` [SAFE-REG] ${capability} cluster fail: ${err.message}`);
    }
    // Fallback: no-op listener
    try {
      if (this.hasCapability(capability)) {
        this.registerCapabilityListener(capability, async (value) => {
          this.log(`[SAFE-REG] ${capability} = ${value} (fallback)`);
          this.emit(`capability:${capability}`, value);
      });
        return true;
      }
    } catch (e) { /* already registered */ }
    return false;
  }

  /**
   * ensureCapabilityListeners - Register safety listeners for all settable capabilities
   * Prevents "Missing Capability Listener: onoff" errors (FrankP IR remote)
   */
  async ensureCapabilityListeners() {
    const settable = ['onoff', 'dim', 'target_', 'thermostat_', 'windowcoverings_', 'volume_', 'button', 'locked'];
    for (const cap of this.getCapabilities()) {
      if (settable.some(s => cap.startsWith(s)) && !this._capabilityListeners?.[cap]) {
        try {
          this.registerCapabilityListener(cap, async (value) => {
            this.log(`[ENSURE-CAP] ${cap} = ${value} (safety)`);this.emit(`capability:${cap}`, value);
      });
        } catch (e) { /* already registered */ }
      }
    }
  }

  /**
   * retryIASEnrollment - Retry IAS Zone enrollment with multiple strategies
   * Fixes safeDivide(contact, water) sensors stuck at alarm:no (blutch32, Lasse_K)
   */
  async retryIASEnrollment(maxRetries = 3) {
    const iasCluster = this.zclNode?.endpoints?.[1]?.clusters?.iasZone;
    if (!iasCluster) return false;

    for (let i = 1; i <= maxRetries; i++) {
      try {
        this.log(`[IAS-RETRY] Attempt ${i}/${maxRetries}`);
        // Strategy 1: Write CIE address
        try {
          await iasCluster.writeAttributes({ iasCieAddr: this.homey.zigbee?.address || '0x0000000000000000' });
        } catch (e) { this.log(`[IAS-RETRY] CIE write: ${e.message}`); }

        // Strategy 2: Send enroll response
        try {
          await iasCluster.enrollResponse({ enrollResponseCode: 0, zoneId: 1 });
          this.log('[IAS-RETRY] enrollResponse sent');
        } catch (e) { this.log(`[IAS-RETRY] enrollResponse: ${e.message}`); }

        // Strategy 3: Read zone status to verify
        await new Promise(r => setTimeout(r, 2000));
        try {
          const status = await iasCluster.readAttributes(['zoneStatus', 'zoneState']);
          this.log(`[IAS-RETRY] zoneState=${status.zoneState}, zoneStatus=${status.zoneStatus}`);
          if (status.zoneState === 1) { this.log('[IAS-RETRY]  Enrolled!'); return true; }
        } catch (e) { this.log(`[IAS-RETRY] read: ${e.message}`); }

        await new Promise(r => setTimeout(r, 3000));
      } catch (err) {
        this.log(`[IAS-RETRY] Attempt ${i} error: ${err.message}`);
      }
    }
    this.log('[IAS-RETRY]  Enrollment failed after retries');
    return false;
  }

  /**
   * smartDivisorDetect - Auto-detect correct divisor based on value range
   * Fixes humidity showing 9% instead of 90% (Peter_van_Werkhoven)
   */
  smartDivisorDetect(value, expectedRange = { min: 0, max: 100 }) {
    if (typeof value !== 'number' || value === 0) return value;
    const { min, max } = expectedRange;
    // If value/100 is in range, use Ã·100
    if (safeParse(value, 100) >= min && safeParse(value, 100) <= max) return safeParse(value, 100);
    // If value/10 is in range, use Ã·10
    if (safeParse(value, 10) >= min && safeParse(value, 10) <= max) return safeParse(value, 10);
    // If value already in range, return as-is
    if (value >= min && value <= max) return value;
    // If value*10 is in range, use Ã—10
    if (safeMultiply(value, 10) >= min && safeMultiply(value, 10) <= max) return safeMultiply(value, 10);
    return value;
  }

  /**
   * safeAddCapability - Add capability only if missing, with error guard
   */
  async safeAddCapability(capability) {
    if (!this.hasCapability(capability)) {
      try {
        await this.addCapability(capability);
        this.log(` [CAP] Added ${capability}`);
        return true;
      } catch (err) {
        this.log(` [CAP] Cannot add ${capability}: ${err.message}`);
      }
    }
    return false;
  }

  /**
   * v5.13.1: TX tracking wrapper for outgoing commands
   */
  canSendCommand(commandType = 'command') {
    const result = trackTx(this.getData().id, commandType);
    if (!result.allowed) {
      this.log(` [TX] Blocked: ${result.reason}`);
    }
    return result.allowed;
  }

  /**
   * v5.13.1: RX tracking for incoming reports
   */
  trackIncomingReport() {
    const result = trackRx(this.getData().id);
    if (result.exceeded) {
      this.log(` [RX] High traffic: ${result.count}/min`);
    }
    return result;
  }

  /**
   * safeSetCapabilityValue - Set capability value with existence check
   */
  async safeSetCapabilityValue(capability, value) {
    try {
      if (!this.hasCapability(capability)) {
        await this.addCapability(capability).catch(() => {});
      }
      if (this.hasCapability(capability)) {
        await this.setCapabilityValue(capability, value);
        return true;
      }
    } catch (err) {
      this.log(` [CAP] Set ${capability}=${value} failed: ${err.message}`);
    }
    return false;
  }

}

module.exports = TuyaZigbeeDevice;




