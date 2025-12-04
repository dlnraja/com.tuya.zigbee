'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');
const DeviceFingerprintDB = require('../../lib/tuya/DeviceFingerprintDB');

/**
 * Climate Sensor Device - v5.3.58 AUTO-ADAPTIVE VERSION
 *
 * NOW USES AutoAdaptiveDevice for guaranteed data reception!
 *
 * CRITICAL: TS0601/_TZE devices have PHANTOM ZCL clusters!
 * They advertise temperatureMeasurement, relativeHumidity, powerConfiguration
 * but these clusters DON'T RESPOND → Timeout errors!
 *
 * v5.3.58: Switched to AutoAdaptiveDevice for multi-path DP listening
 * v5.2.91: Added comprehensive debug logging throughout
 */
class ClimateSensorDevice extends AutoAdaptiveDevice {

  // Force battery powered
  get mainsPowered() { return false; }

  /**
   * v5.2.91: BLOCK ALL ZCL for Tuya DP - with detailed logging
   */
  async registerAllCapabilitiesWithReporting() {
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║ [ZCL-GUARD] registerAllCapabilitiesWithReporting() INTERCEPTED!  ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    const protocolInfo = this._detectProtocolSafe();
    this.log('[ZCL-GUARD] Protocol detection result:', JSON.stringify(protocolInfo));

    if (protocolInfo.isTuyaDP) {
      this.log('[ZCL-GUARD] ════════════════════════════════════════════════════════');
      this.log('[ZCL-GUARD] 🛑 BLOCKED! This is a Tuya DP device');
      this.log('[ZCL-GUARD] 🛑 ZCL clusters are PHANTOM - they do NOT respond!');
      this.log('[ZCL-GUARD] 🛑 Skipping ALL ZCL: readAttributes, configureReporting');
      this.log('[ZCL-GUARD] ✅ Data will arrive via Tuya DP events (cluster 0xEF00)');
      this.log('[ZCL-GUARD] ════════════════════════════════════════════════════════');
      return; // ❌ NO ZCL OPERATIONS!
    }

    this.log('[ZCL-GUARD] ✅ Not a Tuya DP device - proceeding with ZCL registration');
    return super.registerAllCapabilitiesWithReporting();
  }

  /**
   * v5.2.91: Also override registerCapability to catch any sneaky ZCL calls
   */
  async registerCapability(capabilityId, clusterId, opts) {
    const protocolInfo = this._detectProtocolSafe();

    if (protocolInfo.isTuyaDP) {
      this.log(`[ZCL-GUARD] 🛑 registerCapability(${capabilityId}) BLOCKED - Tuya DP device`);
      return; // Don't register ZCL capabilities for Tuya DP
    }

    return super.registerCapability(capabilityId, clusterId, opts);
  }

  /**
   * v5.2.91: Safe protocol detection with detailed logging
   */
  _detectProtocolSafe() {
    try {
      const settings = this.getSettings?.() || {};
      const store = this.getStore?.() || {};
      const data = this.getData?.() || {};

      // Try multiple sources for model/manufacturer
      const modelId = settings.zb_modelId || store.modelId || data.modelId || '';
      const mfr = settings.zb_manufacturerName || store.manufacturerName || data.manufacturerName || '';

      // Detection logic
      const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE');
      const isSONOFF = mfr === 'SONOFF' || mfr === 'eWeLink' || modelId.startsWith('SNZB');
      const isStandardZCL = (modelId === 'TS0201' || modelId.startsWith('TS02') || isSONOFF) && !isTuyaDP;

      const result = {
        protocol: isTuyaDP ? 'TUYA_DP' : 'ZCL',
        isTuyaDP,
        isStandardZCL,
        isSONOFF,
        modelId,
        mfr,
        _sources: {
          settings_modelId: settings.zb_modelId,
          store_modelId: store.modelId,
          data_modelId: data.modelId,
          settings_mfr: settings.zb_manufacturerName,
          store_mfr: store.manufacturerName
        }
      };

      return result;
    } catch (err) {
      this.error('[PROTOCOL] Detection failed:', err.message);
      // Default to Tuya DP to be safe (avoid timeouts)
      return { protocol: 'TUYA_DP', isTuyaDP: true, isStandardZCL: false, modelId: '', mfr: '' };
    }
  }

