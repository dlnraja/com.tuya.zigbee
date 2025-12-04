'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * HybridSensorBase - Base class for ALL Tuya EF00/ZCL hybrid sensors
 *
 * v5.3.63: Centralized base to avoid patching each driver individually
 *
 * FEATURES:
 * - Anti-double initialization guards
 * - MaxListeners bump (prevents warnings)
 * - Protocol auto-detection (Tuya DP vs ZCL)
 * - Adaptive data parsing
 * - Safe capability registration
 * - Battery management
 * - Phantom sub-device detection
 *
 * SUPPORTED SENSOR TYPES:
 * - Climate (temperature, humidity)
 * - Motion / PIR / Presence
 * - Contact / Door / Window
 * - Water leak
 * - Smoke / Gas / CO
 * - Illuminance / Light
 * - Vibration / Tilt
 * - Soil moisture
 * - Air quality (PM2.5, VOC, CO2, formaldehyde)
 *
 * USAGE:
 *   class ClimateSensorDevice extends HybridSensorBase {
 *     async onNodeInit({ zclNode }) {
 *       await super.onNodeInit({ zclNode });
 *       // Driver-specific init here
 *     }
 *   }
 */
class HybridSensorBase extends ZigBeeDevice {

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION (override in subclasses if needed)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Battery powered by default */
  get mainsPowered() { return false; }

  /** Max listeners per cluster */
  get maxListeners() { return 50; }

