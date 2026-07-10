'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { getSensorConfig, transformPresence } = require('./configs');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');
const IntelligentDPAutoDiscovery = require('../../lib/sensors/IntelligentDPAutoDiscovery');
const MfrHelper = require('../../lib/helpers/ManufacturerNameHelper');
const { UniversalDPSender } = require('../../lib/tuya/UniversalDPSender');

/**
 * Known mains-powered mmWave radar manufacturers (230V AC ceiling/wall radars).
 * These devices report battery DPs but are actually mains-powered.
 */
const MTG_RELAY_RADARS = [
  '_tze204_sbyx0lm6',
  '_tze204_clrdrnya',
  '_tze204_dtzziy1e',
  '_tze204_iaeejhvf',
  '_tze204_mtoaryre',
  '_tze200_mp902om5',
  '_tze204_pfayrzcw',
  '_tze284_4qznlkbu',
  '_tze200_clrdrnya',
  '_tze200_sbyx0lm6',
];

const MAINS_POWERED_RADARS = new Set([
  '_tze200_lyetpprm',
  '_tze204_lyetpprm',
  '_tze200_wukb7rhc',
  '_tze204_wukb7rhc',
  '_tze200_jva8ink8',
  '_tze204_jva8ink8',
  ...MTG_RELAY_RADARS,
]);

/**
 * PresenceSensorRadarDevice - v8.0.0 ULTIMATE
 * Universal Radar/mmWave sensor driver with intelligent inference and auto-discovery.
 */
class PresenceSensorRadarDevice extends UnifiedSensorBase {

  /**
   * Override: Mains-powered radars should not be treated as battery devices.
   * This suppresses battery polling, periodic dataQuery, and adjusts reporting intervals.
   */
  get mainsPowered() {
    const config = this._getRadarConfig();
    if (config && config.mainsPowered) return true;
    const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
    return MAINS_POWERED_RADARS.has(mfr);
  }

  get sensorCapabilities() {
    const config = this._getRadarConfig();
    const caps = new Set(['alarm_motion', 'alarm_human', 'button.1']);
    const noBattery = this.mainsPowered
      || config.noBatteryCapability
      || config.suppressBatteryCapability
      || config.disableBatteryReporting;

    const addCap = (capability) => {
      if (!capability) {return;}
      if (capability === 'measure_battery' && noBattery) {return;}
      if (capability === 'alarm_battery' && noBattery) {return;}
      if (capability === 'measure_temperature' && config.noTemperature) {return;}
      if (capability === 'measure_humidity' && config.noHumidity) {return;}
      if (capability === 'onoff' && !config.hasRelay) {return;}
      caps.add(capability);
    };

    if (config.hasIlluminance) {caps.add('measure_luminance');}

    for (const mapping of Object.values(config.dpMap || {})) {
      addCap(mapping.cap);
    }

    return Array.from(caps);
  }

  /**
   * Cache the radar config lookup to avoid repeated calls.
   */
  _getRadarConfig() {
    if (!this._cachedRadarConfig) {
      this._cachedRadarConfig = getSensorConfig(MfrHelper.getManufacturerName(this), this.getStoreValue('modelId'));
    }
    return this._cachedRadarConfig;
  }

  async onNodeInit({ zclNode }) {
    // v5.11.139: Call super.onNodeInit() FIRST to initialize TuyaZigbeeDevice base class
    // which provides _safeInvoke and other L14 features
    try {
      await super.onNodeInit({ zclNode });
    } catch (err) {
      this.log('[RADAR] Base init error:', err.message);
    }

    this.log('[RADAR] v8.0.0 Ultimate Initializing...');

    // Initialize v8 components
    this._inference = new IntelligentPresenceInference(this);
    this._discovery = new IntelligentDPAutoDiscovery(this);

    await this._applyRadarCapabilityProfile();
    this._registerRadarCapabilityListeners();

    // Idea #21: Initialize multi-zone capabilities if config supports it
    await this._initMultiZoneCapabilities();

    try {
      const appVersion = this.getStoreValue('appVersion') || this.zclNode?.endpoints?.[1]?.clusters?.basic?.appVersion;
      if (appVersion) {this._inference.setFirmwareInfo(appVersion);}
    } catch (e) {
      this.log('[RADAR] Firmware detection failed:', e.message);
    }

    // Start polling/refresh cycle
    this._startInitializationCycle(zclNode);

    this.log('[RADAR] Ready');
  }

  _ensureInference() {
    if (!this._inference) {
      this._inference = new IntelligentPresenceInference(this);
    }
    return this._inference;
  }

  _ensureDiscovery() {
    if (!this._discovery) {
      this._discovery = new IntelligentDPAutoDiscovery(this);
    }
    return this._discovery;
  }