  async onNodeInit({ zclNode }) {
    // v5.3.62: CRITICAL - Detect and handle phantom sub-devices
    const deviceData = this.getData();
    if (deviceData.subDeviceId !== undefined) {
      this.error('╔══════════════════════════════════════════════════════════════════╗');
      this.error('║ ⚠️  PHANTOM SUB-DEVICE DETECTED - THIS SHOULD NOT EXIST!         ║');
      this.error('╠══════════════════════════════════════════════════════════════════╣');
      this.error(`║ subDeviceId: ${deviceData.subDeviceId}`);
      this.error('║ Climate sensors do NOT have sub-devices!');
      this.error('║ Please DELETE this device from Homey.');
      this.error('╚══════════════════════════════════════════════════════════════════╝');

      // Mark as unavailable with clear message
      await this.setUnavailable(
        `⚠️ Appareil fantôme (subDevice ${deviceData.subDeviceId}). ` +
        `Supprimez ce device et gardez uniquement le device principal.`
      ).catch(() => { });

      // Don't initialize - this device shouldn't exist
      return;
    }

    this.log('');
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           CLIMATE SENSOR v5.3.62 - AUTO-ADAPTIVE                 ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');
    this.log('');

    // v5.3.61: CRITICAL - Add missing capabilities BEFORE super.onNodeInit()
    // This fixes "Invalid Capability: measure_temperature" for existing devices
    const requiredCaps = ['measure_temperature', 'measure_humidity', 'measure_battery'];
    for (const cap of requiredCaps) {
      if (!this.hasCapability(cap)) {
        try {
          await this.addCapability(cap);
          this.log(`[MIGRATE] ➕ Added missing capability: ${cap}`);
        } catch (err) {
          this.log(`[MIGRATE] ⚠️ Could not add ${cap}: ${err.message}`);
        }
      }
    }

    // v5.2.91: Detect protocol BEFORE any other operation
    const protocolInfo = this._detectProtocolSafe();
    this._protocolInfo = protocolInfo;

    this.log('[INIT] ═══════════════════════════════════════════════════════════');
    this.log('[INIT] DEVICE IDENTIFICATION:');
    this.log('[INIT]   Model ID:     ', protocolInfo.modelId || '(empty)');
    this.log('[INIT]   Manufacturer: ', protocolInfo.mfr || '(empty)');
    this.log('[INIT]   Protocol:     ', protocolInfo.protocol);
    this.log('[INIT]   isTuyaDP:     ', protocolInfo.isTuyaDP);
    this.log('[INIT]   isStandardZCL:', protocolInfo.isStandardZCL);
    this.log('[INIT]   Data sources: ', JSON.stringify(protocolInfo._sources));
    this.log('[INIT] ═══════════════════════════════════════════════════════════');

    // Force _isPureTuyaDP BEFORE super.onNodeInit()
    if (protocolInfo.isTuyaDP) {
      this._isPureTuyaDP = true;
      this._blockZCL = true; // Extra flag for safety
      this.log('[INIT] 🔶 _isPureTuyaDP = true (set BEFORE super.onNodeInit)');
      this.log('[INIT] 🔶 _blockZCL = true (extra safety flag)');
    }

    // Log available clusters BEFORE init
    this._logAvailableClusters(zclNode, 'BEFORE super.onNodeInit');

    // Initialize base - ZCL operations will be blocked by our overrides
    this.log('[INIT] Calling super.onNodeInit()...');
    await super.onNodeInit({ zclNode }).catch(err => {
      this.error('[INIT] super.onNodeInit() ERROR:', err.message);
    });
    this.log('[INIT] super.onNodeInit() completed');

    // Get fingerprint
    this._fingerprint = DeviceFingerprintDB.getFingerprint(protocolInfo.mfr);
    if (this._fingerprint) {
      this.log(`[INIT] 📋 Fingerprint: ${this._fingerprint.productNames?.join(', ') || 'Climate Sensor'}`);
    }

    // Route based on protocol
    if (protocolInfo.isTuyaDP) {
      this.log('');
      this.log('[MODE] ╔═══════════════════════════════════════════════════════════╗');
      this.log('[MODE] ║         🔶 TUYA DP MODE - NO ZCL OPERATIONS! 🔶          ║');
      this.log('[MODE] ╚═══════════════════════════════════════════════════════════╝');
      this.log('');
      await this._setupTuyaDpOnly();
    } else if (protocolInfo.isStandardZCL) {
      this.log('');
      this.log('[MODE] ╔═══════════════════════════════════════════════════════════╗');
      this.log('[MODE] ║              📡 STANDARD ZCL MODE 📡                      ║');
      this.log('[MODE] ╚═══════════════════════════════════════════════════════════╝');
      this.log('');
      await this._setupStandardZclMode();
    } else {
      this.log('[MODE] ⚠️ Unknown mode - defaulting to Tuya DP');
      await this._setupTuyaDpOnly();
    }

    this.log('');
    this.log('[INIT] ✅ Initialization complete');
    this.log('[INIT] Waiting for data via', protocolInfo.isTuyaDP ? 'Tuya DP events' : 'ZCL reports');
    this.log('');
  }

