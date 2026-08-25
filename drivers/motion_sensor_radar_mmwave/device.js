'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { smartParse } = require('../../lib/managers/SmartDivisorManager');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');
const LowLevelBridge = require('../../lib/LowLevelBridge');
const {
  isLinptechES1,
  planSettingWrite,
  isLinptechSettingKey,
  ATTR_RX_MAP,
  CLUSTER_MANU_TUYA2,
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
 * Motion Sensor Radar mmWave Device - v8.0.0 MODERNIZED
 * P2258: Linptech ES1ZZ / Moes ZSS-LP-HP02-MS uses manuSpecificTuya2 attrs, not EF00 DP9.
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
        this.log('[MMWAVE][LINPTECH] ES1ZZ profile — manuSpecificTuya2 settings path');
        this._setupLinptechClusterListener(zclNode);
      }

      await this._configureIlluminanceReporting();

      this.log('[MMWAVE] ✅ Ready');
    }, 'onNodeInit');
  }

  _setupLinptechClusterListener(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    if (!ep?.clusters) { return; }
    const cluster = ep.clusters[CLUSTER_MANU_TUYA2]
      || ep.clusters.tuyaE001
      || ep.clusters[57345];
    if (!cluster) {
      this.log('[MMWAVE][LINPTECH] Cluster 0xE001 not on EP1 — settings TX may still work');
      return;
    }
    const handler = (report) => {
      try {
        this._handleLinptechAttrReport(report);
      } catch (err) {
        this.log('[MMWAVE][LINPTECH] attr report error:', err.message);
      }
    };
    if (typeof cluster.on === 'function') {
      cluster.on('attributeReport', handler);
      cluster.on('reporting', handler);
    }
  }

  _handleLinptechAttrReport(report) {
    const payload = report?.attributes || report?.data || report || {};
    for (const [attrKey, raw] of Object.entries(payload)) {
      const attrId = Number(attrKey);
      const rxKey = ATTR_RX_MAP[attrId];
      if (!rxKey) { continue; }
      const value = typeof raw === 'object' && raw !== null && 'value' in raw ? raw.value : raw;
      if (rxKey === 'target_distance' || rxKey === 'motion_detection_distance') {
        const distanceCm = Number(value);
        if (!Number.isNaN(distanceCm)) {
          const distanceM = distanceCm / 100;
          this._inference.updateDistance(distanceM);
          this.safeSetCapabilityValue('measure_luminance.distance', distanceM).catch(() => {});
        }
      }
      this.log(`[MMWAVE][LINPTECH] RX ${rxKey}=${value}`);
    }
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
      case 104: {
        const lux = value;
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
      const ok = await this._llBridge.writeZCLAttribute(plan.cluster, plan.attr, plan.value, 1);
      if (!ok) {
        throw new Error(`ZCL 0x${plan.cluster.toString(16)} attr ${plan.attr} write failed`);
      }
      this.log(`[MMWAVE][LINPTECH] ${key} → attr ${plan.attr}=${plan.value}`);
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