  async _applyRadarCapabilityProfile() {
    const requiredCaps = new Set(this.sensorCapabilities);
    const staleCaps = [
      'measure_battery',
      'alarm_battery',
      'measure_temperature',
      'measure_humidity',
      'onoff',
      'alarm_motion.zone1',
      'alarm_motion.zone2',
      'alarm_motion.zone3',
      'measure_luminance.distance.zone1',
      'measure_luminance.distance.zone2',
      'measure_luminance.distance.zone3',
      'measure_motion.classification',
    ];

    for (const cap of requiredCaps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(e => this.log(`[RADAR] Could not add ${cap}: ${e.message}`));
      }
    }

    for (const cap of staleCaps) {
      if (this.hasCapability(cap) && !requiredCaps.has(cap)) {
        await this.removeCapability(cap).catch(e => this.log(`[RADAR] Could not remove stale ${cap}: ${e.message}`));
      }
    }

    if (this.mainsPowered) {
      await this.setStoreValue('powerSource', 'mains').catch(() => {});
      await this.setStoreValue('battery', false).catch(() => {});
    }
  }

  _registerRadarCapabilityListeners() {
    const config = this._getRadarConfig();
    if (!config.hasRelay || !this.hasCapability('onoff') || this._radarRelayListenerRegistered) {return;}

    try {
      this.registerCapabilityListener('onoff', async (value) => {
        const dp = Number(config.relayDp || 108);
        const sent = await this._sendRadarDP(dp, value ? 1 : 0, config.relayType || 'enum');
        if (!sent) {
          throw new Error(`Relay DP${dp} write failed`);
        }
        return true;
      });
      this._radarRelayListenerRegistered = true;
      this.log(`[RADAR] Relay capability registered on DP${config.relayDp || 108}`);
    } catch (err) {
      this.log('[RADAR] Relay listener registration failed:', err.message);
    }
  }

  async _sendRadarDP(dp, value, type = 'value') {
    try {
      if (!this._radarDPSender) {
        this._radarDPSender = new UniversalDPSender(this);
      }
      return await this._radarDPSender.sendTuyaDP(dp, value, type);
    } catch (err) {
      this.error(`[RADAR] DP${dp} send failed:`, err.message);
      return false;
    }
  }

  _convertRadarSettingValue(value, mapping = {}) {
    if (mapping.enumMap && Object.prototype.hasOwnProperty.call(mapping.enumMap, value)) {
      return mapping.enumMap[value];
    }
    if (mapping.divisor && typeof value === 'number') {
      return value / mapping.divisor;
    }
    return value;
  }

  _toRadarDPValue(value, mapping = {}) {
    if (mapping.reverseEnumMap && Object.prototype.hasOwnProperty.call(mapping.reverseEnumMap, value)) {
      return mapping.reverseEnumMap[value];
    }
    if (mapping.divisor && typeof value === 'number') {
      return Math.round(value * mapping.divisor);
    }
    return value;
  }

  _getRadarDPType(mapping = {}) {
    if (mapping.type === 'enum' || mapping.type === 'enum_onoff') {return 'enum';}
    if (mapping.type === 'bool' || mapping.type === 'presence_bool') {return 'bool';}
    return 'value';
  }

  _handleDP(dpId, rawValue) {
    const dp = parseInt(dpId, 10);
    const config = this._getRadarConfig();
    const mapping = config.dpMap?.[dp];

    if (mapping) {
      this._sendTimeSyncIfNeeded?.();
      this.updateRadioActivity?.();
      const value = this._parseValue ? this._parseValue(rawValue) : rawValue;
      return this._handleStaticDP(dp, value, mapping, config);
    }

    return super._handleDP(dpId, rawValue);
  }

  /**
   * Main Tuya DP processing entry point
   */
  onTuyaDP(dpId, value, dpType) {
    const config = this._getRadarConfig();
    const dp = parseInt(dpId, 10);
    const mapping = config.dpMap?.[dp];

    // 1. Process via static config if matched
    if (mapping) {
      const parsedValue = this._parseValue ? this._parseValue(value) : value;
      return this._handleStaticDP(dp, parsedValue, mapping, config);
    }

    // 2. Fallback: Intelligent Auto-Discovery
    const discovery = this._ensureDiscovery();
    const discovered = discovery.analyzeDP(dp, value);
    if (discovered && discovered.confidence >= 60) {
      const result = discovery.applyDiscoveredValue(dp, value);
      if (result) {
        this.log(`[RADAR] 🧠 Auto-Discovery: DP${dpId} → ${result.capability}=${result.value} (${result.confidence}%)`);
        return this.safeSetCapabilityValue(result.capability, result.value).catch(() => { });
      }
    }

    // 3. Diagnostic logging for unknown DPs
    this.log(`[RADAR] 📊 Unknown DP${dpId} [type=${dpType}] = ${value}`);
  }

  /**
   * Handle DPs defined in the SENSOR_CONFIGS
   */
  _handleStaticDP(dpId, value, mapping, config) {
    // A. Handle presence DPs
    if (mapping.cap === 'alarm_motion') {
      const inference = this._ensureInference();
      // v9.7.6: Use enumMap from mapping if available (e.g., gkfbdvyx: {0:false, 1:true, 2:true})
      let presence;
      if (mapping.enumMap) {
        presence = mapping.enumMap[value] !== undefined ? mapping.enumMap[value] : !!value;
        if (config.invertPresence) { presence = !presence; }
      } else {
        presence = transformPresence(value, mapping.type, config.invertPresence, config.configName);
      }

      // Integrate with inference engine if needed
      if (mapping.useInference) {
        presence = inference.updatePresenceDP(value);
      } else {
        inference.updatePresenceDP(value); // Keep in sync
      }

      if (presence !== null) {
        this.safeSetCapabilityValue('alarm_human', presence).catch(() => {});
        return this.safeSetCapabilityValue('alarm_motion', presence).catch(() => {});
      }
      return;
    }

    // A2. Idea #21: Handle multi-zone presence DPs (alarm_motion.zone1/zone2/zone3)
    if (mapping.cap && mapping.cap.startsWith('alarm_motion.zone')) {
      let presence = transformPresence(value, mapping.type, config.invertPresence, config.configName);
      if (presence !== null) {
        this.log(`[RADAR] Zone ${mapping.zone} presence: ${presence}`);
        return this.safeSetCapabilityValue(mapping.cap, presence).catch(() => {});
      }
      return;
    }

    // A3. Idea #21: Handle movement classification DP
    if (mapping.cap === 'measure_motion.classification') {
      const classification = transformPresence(value, mapping.type, false, config.configName);
      this.log(`[RADAR] Movement classification: ${classification} (raw=${value})`);
      return this.safeSetCapabilityValue('measure_motion.classification', classification).catch(() => {});
    }

    // B. Handle distance DPs (feed inference)
    if (mapping.cap === 'measure_luminance.distance') {
      let distance;
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        distance = smartParse(value, dpId, { capability: 'measure_luminance.distance' });
      } else {
        distance = value / (mapping.divisor || 100);
      }
      this._ensureInference().updateDistance(distance);
      return this.safeSetCapabilityValue('measure_luminance.distance', distance).catch(() => {});
    }

    // B2. Idea #21: Handle multi-zone distance DPs (measure_luminance.distance.zone1/zone2/zone3)
    if (mapping.cap && mapping.cap.startsWith('measure_luminance.distance.zone')) {
      let distance;
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        distance = smartParse(value, dpId, { capability: mapping.cap });
      } else {
        distance = value / (mapping.divisor || 100);
      }
      this.log(`[RADAR] Zone ${mapping.zone} distance: ${distance}m`);
      return this.safeSetCapabilityValue(mapping.cap, distance).catch(() => {});
    }

    // C. Handle illuminance DPs
    if (mapping.cap === 'measure_luminance') {
      let lux = value;
      if (mapping.type === 'lux_direct') {lux = value;}
      else if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        lux = smartParse(value, dpId, { capability: 'measure_luminance' });
      } else if (mapping.divisor) {lux = value / mapping.divisor;}

      this._ensureInference().updateLux(lux);
      return this.safeSetCapabilityValue('measure_luminance', lux).catch(() => {});
    }

    // C2. Handle relay status DPs.
    if (mapping.cap === 'onoff') {
      let relayOn;
      if (mapping.enumMap && Object.prototype.hasOwnProperty.call(mapping.enumMap, value)) {
        relayOn = mapping.enumMap[value];
      } else {
        relayOn = value === true || value === 1 || value === '1' || value === 'ON' || value === 'on';
      }
      return this.safeSetCapabilityValue('onoff', !!relayOn).catch(() => {});
    }

    // D. Handle battery DPs - ignore for mains-powered radars
    if (mapping.cap === 'measure_battery') {
      if (this.mainsPowered) {
        this.log(`[RADAR] Ignoring battery DP${dpId} on mains-powered radar`);
        return;
      }
      let battery;
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        battery = smartParse(value, dpId, { capability: 'measure_battery' });
      } else {
        battery = value / (mapping.divisor || 1);
      }
      return this.safeSetCapabilityValue('measure_battery', Math.min(100, battery)).catch(() => {});
    }

    // E. Setting/internal feedback DPs: store the decoded value for diagnostics.
    if (!mapping.cap && (mapping.setting || mapping.internal)) {
      const key = mapping.setting || mapping.internal;
      const converted = this._convertRadarSettingValue(value, mapping);
      this.setStoreValue(`radar_${key}`, converted).catch(() => {});
      if (mapping.setting && this.getSetting?.(mapping.setting) !== undefined) {
        this.setSettings({ [mapping.setting]: converted }).catch(() => {});
      }
    }
  }

  /**
   * Initialize polling and time sync
   */
  _startInitializationCycle(zclNode) {
    if (!zclNode?.endpoints?.[1]) {
      this.log('[RADAR] No endpoint 1 available - deferring initialization');
      // Retry after delay for connection failures
      this.homey.setTimeout(() => {
        if (this._destroyed) {return;}
        this.log('[RADAR] Retrying initialization after connection delay...');
        try {
          this._sendTimeSync(zclNode);
          this._requestDPRefresh(zclNode);
        } catch (e) {
          this.log('[RADAR] Deferred init failed:', e.message);
        }
      }, 5000);
      return;
    }

    // 1. Time Sync
    this.homey.setTimeout(() => { if (this._destroyed) return; this._sendTimeSync(zclNode); }, 2000);

    // 2. DP Refresh
    this.homey.setTimeout(() => { if (this._destroyed) return; this._requestDPRefresh(zclNode); }, 3000);

    if (this._getRadarConfig().needsPolling === false) {
      this.log('[RADAR] Periodic DP polling disabled by device profile');
      return;
    }

    // 3. Periodic polling (60s)
    this._pollingInterval = this.homey.setInterval(() => {
      if (this._destroyed) { return; }
      this._requestDPRefresh(zclNode);
    }, 60000);
  }

  /**
   * Logic for sending time sync to Tuya devices
   */
  async _sendTimeSync(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuya = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
      if (!tuya || !tuya.command) {return;}

      const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime();
      const utcSeconds = Math.floor((Date.now() - ZIGBEE_EPOCH) / 1000);
      const localSeconds = utcSeconds + (-new Date().getTimezoneOffset() * 60);

      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcSeconds, 0);
      payload.writeUInt32BE(localSeconds, 4);

      await tuya.command('mcuSyncTime', { payloadSize: 8, payload }).catch(() => {});
      this.log('[RADAR] ⏰ Time sync sent');
    } catch (e) {
      this.error('[RADAR] Time sync failed:', e.message);
    }
  }

  async _requestDPRefresh(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuya = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
      if (tuya?.dataQuery) {
        await tuya.dataQuery().catch(() => {});
      }
    } catch (e) {
      this.error('[RADAR] DP refresh failed:', e.message);
    }
  }

  /**
   * Idea #21: Initialize multi-zone presence capabilities dynamically.
   * Only adds zone DPs if the device config declares hasMultiZone.
   */
  async _initMultiZoneCapabilities() {
    const config = this._getRadarConfig();
    if (!config || !config.hasMultiZone) return;

    // Zone presence capabilities (alarm_motion.zone1, zone2, zone3)
    const zoneCaps = [
      'alarm_motion.zone1',
      'alarm_motion.zone2',
      'alarm_motion.zone3',
    ];
    // Zone distance capabilities (measure_luminance.distance.zone1, zone2, zone3)
    const zoneDistanceCaps = [
      'measure_luminance.distance.zone1',
      'measure_luminance.distance.zone2',
      'measure_luminance.distance.zone3',
    ];
    // Movement classification capability
    const classificationCap = 'measure_motion.classification';

    for (const cap of [...zoneCaps, ...zoneDistanceCaps, classificationCap]) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => {});
      }
    }

    // Initialize zone state tracker
    this._zoneState = { 1: false, 2: false, 3: false };
    this._movementClassification = 'none';

    this.log('[RADAR] Multi-zone capabilities initialized');
  }

  /**
   * Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (super.onSettings) {await super.onSettings({ oldSettings, newSettings, changedKeys });}
    
    const config = this._getRadarConfig();
    if (!config.dpMap) {return;}

    for (const key of changedKeys) {
      const dpId = Object.keys(config.dpMap).find(id => config.dpMap[id].setting === key);
      if (dpId) {
        let value = newSettings[key];
        const dpConfig = config.dpMap[dpId];
        value = this._toRadarDPValue(value, dpConfig);
        const dpType = this._getRadarDPType(dpConfig);
        
        this.log(`[RADAR] ⚙️ Syncing ${key} → DP${dpId} value=${value}`);
        const sent = await this._sendRadarDP(parseInt(dpId, 10), value, dpType);
        if (!sent) {
          this.error(`[RADAR] Failed syncing ${key} to DP${dpId}`);
        }
      }
    }
  }

  onUninit() {
    if (this._pollingInterval) {this.homey.clearInterval(this._pollingInterval);}
    if (super.onUninit) {super.onUninit();}
  }

  onDeleted() {
    this.log('[RADAR] Device deleted');
    if (super.onDeleted) {super.onDeleted();}
  }
}

module.exports = PresenceSensorRadarDevice;