  /**
   * v5.2.91: Log available clusters for debugging
   */
  _logAvailableClusters(zclNode, context) {
    this.log(`[CLUSTERS] ═══════════════════════════════════════════════════════`);
    this.log(`[CLUSTERS] Available clusters (${context}):`);

    try {
      const endpoints = zclNode?.endpoints || {};
      for (const [epId, ep] of Object.entries(endpoints)) {
        const clusters = ep?.clusters || {};
        const clusterNames = Object.keys(clusters);
        this.log(`[CLUSTERS]   Endpoint ${epId}: ${clusterNames.join(', ') || '(none)'}`);

        // Check specific clusters
        if (clusters.temperatureMeasurement) this.log(`[CLUSTERS]     ⚠️ temperatureMeasurement present (PHANTOM for Tuya!)`);
        if (clusters.relativeHumidity) this.log(`[CLUSTERS]     ⚠️ relativeHumidity present (PHANTOM for Tuya!)`);
        if (clusters.powerConfiguration) this.log(`[CLUSTERS]     ⚠️ powerConfiguration present (PHANTOM for Tuya!)`);
        if (clusters.tuya || clusters.manuSpecificTuya || clusters[61184]) {
          this.log(`[CLUSTERS]     ✅ Tuya cluster (0xEF00) present - THIS IS THE REAL DATA SOURCE`);
        }
      }
    } catch (err) {
      this.log(`[CLUSTERS] Error listing clusters:`, err.message);
    }
    this.log(`[CLUSTERS] ═══════════════════════════════════════════════════════`);
  }

  /**
   * v5.2.91: Setup for Tuya DP devices - NO ZCL AT ALL!
   */
  async _setupTuyaDpOnly() {
    this.log('[TUYA-DP] ═══════════════════════════════════════════════════════');
    this.log('[TUYA-DP] Setting up Tuya DP only mode...');
    this.log('[TUYA-DP] ❌ NO getAttribute() calls will be made');
    this.log('[TUYA-DP] ❌ NO configureReporting() calls will be made');
    this.log('[TUYA-DP] ✅ Data will arrive via Tuya DP events (cluster 0xEF00)');
    this.log('[TUYA-DP] ═══════════════════════════════════════════════════════');

    this._dpValues = {};
    this._dpLastUpdate = null;
    this._dpReceivedCount = 0;

    // Setup DP listeners immediately
    this.log('[TUYA-DP] Setting up DP listeners...');
    await this._setupTuyaDPListener();

    // Also setup delayed re-registration after TuyaEF00Manager init
    this.log('[TUYA-DP] Scheduling delayed DP re-registration (3s)...');
    setTimeout(() => {
      this.log('[TUYA-DP] ⏰ Delayed callback triggered');
      if (this.tuyaEF00Manager) {
        this.log('[TUYA-DP]   tuyaEF00Manager exists');
        this.log('[TUYA-DP]   dpMappings:', this.tuyaEF00Manager.dpMappings ? 'YES' : 'NO');
        this.log('[TUYA-DP]   _isInitialized:', this.tuyaEF00Manager._isInitialized);
        this._registerDPFromManager();
      } else {
        this.log('[TUYA-DP]   ⚠️ tuyaEF00Manager not available');
      }
      this._requestInitialDPs();
    }, 3000);

    // Additional delayed check at 10s
    setTimeout(() => {
      this.log('[TUYA-DP] ⏰ 10s status check:');
      this.log('[TUYA-DP]   DPs received:', this._dpReceivedCount);
      this.log('[TUYA-DP]   DP values:', JSON.stringify(this._dpValues));
      this.log('[TUYA-DP]   Last update:', this._dpLastUpdate ? new Date(this._dpLastUpdate).toISOString() : 'never');

      if (this._dpReceivedCount === 0) {
        this.log('[TUYA-DP]   ⚠️ No DPs received yet - device may be sleeping');
        this.log('[TUYA-DP]   ℹ️ Battery devices wake up periodically (every 1-60 min)');
      }
    }, 10000);

    this.log('[TUYA-DP] ✅ Tuya DP setup complete');
  }

