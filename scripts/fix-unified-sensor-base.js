const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../lib/devices/UnifiedSensorBase.js');
let content = fs.readFileSync(filePath, 'utf8');

// The file got corrupted with duplicated/mixed blocks.
// I'll try to find the "STEP 3" and "STEP 4" markers and fix them.

// Restore onNodeInit block
const onNodeInitStart = content.indexOf('async onNodeInit({ zclNode }) {');
const onNodeInitEnd = content.indexOf('  /**\n   * v5.5.848: SDK3 COMPLIANT - Deferred initial communication');

if (onNodeInitStart !== -1 && onNodeInitEnd !== -1) {
    const head = content.substring(0, onNodeInitStart);
    const tail = content.substring(onNodeInitEnd);
    
    const correctOnNodeInit = `async onNodeInit({ zclNode }) {
    this._registerCapabilityListeners();
    this.log(\`[HYBRID-SENSOR] onNodeInit: \${this.getName()} (\${this.driver?.id || 'unknown'})\`);
    await super.onNodeInit({ zclNode });

    if (this._hybridSensorInited) {
      this.log('[HYBRID-SENSOR]  Already initialized (SensorBase), skipping');
      return;
    }
    this._hybridSensorInited = true;
    await MfrHelper.ensureManufacturerSettings(this).catch(() => {});

    const deviceData = this.getData();
    if (deviceData.subDeviceId !== undefined) {
      this.error(\`[PHANTOM]  BLOCKED phantom sub-device (subDeviceId: \${deviceData.subDeviceId})\`);
      await this.setUnavailable(' PHANTOM - Supprimez manuellement').catch(() => { });
      throw new Error(\`PHANTOM_DEVICE_BLOCKED: subDeviceId=\${deviceData.subDeviceId}\`);
    }

    this.zclNode = zclNode;
    if (UnknownClusterHandler) {
      try {
        const bound = UnknownClusterHandler.scanAndBind(zclNode, this);
        if (bound.length > 0) this.log(\`[HYBRID-SENSOR]  Bound \${bound.length} dynamic clusters\`);
      } catch (e) { }
    }

    this._setupRawFrameFallback();

    const needsReportingConfig = this._shouldConfigureReportingSensor();
    if (needsReportingConfig) {
      this.log('[SDK3]  Configuring attribute reporting...');
      await this._configureAttributeReportingSDK3(zclNode).catch(e => this.log(\`[SDK3]  Attribute reporting config skipped: \${e.message}\`));
      await this.setStoreValue('lastConfiguredVersion', '5.11.139').catch(() => {});
    }

    if (this.fastInitMode) {
      this.log('[FAST-INIT]  Fast init mode enabled for sleepy device');
      await this._fastInit(zclNode);
      return;
    }

    await this._applyManufacturerConfig();
    const driverType = this.driver?.id || 'climate_sensor';
    const productType = ProductValueValidator.detectProductType(driverType);
    this._valueValidator = ProductValueValidator.createDeviceValidator(this, productType);

    try {
      this._rateLimiter = new RateLimiter(this, {
        minIntervalMs: 5000,
        thresholds: { 'measure_luminance': 5, 'measure_luminance.distance': 10, 'measure_power': 2 }
      });
    } catch (e) { }

    this._detectAvailableClusters();
    this._protocolInfo = this._detectProtocol();
    this._isPureTuyaDP = this._protocolInfo.isTuyaDP;

    await this._migrateCapabilities();
    try {
      await PowerSourceIntelligence.applyCapabilities(this, zclNode);
    } catch (e) { }

    try {
      const { UnifiedBatteryHandler } = require('../battery');
      this.batteryHandler = new UnifiedBatteryHandler(this);
      await this.batteryHandler.initialize(zclNode);
    } catch (e) { }

    try {
      this.protocolOptimizer = new ProtocolAutoOptimizer(this, { verbose: true });
      await this.protocolOptimizer.initialize(zclNode);
    } catch (e) { }

    try {
      this.universalDataHandler = new UniversalDataHandler(this, { verbose: true });
      await this.universalDataHandler.initialize(zclNode);
      this.universalDataHandler.on('dp', (dpId, value, dataType) => {
        if (this.protocolOptimizer) this.protocolOptimizer.registerHit('tuya', dpId, value);
        if (!this.protocolOptimizer || this.protocolOptimizer.isActive('tuya')) this._handleDP(dpId, value);
      });
      this.universalDataHandler.on('zcl', (cluster, attr, value) => {
        if (this.protocolOptimizer) this.protocolOptimizer.registerHit('zcl', cluster, value);
        if (!this.protocolOptimizer || this.protocolOptimizer.isActive('zcl')) this._handleZCLData(cluster, attr, value);
      });
      this.universalDataHandler.on('capability', (capability, value) => {
        this._safeSetCapability(capability, value);
      });
    } catch (err) { }

    this._bumpMaxListeners(zclNode);

    this._lastRxTimestamp = null;
    this._lastTxTimestamp = null;
    this._protocolStats = {
      tuyaDP: { received: 0, lastTime: Date.now() },
      zcl: { received: 0, lastTime: Date.now() },
      iasZone: { received: 0, lastTime: Date.now() },
      raw: { received: 0, lastTime: Date.now() }
    };

    this._txCounter = 0;
    this._rxCounter = 0;

    await Promise.all([
      this._setupTuyaDPMode().catch(e => { }),
      this._setupZCLMode(zclNode).catch(e => { }),
      this._setupIASZoneListeners(zclNode).catch(e => { })
    ]);

    this._sensorValues = {};
    this._lastUpdate = null;
    this._optimizationTimer = this.homey.setTimeout(() => { this._logProtocolStats(); }, 4 * 60 * 60 * 1000);
    this._setupDelayedDataRetry();
    this._initDataRecoveryManager();
    this._initHybridDataQuery();

    if (this.hasCapability('measure_battery') && this.getCapabilityValue('measure_battery') === null) {
      const stored = this.getStoreValue('last_battery_percentage');
      if (stored !== null && stored !== undefined && typeof stored === 'number') {
        await this._safeSetCapability('measure_battery', parseFloat(stored)).catch(() => {});
      }
    }

    this.homey.setTimeout(() => {
      this._performDeferredInitCommunication().catch(e => { });
    }, 2000);
  }
`;
    
    content = head + correctOnNodeInit + tail;
    console.log('Fixed onNodeInit');
}

// Fix _performDeferredInitCommunication
const defStart = content.indexOf('async _performDeferredInitCommunication() {');
const defEnd = content.indexOf('  /**\n   * v5.5.401: FAST INIT MODE for sleepy battery devices');

if (defStart !== -1 && defEnd !== -1) {
    const head = content.substring(0, defStart);
    const tail = content.substring(defEnd);
    
    const correctDef = `async _performDeferredInitCommunication() {
    this.log('[SDK3]  Starting deferred initial communication (5s after init)...');
    const isSED = isSleepyEndDevice(this);
    if (isSED) {
      await this._sendTuyaDataQuery?.().catch(() => {});
    } else {
      await Promise.all([
        this._sendTuyaDataQuery?.().catch(() => {}),
        this._readZCLAttributes?.().catch(() => {}),
        this.retryIASEnrollment?.().catch(() => {}),
      ]);
    }
    this.log('[SDK3]  Deferred communication complete');
  }
`;
    content = head + correctDef + tail;
    console.log('Fixed _performDeferredInitCommunication');
}

fs.writeFileSync(filePath, content);
console.log('Success');
