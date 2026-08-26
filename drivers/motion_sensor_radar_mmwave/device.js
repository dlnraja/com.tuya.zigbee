'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { smartParse } = require('../../lib/managers/SmartDivisorManager');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');
const LowLevelBridge = require('../../lib/LowLevelBridge');
const {
  isLinptechES1,
  planSettingWrite,
  isLinptechSettingKey,
  isOptionalLinptechSetting,
  ATTR_RX_MAP,
  ATTR_NAME,
  CLUSTER_WRITE_CHAIN,
  ATTR,
} = require('../../lib/profiles/LinptechES1Profile');

/**
 * Known mains-powered mmWave radar manufacturers (230V AC ceiling/wall radars).
 * These devices report battery DP values but are actually mains-powered.
 */
const MAINS_POWERED_RADARS = new Set([
  // P124/P127: clrdrnya sacred couple lives on presence_sensor_radar only
  '_tze200_lyetpprm',
  '_tze204_lyetpprm',
  '_tze200_wukb7rhc',
  '_tze204_wukb7rhc',
  '_tze200_jva8ink8',
  '_tze204_jva8ink8',
]);

/** Non-Linptech compose aliases → UnifiedSensorBase SETTING_DP_MAP keys */
const LEGACY_SETTING_ALIASES = Object.freeze({
  minimum_range: 'min_range',
  maximum_range: 'max_range',
});

/**
 * Motion Sensor Radar mmWave Device
 * P2258/P2261/P2262: Linptech ES1ZZ / Moes ZSS-LP-HP02-MS — settings on 0xE002
 * named attrs (Homesuite ManuSpecificTuya3 pattern), not EF00 DP9.
 * Firmware rejects configureReporting (UNSUP_CLUSTER_COMMAND) — skip throttle.
 */
class MotionSensorRadarDevice extends UnifiedSensorBase {

  get mainsPowered() {
    const mfr = (this.getSetting('zb_manufacturer_name') || this._manufacturerName || '').toLowerCase();
    return MAINS_POWERED_RADARS.has(mfr);
  }

  get sensorCapabilities() {
    const mfr = (this.getSetting('zb_manufacturer_name') || this._manufacturerName || '').toLowerCase();
    const isMainsRadar = MAINS_POWERED_RADARS.has(mfr);
    if (isMainsRadar) {
      return ['alarm_motion', 'measure_luminance.distance', 'measure_luminance'];
    }
    return ['alarm_motion', 'measure_luminance.distance', 'measure_luminance', 'measure_battery'];
  }