  /**
   * v5.2.91: Setup for standard ZCL devices (TS0201, SONOFF)
   */
  async _setupStandardZclMode() {
    this.log('[ZCL] Setting up standard ZCL mode...');
    this.log('[ZCL] This device supports real ZCL clusters');
    await this._setupStandardZCLListeners();
    this.log('[ZCL] ✅ Standard ZCL setup complete');
  }

  /**
   * v5.2.87: Register DP handlers from TuyaEF00Manager after it's initialized
   */
  _registerDPFromManager() {
    if (!this.tuyaEF00Manager) return;

    // Re-register dpReport listener
    this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
      this._handleClimateDP(dpId, value);
    });

    // Also listen to individual DP events
    [1, 2, 4, 9, 14, 15].forEach(dp => {
      this.tuyaEF00Manager.on(`dp-${dp}`, (value) => {
        this.log(`[CLIMATE-SENSOR] 📥 DP${dp} event: ${value}`);
        this._handleClimateDP(dp, value);
      });
    });

    this.log('[CLIMATE-SENSOR] ✅ DP listeners registered from TuyaEF00Manager');
  }

  /**
   * Setup standard ZCL cluster listeners for TS0201 and HYBRID TS0601 devices
   * Uses msTemperatureMeasurement (0x0402), msRelativeHumidity (0x0405), genPowerCfg (0x0001)
   * v5.2.81: Also used for TS0601 devices with standard clusters available
   */
  async _setupStandardZCLListeners() {
    const mode = this._isHybridMode ? 'HYBRID TS0601' : 'standard ZCL';
    this.log(`[CLIMATE-SENSOR] Setting up ${mode} listeners...`);

    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[CLIMATE-SENSOR] ⚠️ No endpoint 1 found');
      return;
    }

    // Temperature cluster (0x0402)
    const tempCluster = endpoint.clusters?.temperatureMeasurement || endpoint.clusters?.msTemperatureMeasurement;
    if (tempCluster) {
      this.log('[CLIMATE-SENSOR] ✅ Temperature cluster found');
      try {
        // Read initial value
        const tempData = await tempCluster.readAttributes(['measuredValue']).catch(() => null);
        if (tempData?.measuredValue != null) {
          const temp = Math.round((tempData.measuredValue / 100) * 10) / 10;
          this.log(`[CLIMATE-SENSOR] 🌡️ Initial temperature: ${temp}°C`);
          if (this.hasCapability('measure_temperature')) {
            await this.setCapabilityValue('measure_temperature', temp).catch(this.error);
          }
        }

        // Setup reporting
        if (typeof tempCluster.configureReporting === 'function') {
          await tempCluster.configureReporting({
            measuredValue: { minInterval: 60, maxInterval: 3600, minChange: 10 }
          }).catch(err => this.log('[CLIMATE-SENSOR] Temperature reporting config failed:', err.message));
        }

        // Listen for reports
        tempCluster.on('attr.measuredValue', (value) => {
          const temp = Math.round((value / 100) * 10) / 10;
          this.log(`[CLIMATE-SENSOR] 🌡️ Temperature report: ${temp}°C`);
          if (this.hasCapability('measure_temperature')) {
            this.setCapabilityValue('measure_temperature', temp).catch(this.error);
          }
        });
      } catch (err) {
        this.log('[CLIMATE-SENSOR] Temperature setup error:', err.message);
      }
    }

    // Humidity cluster (0x0405)
    const humCluster = endpoint.clusters?.relativeHumidity || endpoint.clusters?.msRelativeHumidity;
    if (humCluster) {
      this.log('[CLIMATE-SENSOR] ✅ Humidity cluster found');
      try {
        // Read initial value
        const humData = await humCluster.readAttributes(['measuredValue']).catch(() => null);
        if (humData?.measuredValue != null) {
          const hum = Math.round(humData.measuredValue / 100);
          this.log(`[CLIMATE-SENSOR] 💧 Initial humidity: ${hum}%`);
          if (this.hasCapability('measure_humidity')) {
            await this.setCapabilityValue('measure_humidity', hum).catch(this.error);
          }
        }

        // Setup reporting
        if (typeof humCluster.configureReporting === 'function') {
          await humCluster.configureReporting({
            measuredValue: { minInterval: 60, maxInterval: 3600, minChange: 100 }
          }).catch(err => this.log('[CLIMATE-SENSOR] Humidity reporting config failed:', err.message));
        }

        // Listen for reports
        humCluster.on('attr.measuredValue', (value) => {
          const hum = Math.round(value / 100);
          this.log(`[CLIMATE-SENSOR] 💧 Humidity report: ${hum}%`);
          if (this.hasCapability('measure_humidity')) {
            this.setCapabilityValue('measure_humidity', hum).catch(this.error);
          }
        });
      } catch (err) {
        this.log('[CLIMATE-SENSOR] Humidity setup error:', err.message);
      }
    }

    // Battery cluster (0x0001 genPowerCfg)
    const powerCluster = endpoint.clusters?.powerConfiguration || endpoint.clusters?.genPowerCfg;
    if (powerCluster) {
      this.log('[CLIMATE-SENSOR] ✅ Power/Battery cluster found');
      try {
        // Read initial battery
        const batteryData = await powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']).catch(() => null);
        if (batteryData?.batteryPercentageRemaining != null) {
          const battery = Math.round(batteryData.batteryPercentageRemaining / 2);
          this.log(`[CLIMATE-SENSOR] 🔋 Initial battery: ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        } else if (batteryData?.batteryVoltage != null) {
          // Fallback to voltage
          const voltage = batteryData.batteryVoltage / 10;
          const battery = Math.max(0, Math.min(100, Math.round((voltage - 2.0) / 1.2 * 100)));
          this.log(`[CLIMATE-SENSOR] 🔋 Initial battery (from voltage ${voltage}V): ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        }

        // Setup battery reporting
        if (typeof powerCluster.configureReporting === 'function') {
          await powerCluster.configureReporting({
            batteryPercentageRemaining: { minInterval: 3600, maxInterval: 43200, minChange: 2 }
          }).catch(err => this.log('[CLIMATE-SENSOR] Battery reporting config failed:', err.message));
        }

        // Listen for battery reports
        powerCluster.on('attr.batteryPercentageRemaining', (value) => {
          const battery = Math.round(value / 2);
          this.log(`[CLIMATE-SENSOR] 🔋 Battery report: ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            this.setCapabilityValue('measure_battery', battery).catch(this.error);
          }
        });
      } catch (err) {
        this.log('[CLIMATE-SENSOR] Battery setup error:', err.message);
      }
    } else {
      this.log('[CLIMATE-SENSOR] ⚠️ No battery cluster found - device may not report battery');
    }

    this.log('[CLIMATE-SENSOR] ✅ Standard ZCL listeners configured');
  }

  /**
   * Setup Tuya DP listener for cluster 0xEF00
   * v5.3.45: Enhanced with multiple listener patterns for better compatibility
   */
  async _setupTuyaDPListener() {
    this.log('[CLIMATE-SENSOR] Setting up Tuya DP listener...');

    // Listen for dpReport events from TuyaEF00Manager (if integrated)
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this.log(`[CLIMATE-SENSOR] 📥 dpReport from Manager: DP${dpId} = ${value}`);
        this._handleClimateDP(dpId, value);
      });

      // Also listen to individual DP events
      [1, 2, 4, 9, 14, 15, 17, 18, 19, 20].forEach(dp => {
        this.tuyaEF00Manager.on(`dp-${dp}`, (value) => {
          this.log(`[CLIMATE-SENSOR] 📥 dp-${dp} event: ${value}`);
          this._handleClimateDP(dp, value);
        });
      });

      this.log('[CLIMATE-SENSOR] ✅ Using TuyaEF00Manager for DP handling');
    }

    // v5.3.45: ALWAYS setup direct cluster listener as backup
    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[CLIMATE-SENSOR] ⚠️ No endpoint 1 found');
      return;
    }

    // Find Tuya cluster with all possible names
    const tuyaCluster = endpoint.clusters.tuya
      || endpoint.clusters.tuyaSpecific
      || endpoint.clusters.manuSpecificTuya
      || endpoint.clusters.tuyaManufacturer
      || endpoint.clusters['61184']
      || endpoint.clusters[61184]
      || endpoint.clusters['0xEF00']
      || endpoint.clusters[0xEF00];

    if (tuyaCluster) {
      this.log('[CLIMATE-SENSOR] ✅ Found Tuya cluster, setting up listeners...');

      // Method 1: dataReport event
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('dataReport', (data) => {
          this.log('[CLIMATE-SENSOR] 📥 dataReport event:', JSON.stringify(data));
          this._parseTuyaDataReport(data);
        });

        tuyaCluster.on('response', (data) => {
          this.log('[CLIMATE-SENSOR] 📥 response event:', JSON.stringify(data));
          this._parseTuyaDataReport(data);
        });

        tuyaCluster.on('data', (data) => {
          this.log('[CLIMATE-SENSOR] 📥 data event:', JSON.stringify(data));
          this._parseTuyaDataReport(data);
        });

        this.log('[CLIMATE-SENSOR] ✅ Cluster event listeners registered');
      }

      // Method 2: Direct callback assignment
      if (tuyaCluster.onDataReport === undefined) {
        tuyaCluster.onDataReport = (data) => {
          this.log('[CLIMATE-SENSOR] 📥 onDataReport callback:', JSON.stringify(data));
          this._parseTuyaDataReport(data);
        };
      }

      this.log('[CLIMATE-SENSOR] ✅ Direct Tuya cluster listener configured');
    } else {
      this.log('[CLIMATE-SENSOR] ⚠️ No Tuya cluster found by name');
      this.log('[CLIMATE-SENSOR] Available clusters:', Object.keys(endpoint.clusters || {}).join(', '));
    }

    // v5.3.45: Setup raw frame listener on endpoint for maximum compatibility
    if (endpoint && typeof endpoint.on === 'function') {
      endpoint.on('frame', (frame) => {
        // Check if frame is from Tuya cluster (0xEF00 = 61184)
        if (frame && (frame.cluster === 0xEF00 || frame.cluster === 61184)) {
          this.log('[CLIMATE-SENSOR] 📥 Raw Tuya frame:', {
            cluster: frame.cluster,
            command: frame.command,
            dataHex: frame.data?.toString?.('hex')
          });
          this._parseTuyaRawFrame(frame.data);
        }
      });
      this.log('[CLIMATE-SENSOR] ✅ Raw frame listener registered');
    }

    // v5.3.45: Listen to all clusters for any data
    for (const [clusterName, cluster] of Object.entries(endpoint.clusters || {})) {
      if (cluster && typeof cluster.on === 'function') {
        cluster.on('attr', (attrId, value) => {
          this.log(`[CLIMATE-SENSOR] 📥 Attr from ${clusterName}: ${attrId} = ${value}`);
        });
      }
    }
  }

  /**
   * v5.3.45: Parse Tuya data report from various sources
   */
  _parseTuyaDataReport(data) {
    if (!data) return;

    // Try different data formats
    const dp = data.dpId ?? data.dp ?? data.datapoint;
    const value = data.dpValue ?? data.value ?? data.data;

    if (dp !== undefined && value !== undefined) {
      this._handleClimateDP(dp, value);
    } else if (data.datapoints && Array.isArray(data.datapoints)) {
      // Multiple DPs in one report
      for (const dpData of data.datapoints) {
        const dpId = dpData.dp ?? dpData.dpId;
        const dpValue = dpData.value ?? dpData.dpValue;
        if (dpId !== undefined) {
          this._handleClimateDP(dpId, dpValue);
        }
      }
    } else if (Buffer.isBuffer(data) || (data.data && Buffer.isBuffer(data.data))) {
      // Raw buffer - parse as Tuya frame
      this._parseTuyaRawFrame(Buffer.isBuffer(data) ? data : data.data);
    }
  }

  /**
   * v5.3.45: Parse raw Tuya frame buffer
   * Format: [status:1][transid:1][dp:1][type:1][len:2][value:N]...
   */
  _parseTuyaRawFrame(buffer) {
    if (!buffer || buffer.length < 6) return;

    try {
      let offset = 2; // Skip status and transid

      while (offset < buffer.length - 4) {
        const dp = buffer[offset];
        const type = buffer[offset + 1];
        const len = (buffer[offset + 2] << 8) | buffer[offset + 3];

        if (offset + 4 + len > buffer.length) break;

        const valueBuffer = buffer.slice(offset + 4, offset + 4 + len);
        let value;

        // Parse based on type
        switch (type) {
          case 0x00: // RAW
            value = valueBuffer;
            break;
          case 0x01: // BOOL
            value = valueBuffer[0] !== 0;
            break;
          case 0x02: // VALUE (4-byte big-endian)
            value = valueBuffer.readUInt32BE?.(0) ??
              ((valueBuffer[0] << 24) | (valueBuffer[1] << 16) | (valueBuffer[2] << 8) | valueBuffer[3]);
            break;
          case 0x03: // STRING
            value = valueBuffer.toString('utf8');
            break;
          case 0x04: // ENUM
            value = valueBuffer[0];
            break;
          case 0x05: // BITMAP
            value = valueBuffer.readUInt32BE?.(0) ?? 0;
            break;
          default:
            value = valueBuffer;
        }

        this.log(`[CLIMATE-SENSOR] 📥 Parsed DP${dp} (type=${type}): ${value}`);
        this._handleClimateDP(dp, value);

        offset += 4 + len;
      }
    } catch (err) {
      this.error('[CLIMATE-SENSOR] Raw frame parse error:', err.message);
    }
  }

  /**
   * v5.2.91: Handle incoming Tuya DP with detailed logging
   */
  _handleClimateDP(dpId, value) {
    // v5.2.91: Increment counter for status tracking
    this._dpReceivedCount = (this._dpReceivedCount || 0) + 1;

    this.log('[DP-HANDLER] ═══════════════════════════════════════════════════════');
    this.log(`[DP-HANDLER] 📥 RECEIVED: DP${dpId} = ${value} (type: ${typeof value})`);
    this.log(`[DP-HANDLER] Total DPs received: ${this._dpReceivedCount}`);

    // Store for debugging
    this._dpValues = this._dpValues || {};
    this._dpValues[dpId] = value;
    this._dpLastUpdate = Date.now();

    // Store timestamp in store for Homey UI
    this.setStoreValue('last_dp_update', Date.now()).catch(() => { });
    this.setStoreValue(`dp_${dpId}_value`, value).catch(() => { });
    this.setStoreValue(`dp_${dpId}_time`, Date.now()).catch(() => { });

    // DP Mapping (comprehensive for climate sensors)
    switch (dpId) {
      case 1: // Temperature (÷10)
        this.log('[DP-HANDLER] → Mapping: Temperature');
        this._setTemperature(value);
        break;

      case 2: // Humidity
        this.log('[DP-HANDLER] → Mapping: Humidity');
        this._setHumidity(value);
        break;

      case 4: // Battery (primary)
        this.log('[DP-HANDLER] → Mapping: Battery (DP4)');
        this._setBattery(value);
        break;

      case 9: // Temperature unit
        this.log(`[DP-HANDLER] → Mapping: Temp unit = ${value === 0 ? 'Celsius' : 'Fahrenheit'}`);
        break;

      case 10: // Max temp alarm
      case 11: // Min temp alarm
        this.log(`[DP-HANDLER] → Mapping: Temp alarm ${dpId === 10 ? 'max' : 'min'}: ${value / 10}°C`);
        break;

      case 12: // Max humidity alarm
      case 13: // Min humidity alarm
        this.log(`[DP-HANDLER] → Mapping: Humidity alarm ${dpId === 12 ? 'max' : 'min'}: ${value}%`);
        break;

      case 14: // Temperature alarm state
        const tempAlarmStates = ['lower_alarm', 'upper_alarm', 'cancel'];
        this.log(`[DP-HANDLER] → Mapping: Temp alarm state: ${tempAlarmStates[value] || value}`);
        break;

      case 15: // BATTERY (alternative) OR Humidity alarm state
        // v5.2.91: FIX - DP15 is battery for many climate sensors!
        // If value is 0-100, it's likely battery. If 0-2, it's alarm state.
        if (value >= 0 && value <= 100 && value > 2) {
          this.log('[DP-HANDLER] → Mapping: Battery (DP15 - alternative)');
          this._setBattery(value);
        } else {
          const humAlarmStates = ['lower_alarm', 'upper_alarm', 'cancel'];
          this.log(`[DP-HANDLER] → Mapping: Humidity alarm state: ${humAlarmStates[value] || value}`);
        }
        break;

      case 17: // Temp report interval
      case 18: // Humidity report interval
        this.log(`[DP-HANDLER] → Mapping: ${dpId === 17 ? 'Temp' : 'Humidity'} report interval: ${value} min`);
        break;

      case 19: // Temp sensitivity
        this.log(`[DP-HANDLER] → Mapping: Temp sensitivity: ${value / 10}°C`);
        break;

      case 20: // Humidity sensitivity
        this.log(`[DP-HANDLER] → Mapping: Humidity sensitivity: ${value}%`);
        break;

      default:
        this.log(`[DP-HANDLER] → Mapping: ❓ UNKNOWN DP${dpId} = ${value}`);
        this.log(`[DP-HANDLER]   This may be a device-specific DP not yet mapped`);
    }

    this.log('[DP-HANDLER] ═══════════════════════════════════════════════════════');
  }

  /**
   * v5.2.91: Set temperature capability with detailed logging
   */
  _setTemperature(value) {
    // Temperature is sent as value × 10 (e.g., 234 = 23.4°C)
    let temp = value;
    if (Math.abs(value) > 100) {
      temp = value / 10;
    }

    this.log(`[SET-TEMP] 🌡️ Raw value: ${value} → Converted: ${temp}°C`);

    if (this.hasCapability('measure_temperature')) {
      this.setCapabilityValue('measure_temperature', temp)
        .then(() => this.log(`[SET-TEMP] ✅ measure_temperature = ${temp}°C`))
        .catch(err => this.error(`[SET-TEMP] ❌ Failed:`, err.message));
    } else {
      this.log('[SET-TEMP] ⚠️ Device does not have measure_temperature capability');
    }
  }

  /**
   * v5.2.91: Set humidity capability with detailed logging
   */
  _setHumidity(value) {
    const humidity = Math.min(100, Math.max(0, value));

    this.log(`[SET-HUM] 💧 Raw value: ${value} → Clamped: ${humidity}%`);

    if (this.hasCapability('measure_humidity')) {
      this.setCapabilityValue('measure_humidity', humidity)
        .then(() => this.log(`[SET-HUM] ✅ measure_humidity = ${humidity}%`))
        .catch(err => this.error(`[SET-HUM] ❌ Failed:`, err.message));
    } else {
      this.log('[SET-HUM] ⚠️ Device does not have measure_humidity capability');
    }
  }

  /**
   * v5.2.91: Set battery capability with detailed logging
   */
  _setBattery(value) {
    const battery = Math.min(100, Math.max(0, value));

    this.log(`[SET-BATT] 🔋 Raw value: ${value} → Clamped: ${battery}%`);

    // Store in store for persistence
    this.setStoreValue('last_battery_percent', battery).catch(() => { });
    this.setStoreValue('last_battery_update', Date.now()).catch(() => { });

    if (this.hasCapability('measure_battery')) {
      this.setCapabilityValue('measure_battery', battery)
        .then(() => this.log(`[SET-BATT] ✅ measure_battery = ${battery}%`))
        .catch(err => this.error(`[SET-BATT] ❌ Failed:`, err.message));
    } else {
      this.log('[SET-BATT] ⚠️ Device does not have measure_battery capability');
    }

    // Forward to BatteryManager if available
    if (this.batteryManager && typeof this.batteryManager.onTuyaDPBattery === 'function') {
      this.log('[SET-BATT] 📤 Forwarding to BatteryManager');
      this.batteryManager.onTuyaDPBattery({ dpId: 4, value: battery });
    }
  }

  /**
   * Request initial DP values
   */
  _requestInitialDPs() {
    setTimeout(() => {
      this.log('[CLIMATE-SENSOR] 📤 Requesting initial DP values...');

      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestDPs === 'function') {
        // Request all known DPs for climate sensor
        this.tuyaEF00Manager.requestDPs([1, 2, 4, 9, 17, 18, 19, 20]);
      }
    }, 5000);
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      fingerprint: this._fingerprint,
      dpValues: this._dpValues,
      lastUpdate: this._dpLastUpdate ? new Date(this._dpLastUpdate).toISOString() : 'never',
      capabilities: {
        temperature: this.getCapabilityValue('measure_temperature'),
        humidity: this.getCapabilityValue('measure_humidity'),
        battery: this.getCapabilityValue('measure_battery')
      }
    };
  }

  async onDeleted() {
    this.log('[CLIMATE-SENSOR] Device deleted');
    await super.onDeleted().catch(() => { });
  }
}

module.exports = ClimateSensorDevice;