  /** Capabilities this sensor supports (override in subclass) */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /** DP mappings for Tuya EF00 devices (override in subclass) */
  get dpMappings() {
    return {
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 10 },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async onNodeInit({ zclNode }) {
    // ─────────────────────────────────────────────────────────────────────────
    // GUARD 1: Prevent double initialization
    // ─────────────────────────────────────────────────────────────────────────
    if (this._hybridSensorInited) {
      this.log('[HYBRID-SENSOR] ⚠️ Already initialized, skipping');
      return;
    }
    this._hybridSensorInited = true;

    // ─────────────────────────────────────────────────────────────────────────
    // GUARD 2: Detect and AUTO-DELETE phantom sub-devices
    // v5.3.68: No more warnings - just silently delete phantom devices
    // ─────────────────────────────────────────────────────────────────────────
    const deviceData = this.getData();
    if (deviceData.subDeviceId !== undefined) {
      this.log(`[PHANTOM] ⚠️ Phantom sub-device detected (subDeviceId: ${deviceData.subDeviceId})`);
      this.log('[PHANTOM] Sensors do NOT have sub-devices - auto-deleting...');

      // Try to auto-delete this phantom device
      try {
        await this.setUnavailable('⚠️ Appareil fantôme - suppression automatique...').catch(() => { });

        // SDK3: Try to delete the device programmatically
        if (typeof this.homey?.app?.deleteDevice === 'function') {
          await this.homey.app.deleteDevice(this);
          this.log('[PHANTOM] ✅ Device deleted automatically');
        } else {
          // Fallback: Just mark as unavailable with clear message
          await this.setUnavailable('❌ Supprimez cet appareil fantôme manuellement').catch(() => { });
          this.log('[PHANTOM] ⚠️ Please delete this phantom device manually');
        }
      } catch (err) {
        this.log(`[PHANTOM] Could not auto-delete: ${err.message}`);
        await this.setUnavailable('❌ Appareil fantôme - à supprimer').catch(() => { });
      }
      return;
    }

    // Store zclNode reference
    this.zclNode = zclNode;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Detect protocol
    // ─────────────────────────────────────────────────────────────────────────
    this._protocolInfo = this._detectProtocol();

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║          HYBRID SENSOR BASE v5.3.63                         ║');
    this.log('╠══════════════════════════════════════════════════════════════╣');
    this.log(`║ Model:        ${this._protocolInfo.modelId || '(unknown)'}`);
    this.log(`║ Manufacturer: ${this._protocolInfo.mfr || '(unknown)'}`);
    this.log(`║ Protocol:     ${this._protocolInfo.protocol}`);
    this.log(`║ Mode:         ${this._protocolInfo.isTuyaDP ? 'TUYA DP (0xEF00)' : 'ZCL STANDARD'}`);
    this.log('╚══════════════════════════════════════════════════════════════╝');
    this.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Migrate capabilities (add missing ones)
    // ─────────────────────────────────────────────────────────────────────────
    await this._migrateCapabilities();

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Bump maxListeners on clusters
    // ─────────────────────────────────────────────────────────────────────────
    this._bumpMaxListeners(zclNode);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Setup based on protocol
    // ─────────────────────────────────────────────────────────────────────────
    if (this._protocolInfo.isTuyaDP) {
      this._isPureTuyaDP = true;
      this._blockZCL = true;
      await this._setupTuyaDPMode();
    } else {
      await this._setupZCLMode(zclNode);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Initialize value storage
    // ─────────────────────────────────────────────────────────────────────────
    this._sensorValues = {};
    this._lastUpdate = null;

    this.log('[HYBRID-SENSOR] ✅ Initialization complete');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOL DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  _detectProtocol() {
    try {
      const settings = this.getSettings?.() || {};
      const store = this.getStore?.() || {};
      const data = this.getData?.() || {};

      const modelId = settings.zb_modelId || store.modelId || data.modelId || '';
      const mfr = settings.zb_manufacturerName || store.manufacturerName || data.manufacturerName || '';

      // Tuya DP devices: TS0601, _TZE* manufacturers
      const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE');

      // Standard ZCL: TS0201, SNZB, SONOFF
      const isSONOFF = mfr === 'SONOFF' || mfr === 'eWeLink' || modelId.startsWith('SNZB');
      const isStandardZCL = (modelId === 'TS0201' || modelId.startsWith('TS02') || isSONOFF) && !isTuyaDP;

      return {
        protocol: isTuyaDP ? 'TUYA_DP' : 'ZCL',
        isTuyaDP,
        isStandardZCL,
        isSONOFF,
        modelId,
        mfr
      };
    } catch (err) {
      this.error('[PROTOCOL] Detection error:', err.message);
      // Default to Tuya DP (safer - avoids ZCL timeouts)
      return { protocol: 'TUYA_DP', isTuyaDP: true, isStandardZCL: false, modelId: '', mfr: '' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY MIGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  async _migrateCapabilities() {
    const requiredCaps = this.sensorCapabilities;

    for (const cap of requiredCaps) {
      if (!this.hasCapability(cap)) {
        try {
          await this.addCapability(cap);
          this.log(`[MIGRATE] ➕ Added capability: ${cap}`);
        } catch (err) {
          this.log(`[MIGRATE] ⚠️ Could not add ${cap}: ${err.message}`);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAX LISTENERS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  _bumpMaxListeners(zclNode) {
    try {
      const max = this.maxListeners;

      if (!zclNode?.endpoints) return;

      for (const endpointId of Object.keys(zclNode.endpoints)) {
        const endpoint = zclNode.endpoints[endpointId];

        // Bump endpoint
        if (endpoint && typeof endpoint.setMaxListeners === 'function') {
          endpoint.setMaxListeners(max);
        }

        // Bump all clusters
        if (endpoint?.clusters) {
          for (const cluster of Object.values(endpoint.clusters)) {
            if (cluster && typeof cluster.setMaxListeners === 'function') {
              cluster.setMaxListeners(max);
            }
          }
        }
      }

      // Bump zclNode itself
      if (typeof zclNode.setMaxListeners === 'function') {
        zclNode.setMaxListeners(max);
      }

      this.log(`[LISTENERS] ✅ MaxListeners set to ${max} on all clusters`);
    } catch (err) {
      this.log('[LISTENERS] Error:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TUYA DP MODE (EF00 cluster)
  // ═══════════════════════════════════════════════════════════════════════════

  async _setupTuyaDPMode() {
    this.log('[TUYA-DP] ════════════════════════════════════════════════════');
    this.log('[TUYA-DP] Setting up Tuya DataPoint mode...');
    this.log('[TUYA-DP] ❌ NO ZCL operations (getAttribute, configureReporting)');
    this.log('[TUYA-DP] ✅ Data arrives via cluster 0xEF00 DP events');
    this.log('[TUYA-DP] ════════════════════════════════════════════════════');

    // Setup DP listener
    this._setupDPListener();

    // Request initial DPs after a delay (device may be sleeping)
    setTimeout(() => this._requestInitialDPs(), 5000);
  }

  _setupDPListener() {
    // Listen to TuyaEF00Manager if available (from parent class)
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handleDP(dpId, value);
      });

      // Also listen to individual DP events
      for (const dp of Object.keys(this.dpMappings)) {
        this.tuyaEF00Manager.on(`dp-${dp}`, (value) => {
          this._handleDP(parseInt(dp), value);
        });
      }

      this.log('[TUYA-DP] ✅ DP listeners registered via TuyaEF00Manager');
    }

    // Also setup raw cluster listener as fallback
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya ||
        endpoint?.clusters?.manuSpecificTuya ||
        endpoint?.clusters?.['61184'];

      if (tuyaCluster && typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', (data) => {
          this.log('[TUYA-DP] 📥 Raw response received');
          this._parseRawTuyaData(data);
        });

        tuyaCluster.on('dataReport', (data) => {
          this.log('[TUYA-DP] 📥 DataReport received');
          this._parseRawTuyaData(data);
        });

        this.log('[TUYA-DP] ✅ Raw cluster listeners registered');
      }
    } catch (err) {
      this.log('[TUYA-DP] ⚠️ Could not setup raw listener:', err.message);
    }
  }

  _parseRawTuyaData(data) {
    try {
      if (!data) return;

      // Handle different data formats
      if (data.datapoints) {
        for (const dp of data.datapoints) {
          this._handleDP(dp.dp || dp.dpId, dp.value || dp.data);
        }
      } else if (data.dp !== undefined) {
        this._handleDP(data.dp, data.value || data.data);
      } else if (data.dpId !== undefined) {
        this._handleDP(data.dpId, data.dpValue || data.data);
      }
    } catch (err) {
      this.log('[TUYA-DP] Parse error:', err.message);
    }
  }

  _handleDP(dpId, rawValue) {
    const dp = parseInt(dpId);
    const mapping = this.dpMappings[dp];

    if (!mapping) {
      this.log(`[DP] ℹ️ Unmapped DP${dp} = ${rawValue}`);
      return;
    }

    const { capability, divisor = 1, transform } = mapping;

    // Parse value
    let value = this._parseValue(rawValue);

    // Apply divisor
    if (divisor !== 1 && typeof value === 'number') {
      value = value / divisor;
    }

    // Apply custom transform if defined
    if (typeof transform === 'function') {
      value = transform(value);
    }

    // Round to reasonable precision
    if (typeof value === 'number') {
      value = Math.round(value * 10) / 10;
    }

    this.log(`[DP] DP${dp} → ${capability} = ${value}`);

    // Store value
    this._sensorValues[capability] = value;
    this._lastUpdate = Date.now();

    // Set capability
    this._safeSetCapability(capability, value);
  }

  _parseValue(raw) {
    // Buffer/Array
    if (Buffer.isBuffer(raw) || Array.isArray(raw)) {
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      if (buf.length === 1) return buf[0];
      if (buf.length === 2) return buf.readInt16BE(0);
      if (buf.length === 4) return buf.readInt32BE(0);
      return buf[0];
    }

    // Already a number
    if (typeof raw === 'number') return raw;

    // String number
    if (typeof raw === 'string') {
      const num = parseFloat(raw);
      return isNaN(num) ? raw : num;
    }

    // Boolean
    if (typeof raw === 'boolean') return raw ? 1 : 0;

    return raw;
  }

  async _requestInitialDPs() {
    if (!this.tuyaEF00Manager) return;

    try {
      const dps = Object.keys(this.dpMappings).map(Number);
      this.log(`[TUYA-DP] Requesting initial DPs: ${dps.join(', ')}`);

      if (typeof this.tuyaEF00Manager.requestDPs === 'function') {
        await this.tuyaEF00Manager.requestDPs(dps);
      }
    } catch (err) {
      this.log('[TUYA-DP] ⚠️ Could not request DPs (device may be sleeping)');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZCL MODE (Standard clusters)
  // ═══════════════════════════════════════════════════════════════════════════

  async _setupZCLMode(zclNode) {
    this.log('[ZCL] ════════════════════════════════════════════════════════');
    this.log('[ZCL] Setting up standard ZCL mode...');
    this.log('[ZCL] ════════════════════════════════════════════════════════');

    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[ZCL] ⚠️ No endpoint 1 found');
      return;
    }

    const clusters = endpoint.clusters || {};

    // Temperature (0x0402)
    await this._setupZCLCluster(clusters,
      ['temperatureMeasurement', 'msTemperatureMeasurement'],
      'measure_temperature',
      (value) => Math.round((value / 100) * 10) / 10
    );

    // Humidity (0x0405)
    await this._setupZCLCluster(clusters,
      ['relativeHumidity', 'msRelativeHumidity'],
      'measure_humidity',
      (value) => Math.round(value / 100)
    );

    // Battery (0x0001)
    await this._setupZCLCluster(clusters,
      ['powerConfiguration', 'genPowerCfg'],
      'measure_battery',
      (value) => Math.min(100, Math.round(value / 2)),
      'batteryPercentageRemaining'
    );

    // Illuminance (0x0400)
    await this._setupZCLCluster(clusters,
      ['illuminanceMeasurement', 'msIlluminanceMeasurement'],
      'measure_luminance',
      (value) => Math.round(Math.pow(10, (value - 1) / 10000))
    );

    // Occupancy / Motion (0x0406)
    await this._setupZCLCluster(clusters,
      ['occupancySensing', 'msOccupancySensing'],
      'alarm_motion',
      (value) => value > 0,
      'occupancy'
    );

    // IAS Zone (0x0500) - Contact, Motion, Water, Smoke
    await this._setupIASZone(clusters);

    this.log('[ZCL] ✅ ZCL setup complete');
  }

  async _setupZCLCluster(clusters, clusterNames, capability, transform, attribute = 'measuredValue') {
    if (!this.hasCapability(capability)) return;

    let cluster = null;
    for (const name of clusterNames) {
      if (clusters[name]) {
        cluster = clusters[name];
        break;
      }
    }

    if (!cluster) return;

    try {
      // Setup attribute listener
      const attrEvent = `attr.${attribute}`;
      cluster.on(attrEvent, (value) => {
        const transformed = transform(value);
        this.log(`[ZCL] ${capability} = ${transformed}`);
        this._safeSetCapability(capability, transformed);
      });

      // Try to read initial value (with timeout)
      const readPromise = cluster.readAttributes([attribute])
        .then(data => {
          if (data?.[attribute] != null) {
            const transformed = transform(data[attribute]);
            this.log(`[ZCL] Initial ${capability} = ${transformed}`);
            this._safeSetCapability(capability, transformed);
          }
        })
        .catch(() => { });

      await Promise.race([readPromise, new Promise(r => setTimeout(r, 3000))]);

      // Configure reporting
      if (typeof cluster.configureReporting === 'function') {
        cluster.configureReporting({
          [attribute]: { minInterval: 60, maxInterval: 3600, minChange: 1 }
        }).catch(() => { });
      }

      this.log(`[ZCL] ✅ ${capability} configured`);
    } catch (err) {
      this.log(`[ZCL] ⚠️ ${capability} setup failed:`, err.message);
    }
  }

  async _setupIASZone(clusters) {
    const iasCluster = clusters.iasZone || clusters.ssIasZone;
    if (!iasCluster) return;

    try {
      // Determine capability based on zone type
      let capability = 'alarm_contact'; // Default

      try {
        const attrs = await iasCluster.readAttributes(['zoneType']);
        const zoneType = attrs?.zoneType;

        if (zoneType === 0x000D) capability = 'alarm_motion';      // Motion
        else if (zoneType === 0x0015) capability = 'alarm_contact'; // Contact
        else if (zoneType === 0x002A) capability = 'alarm_water';   // Water
        else if (zoneType === 0x0028) capability = 'alarm_smoke';   // Smoke
      } catch (e) { }

      if (!this.hasCapability(capability)) {
        await this.addCapability(capability).catch(() => { });
      }

      iasCluster.on('attr.zoneStatus', (status) => {
        const alarm = (status & 1) !== 0; // Bit 0 = Alarm1
        this.log(`[IAS] ${capability} = ${alarm}`);
        this._safeSetCapability(capability, alarm);
      });

      this.log(`[IAS] ✅ ${capability} configured`);
    } catch (err) {
      this.log('[IAS] Setup error:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFE CAPABILITY SETTER
  // ═══════════════════════════════════════════════════════════════════════════

  _safeSetCapability(capability, value) {
    if (!this.hasCapability(capability)) {
      this.log(`[CAP] ⚠️ Missing capability: ${capability}`);
      return;
    }

    this.setCapabilityValue(capability, value).catch(err => {
      this.error(`[CAP] Error setting ${capability}:`, err.message);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY REGISTRATION OVERRIDE (Block ZCL for Tuya DP)
  // ═══════════════════════════════════════════════════════════════════════════

  async registerCapability(capabilityId, clusterId, opts) {
    if (this._isPureTuyaDP) {
      this.log(`[ZCL-GUARD] 🛑 registerCapability(${capabilityId}) BLOCKED - Tuya DP device`);
      return;
    }
    return super.registerCapability(capabilityId, clusterId, opts);
  }

  async registerAllCapabilitiesWithReporting() {
    if (this._isPureTuyaDP) {
      this.log('[ZCL-GUARD] 🛑 registerAllCapabilitiesWithReporting() BLOCKED - Tuya DP device');
      return;
    }
    return super.registerAllCapabilitiesWithReporting();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current sensor values
   */
  getSensorValues() {
    return { ...this._sensorValues };
  }

  /**
   * Get last update timestamp
   */
  getLastUpdate() {
    return this._lastUpdate;
  }

  /**
   * Check if device is Tuya DP
   */
  isTuyaDP() {
    return this._protocolInfo?.isTuyaDP || false;
  }

  /**
   * Log available clusters (for debugging)
   */
  logClusters() {
    try {
      const endpoints = this.zclNode?.endpoints || {};
      for (const [epId, ep] of Object.entries(endpoints)) {
        const clusters = Object.keys(ep?.clusters || {});
        this.log(`[CLUSTERS] Endpoint ${epId}: ${clusters.join(', ') || '(none)'}`);
      }
    } catch (err) {
      this.log('[CLUSTERS] Error:', err.message);
    }
  }
}

module.exports = HybridSensorBase;