  _isLinptechES1() {
    const mfr = this.getSetting('zb_manufacturer_name') || this._manufacturerName || '';
    const pid = this.getSetting('zb_product_id') || this._modelId || '';
    return isLinptechES1(mfr, pid);
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.log('[MMWAVE] 🚀 v8.0.0 Modernizing...');

      this._inference = new IntelligentPresenceInference(this);
      this._llBridge = new LowLevelBridge(this);

      await super.onNodeInit({ zclNode });
      await this._removeMainsPoweredPhantomCapabilities();

      const appVersion = this.getStoreValue('appVersion') || this.zclNode.endpoints[1]?.clusters?.basic?.appVersion;
      if (appVersion) { this._inference.setFirmwareInfo(appVersion); }

      if (this._isLinptechES1()) {
        this.log('[MMWAVE][LINPTECH] ES1ZZ profile — 0xE002 named attr settings path');
        this._setupLinptechClusterListener(zclNode);
        // WHY: same Basic read as Z2M configureMagicPacket / Homesuite — wakes dormant reports
        this._linptechBasicInit(zclNode).catch((err) => {
          this.log('[MMWAVE][LINPTECH] Basic init deferred:', err.message);
        });
        // Contre quoi: configureReporting → UNSUP_CLUSTER_COMMAND on this firmware
        this._setupLinptechIlluminanceListener(zclNode);
      } else {
        await this._configureIlluminanceReporting();
      }

      this.log('[MMWAVE] ✅ Ready');
    }, 'onNodeInit');
  }

  _getLinptechManuCluster(ep) {
    if (!ep?.clusters) { return null; }
    return ep.clusters.manuSpecificTuya3
      || ep.clusters.tuyaE002
      || ep.clusters[57346]
      || ep.clusters[0xE002]
      || null;
  }

  async _linptechBasicInit(zclNode) {
    const basic = zclNode?.endpoints?.[1]?.clusters?.basic;
    if (!basic?.readAttributes) { return; }
    try {
      await basic.readAttributes([
        'manufacturerName',
        'zclVersion',
        'appVersion',
        'modelId',
        'powerSource',
        'attributeReportingStatus',
      ]);
      this.log('[MMWAVE][LINPTECH] Basic init read OK (report wake)');
    } catch (err) {
      // Request itself is the wake trigger even if some attrs are rejected
      this.log('[MMWAVE][LINPTECH] Basic init sent:', err.message);
    }
  }

  _setupLinptechClusterListener(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    if (!ep?.clusters) { return; }

    const manu = this._getLinptechManuCluster(ep);
    const fallbacks = CLUSTER_WRITE_CHAIN
      .map((id) => ep.clusters[id] || ep.clusters[id === 0xE002 ? 'tuyaE002' : 'tuyaE001'])
      .filter(Boolean);
    const clusters = [...new Set([manu, ...fallbacks].filter(Boolean))];

    if (!clusters.length) {
      this.log('[MMWAVE][LINPTECH] Cluster 0xE002 not on EP1 — settings TX may still work via LowLevelBridge');
      return;
    }

    const namedAttrs = {
      presenceKeepTime: ATTR.presenceKeepTime,
      motionSensitivity: ATTR.motionSensitivity,
      staticSensitivity: ATTR.staticSensitivity,
      ledIndicator: ATTR.ledIndicator,
      targetDistance: ATTR.targetDistance,
      motionDetectionDistance: ATTR.motionDistance,
    };

    this._linptechAttrListeners = [];
    for (const cluster of clusters) {
      if (typeof cluster.on !== 'function') { continue; }

      for (const [name, attrId] of Object.entries(namedAttrs)) {
        const handler = (value) => {
          try {
            this._handleLinptechNamedAttr(attrId, value, name);
          } catch (err) {
            this.log('[MMWAVE][LINPTECH] named attr error:', err.message);
          }
        };
        cluster.on(`attr.${name}`, handler);
        this._linptechAttrListeners.push({ cluster, event: `attr.${name}`, handler });
      }

      const bulkHandler = (report) => {
        try {
          this._handleLinptechAttrReport(report);
        } catch (err) {
          this.log('[MMWAVE][LINPTECH] attr report error:', err.message);
        }
      };
      cluster.on('attributeReport', bulkHandler);
      cluster.on('reporting', bulkHandler);
      this._linptechAttrListeners.push({ cluster, event: 'attributeReport', handler: bulkHandler });
      this._linptechAttrListeners.push({ cluster, event: 'reporting', handler: bulkHandler });
    }
  }

  _handleLinptechNamedAttr(attrId, value, name) {
    const rxKey = ATTR_RX_MAP[attrId] || name;
    if (attrId === ATTR.targetDistance || attrId === ATTR.motionDistance) {
      const distanceCm = Number(value);
      if (!Number.isNaN(distanceCm)) {
        const distanceM = distanceCm / 100;
        this._inference.updateDistance(distanceM);
        this.safeSetCapabilityValue('measure_luminance.distance', distanceM).catch(() => {});
      }
    }
    this.log(`[MMWAVE][LINPTECH] RX ${rxKey}=${value}`);
  }

  _handleLinptechAttrReport(report) {
    const payload = report?.attributes || report?.data || report || {};
    for (const [attrKey, raw] of Object.entries(payload)) {
      const attrId = Number.isFinite(Number(attrKey)) ? Number(attrKey) : null;
      const byName = ATTR_NAME && Object.entries(ATTR_NAME).find(([, n]) => n === attrKey);
      const resolvedId = attrId != null && !Number.isNaN(attrId) ? attrId : (byName ? Number(byName[0]) : null);
      if (resolvedId == null) { continue; }
      const value = typeof raw === 'object' && raw !== null && 'value' in raw ? raw.value : raw;
      this._handleLinptechNamedAttr(resolvedId, value, ATTR_NAME[resolvedId] || attrKey);
    }
  }

  _setupLinptechIlluminanceListener(zclNode) {
    const illum = zclNode?.endpoints?.[1]?.clusters?.illuminanceMeasurement;
    if (!illum || typeof illum.on !== 'function') {
      this.log('[MMWAVE][LINPTECH] Illuminance 0x0400 unavailable — DP lux fallback OK');
      return;
    }
    // Listen only — do NOT configureReporting (firmware rejects it)
    this._onLinptechIllum = (raw) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) { return; }
      const lux = n === 0 ? 0 : Math.round(10 ** ((n - 1) / 10000));
      this._inference.updateLux(lux);
      this.safeSetCapabilityValue('measure_luminance', lux).catch(() => {});
    };
    illum.on('attr.measuredValue', this._onLinptechIllum);
    this.log('[MMWAVE][LINPTECH] Illuminance listener armed (no configureReporting)');
  }

  async _configureIlluminanceReporting() {
    try {
      if (this.zclNode && this.zclNode.endpoints[1] && this.zclNode.endpoints[1].clusters.illuminanceMeasurement) {
        const illuminanceCluster = this.zclNode.endpoints[1].clusters.illuminanceMeasurement;
        await illuminanceCluster.configureReporting({
          measuredValue: {
            minInterval: 30,
            maxInterval: 300,
            minChange: 50,
          },
        });
        this.log('[MMWAVE] ✅ Illuminance reporting configured for continuous updates');
      }
    } catch (error) {
      this.log('[MMWAVE] ❌ Failed to configure illuminance reporting:', error.message);
    }
  }

  onTuyaDP(dpId, value, dpType) {
    this.log(`[MMWAVE] 📥 DP${dpId} = ${value}`);

    if (this._isLinptechES1()) {
      switch (dpId) {
        case 101:
          this.log(`[MMWAVE][LINPTECH] fading_time RX DP101=${value}`);
          return;
        default:
          break;
      }
    }

    switch (dpId) {
      case 1: {
        const presence = this._inference.updatePresenceDP(value);
        return this.safeSetCapabilityValue('alarm_motion', presence).catch(() => { });
      }

      case 9:
      case 102: {
        if (this._isLinptechES1()) {
          this.log(`[MMWAVE][LINPTECH] skip DP${dpId} distance — use cluster attrs`);
          return;
        }
        const distance = smartParse(value, dpId, { capability: 'measure_luminance.distance' });
        this._inference.updateDistance(distance);
        return this.safeSetCapabilityValue('measure_luminance.distance', distance).catch(() => {});
      }

      case 12:
      case 104:
      case 106: {
        const lux = typeof value === 'number' && value > 200 ? Math.round(value / 10) : value;
        this._inference.updateLux(lux);
        return this.safeSetCapabilityValue('measure_luminance', lux).catch(() => {});
      }

      case 4:
      case 15:
        if (this.mainsPowered) {
          this.log(`[MMWAVE] ⏭️ Ignoring battery DP${dpId} on mains-powered radar`);
          return;
        }
        return this.safeSetCapabilityValue('measure_battery', value).catch(() => {});

      default:
        break;
    }
  }

  async _removeMainsPoweredPhantomCapabilities() {
    if (!this.mainsPowered) { return; }
    for (const cap of ['measure_temperature', 'measure_humidity', 'measure_battery']) {
      if (!this.hasCapability(cap)) { continue; }
      await this.removeCapability(cap)
        .then(() => this.log(`[MMWAVE] Removed unsupported mains-powered capability: ${cap}`))
        .catch((err) => this.log(`[MMWAVE] Could not remove ${cap}: ${err.message}`));
    }
  }

  async _writeLinptechSetting(key, rawValue) {
    const plan = planSettingWrite(key, rawValue);
    if (!plan) { return false; }

    if (plan.kind === 'zcl') {
      // WHY P2262: named writeAttributes on registered tuyaE002 (Homesuite path) first
      const ep = this.zclNode?.endpoints?.[1];
      const manu = this._getLinptechManuCluster(ep);
      if (manu && typeof manu.writeAttributes === 'function' && plan.attrName) {
        try {
          await manu.writeAttributes({ [plan.attrName]: plan.value });
          this.log(`[MMWAVE][LINPTECH] ${key} → tuyaE002.${plan.attrName}=${plan.value}`);
          return true;
        } catch (err) {
          this.log(`[MMWAVE][LINPTECH] named write failed, trying LowLevelBridge: ${err.message}`);
        }
      }

      const chain = [plan.cluster, ...(plan.fallbackClusters || [])].filter((c, i, a) => a.indexOf(c) === i);
      let wrote = false;
      let lastCluster = plan.cluster;
      for (const clusterId of chain) {
        lastCluster = clusterId;
        const ok = await this._llBridge.writeZCLAttribute(clusterId, plan.attr, plan.value, 1);
        if (ok) {
          wrote = true;
          this.log(`[MMWAVE][LINPTECH] ${key} → 0x${clusterId.toString(16)} attr ${plan.attr}=${plan.value}`);
          break;
        }
      }
      if (!wrote) {
        throw new Error(`ZCL 0x${lastCluster.toString(16)} attr ${plan.attr} write failed (tried ${chain.map((c) => `0x${c.toString(16)}`).join(',')})`);
      }
      return true;
    }

    if (plan.kind === 'dp' && typeof this.sendTuyaCommand === 'function') {
      await this.sendTuyaCommand(plan.dp, plan.value, plan.type);
      this.log(`[MMWAVE][LINPTECH] ${key} → DP${plan.dp}=${plan.value}`);
      return true;
    }

    throw new Error(`No TX path for ${key}`);
  }

  async _linptechOnSettings({ oldSettings, newSettings, changedKeys }) {
    const genericKeys = changedKeys.filter((k) => !isLinptechSettingKey(k));
    if (genericKeys.length) {
      await super.onSettings({ oldSettings, newSettings, changedKeys: genericKeys });
    }

    for (const key of changedKeys) {
      if (!isLinptechSettingKey(key)) { continue; }
      try {
        await this._writeLinptechSetting(key, newSettings[key]);
      } catch (err) {
        // WHY P2263: some Moes firmwares reject LED 57353 (UNSUPPORTED_ATTRIBUTE) — soft-fail
        if (isOptionalLinptechSetting(key)) {
          this.log(`[MMWAVE][LINPTECH] optional setting ${key} skipped: ${err.message}`);
          continue;
        }
        this.error(`[MMWAVE][LINPTECH] settings save failed ${key}: ${err.message}`);
        throw err;
      }
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (this._isLinptechES1()) {
      return this._linptechOnSettings({ oldSettings, newSettings, changedKeys });
    }

    const remappedSettings = { ...newSettings };
    const remappedKeys = [...changedKeys];
    for (const [from, to] of Object.entries(LEGACY_SETTING_ALIASES)) {
      if (changedKeys.includes(from)) {
        remappedSettings[to] = newSettings[from];
        remappedKeys.push(to);
      }
    }

    await super.onSettings({
      oldSettings,
      newSettings: remappedSettings,
      changedKeys: [...new Set(remappedKeys)],
    });
  }
}

module.exports = MotionSensorRadarDevice;
