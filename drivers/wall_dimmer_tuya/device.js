'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');
const { toTuyaBrightness, fromTuyaBrightness } = require('../../lib/tuya/TuyaBrightnessScale');
const { writeCapabilityWithFallbacks } = require('../../lib/zigbee/CapabilityCommandRouter');
const { healZigbeeNodeIdentity } = require('../../lib/io/healZigbeeNodeIdentity');

Cluster.addCluster(TuyaSpecificCluster);

/** EF00-only BSEED/PresentSky dimmers — no genOnOff / genLevelCtrl on interview. */
const EF00_DP_MAP = {
  onoff: {
    dp: V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff,
    type: 'bool',
    encode: (v) => Boolean(v),
  },
  dim: {
    dp: V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness,
    type: 'value',
    encode: (v) => toTuyaBrightness(v),
  },
};

// P3064: Tuya MG-DIM02Z dimmer module with power monitoring (_TZE284_da26abzz). Its MCU uses
// DP141 state / DP142 brightness 0-1000 and DP21 current mA, DP22 power 0.1 W, DP23 voltage 0.1 V
// (source: zigbee-herdsman-converters tuya.ts model MG-DIM02Z; facts only, own code).
// The V1 map above (DP1/DP2, DP21 = backlight) would misread it. Metering capabilities are added
// only after the first real report (never at pairing).
const MG_DIM02Z = new Set(['_tze284_da26abzz']);
const MG_DIM02Z_DP_MAP = {
  onoff: { dp: 141, type: 'bool', encode: (v) => Boolean(v) },
  dim: { dp: 142, type: 'value', encode: (v) => toTuyaBrightness(v) },
};
const MG_DIM02Z_METER = { 21: ['measure_current', 1000], 22: ['measure_power', 10], 23: ['measure_voltage', 10] };
function isMgDim02z(mfr) { return MG_DIM02Z.has(String(mfr || '').toLowerCase()); }

// P3066: Tuya dimmer knob with two lights (_TZE200/_TZE284_tgeqdjgk, Z2M tuya.ts TS0601_knob_dimmer_switch;
// facts only, own code). DP102 state, DP103 brightness 0-1000, DP107 colour temperature 0-1000 (154-370 mired,
// 0 = cold), DP111/112 button actions. The V1 DP1/DP2 map never matched it. light_temperature is added only
// after the first DP107 report; nothing is written at pairing.
const KNOB = new Set(['_tze200_tgeqdjgk', '_tze284_tgeqdjgk']);
const KNOB_DP_MAP = {
  onoff: { dp: 102, type: 'bool', encode: (v) => Boolean(v) },
  dim: { dp: 103, type: 'value', encode: (v) => toTuyaBrightness(v) },
};
const KNOB_DPS = [102, 103, 105, 106, 107, 111, 112, 121, 122, 131, 132, 141];
function isKnob(mfr) { return KNOB.has(String(mfr || '').toLowerCase()); }

class wall_dimmer_tuya extends TuyaSpecificClusterDevice {

  _isMgDim02z() {
    return isMgDim02z(this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName);
  }

  _isKnob() {
    return isKnob(this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName);
  }

  /** Per-couple datapoint map for TX (default = V1 single-gang dimmer). */
  _dimmerDpMap() {
    if (this._isMgDim02z()) { return MG_DIM02Z_DP_MAP; }
    return this._isKnob() ? KNOB_DP_MAP : EF00_DP_MAP;
  }

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  /**
   * WHY(P2333 / PresentSky diag 60959c24): TuyaEF00Manager generic map treated
   * DP2 as humidity + DynCap added measure_humidity — kill climate invent.
   */
  get dpMappings() {
    return {
      [V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff]: { capability: 'onoff', type: 'bool' },
      [V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness]: { capability: 'dim', type: 'value' },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this._dynCapBlockDps = new Set([
      V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff,
      V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness,
    ]);
    // P3064: MG-DIM02Z datapoints are owned by _processMgDim02z, never by dynamic discovery.
    if (this._isMgDim02z()) { for (const dp of [141, 142, 143, 144, 146, 21, 22, 23]) { this._dynCapBlockDps.add(dp); } }
    this._initKnob();
    if (typeof this.dynamicCapabilityManager?.purgeDriverOwnedDiscoveries === 'function') {
      await this.dynamicCapabilityManager.purgeDriverOwnedDiscoveries().catch(() => {});
    }

    if (this.mainsPowered) {
      if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery').catch(() => {});
      }
      if (this.hasCapability('alarm_battery')) {
        await this.removeCapability('alarm_battery').catch(() => {});
      }
    }
    // WHY(P2333): strip phantom climate caps invented from DP2 brightness
    for (const phantom of ['measure_humidity', 'measure_temperature']) {
      if (this.hasCapability(phantom)) {
        await this.removeCapability(phantom).catch(() => {});
      }
    }

    // P2314/P2322: heal IEEE + magic + EF00 before listeners (PresentSky #2206)
    await healZigbeeNodeIdentity(this, { force: true }).catch(() => {});
    await this._persistIeeeFromNode().catch(() => {});
    await this._ensureDimmerMagicHandshake(zclNode).catch(() => {});
    if (typeof this._ensureTuyaIo === 'function') {
      await this._ensureTuyaIo(zclNode, { queryAll: true, mcu: true, pollFallback: false, forceMagic: true });
    }
    await this._ensureEf00Manager(zclNode);

    await this._readDeviceAttributes(zclNode);
    await this._setupGang(zclNode);

    if (!this.hasListenersAttached) {
      const tuya = (typeof this._resolveTuyaCluster === 'function'
        ? this._resolveTuyaCluster(zclNode)
        : null)
        || zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.[0xEF00];

      if (tuya?.on) {
        tuya.on('reporting', async (value) => {
          try {
            this.log('Received reporting:', value);
            await this.processDatapoint(value);
          } catch (err) {
            this.error('Error processing datapoint:', err);
          }
        });

        tuya.on('response', async (value) => {
          try {
            this.log('Received response:', value);
            await this.processDatapoint(value);
          } catch (err) {
            this.error('Error processing datapoint:', err);
          }
        });
        this.hasListenersAttached = true;
      } else {
        this.log('[WALL-DIMMER] Tuya cluster missing after compensation — passive I/O armed');
        this.io?._enablePassiveTuyaListen?.({});
      }
    }
  }

  /**
   * Soft-attach TuyaEF00Manager when UniversalLayerBootstrap missed interview.
   * WHY: PresentSky interview has 0xEF00; hollow node still needs manager for L2 TX.
   */
  async _ensureEf00Manager(zclNode) {
    try {
      if (this.tuyaEF00Manager) {
        if (typeof this.tuyaEF00Manager.initialize === 'function' && zclNode) {
          await this.tuyaEF00Manager.initialize(zclNode).catch(() => {});
        }
        return;
      }
      const TuyaEF00Manager = require('../../lib/tuya/TuyaEF00Manager');
      this.tuyaEF00Manager = new TuyaEF00Manager(this);
      if (zclNode && typeof this.tuyaEF00Manager.initialize === 'function') {
        await this.tuyaEF00Manager.initialize(zclNode).catch(() => {});
      }
      this.log('[WALL-DIMMER] TuyaEF00Manager attached');
    } catch (err) {
      this.log(`[WALL-DIMMER] EF00 manager skip: ${err?.message || err}`);
    }
  }

  /**
   * P2322: stash IEEE into store so later hollow-zclNode sessions can heal.
   * Forum #2206 interview lists endpoints.ieeeAddress even when zclNode is thin.
   */
  async _persistIeeeFromNode() {
    const { _looksLikeIeee } = require('../../lib/io/healZigbeeNodeIdentity');
    const candidates = [
      this.zclNode?.ieeeAddr,
      this.zclNode?.ieeeAddress,
      this.node?.ieeeAddr,
      this.node?.ieeeAddress,
      typeof this.getData === 'function' && this.getData()?.ieeeAddress,
      typeof this.getData === 'function' && this.getData()?.ieeeAddr,
    ].filter(Boolean);
    for (const ie of candidates) {
      if (!_looksLikeIeee(ie)) {continue;}
      const s = String(ie);
      try {
        await this.setStoreValue?.('zb_ieee_address', s);
      } catch (_e) { /* noop */ }
      try {
        await healZigbeeNodeIdentity(this, { force: true });
      } catch (_e) { /* noop */ }
      this.log(`[WALL-DIMMER] IEEE persisted for heal: ${s}`);
      return;
    }
  }

  /**
   * Z2M configureMagicPacket is mandatory for TS0601_dimmer_1_gang_1 (m1cvyneb).
   * Without it MCU ignores EF00 datapoint writes after re-pair.
   */
  async _ensureDimmerMagicHandshake(zclNode) {
    try {
      const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');
      const node = zclNode || this.zclNode;
      if (!node?.endpoints?.[1] && !node?.endpoints?.[2]) {return;}
      // Clear stale flag so re-pair always re-handshakes (HomeSuite / Z2M pattern)
      try { await this.setStoreValue?.('tuya_magic_packet_sent', false); } catch (_e) { /* noop */ }
      try { await this.unsetStoreValue?.('tuya_magic_packet_sent'); } catch (_e) { /* noop */ }
      this._tuyaMagicPacketSent = false;
      const epId = node.endpoints[1] ? 1 : 2;
      await sendTuyaMagicPacket(this, node, epId, { force: true });
      this.log('[WALL-DIMMER] Tuya magic handshake armed');
    } catch (err) {
      this.log(`[WALL-DIMMER] magic handshake soft-fail: ${err?.message || err}`);
    }
  }

  async _readDeviceAttributes(zclNode) {
    try {
      await zclNode.endpoints[1].clusters.basic.readAttributes([
        'manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus',
      ]);
    } catch (err) {
      this.error('Error when reading device attributes:', err);
    }
  }

  /**
   * TX via CapabilityCommandRouter L1→Lx (forceDp — interview has no onOff/levelControl).
   * P2322: HomeSuite-style retry (3× / 350ms) + throw on failure so Homey UI
   * does not fake success when the mesh never moved.
   */
  async _txCapability(capability, value) {
    if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
    await healZigbeeNodeIdentity(this, { force: false }).catch(() => {});
    if (typeof this._ensureTuyaIo === 'function') {
      await this._ensureTuyaIo(this.zclNode, { light: true });
    }
    // WHY(P2557 / PresentSky #2206): MCU ignores EF00 until magic — arm once per session + after fail
    if (!this._dimmerMagicArmedThisSession) {
      await this._ensureDimmerMagicHandshake(this.zclNode).catch(() => {});
      this._dimmerMagicArmedThisSession = true;
    }

    const map = this._dimmerDpMap();
    const attempt = async () => writeCapabilityWithFallbacks(this, capability, value, {
      forceDp: true,
      parallelDiscover: false,
      skipDp: false,
      dpMap: map[capability],
      extraSteps: [
        {
          name: 'writeBool-writeData32',
          run: async () => {
            if (capability === 'onoff') {
              const ok = await this.writeBool(map.onoff.dp, Boolean(value));
              // WHY(P2336): !ok covers false + undefined (PresentSky dead UI)
              if (!ok) {throw new Error('writeBool soft-fail');}
            } else if (capability === 'dim') {
              const brightness = toTuyaBrightness(value);
              if (brightness > 0 && !this.getCapabilityValue('onoff')) {
                const okOn = await this.writeBool(map.onoff.dp, true);
                if (!okOn) {throw new Error('writeBool soft-fail');}
                await this.safeSetCapabilityValue('onoff', true);
              }
              const okDim = await this.writeData32(map.dim.dp, brightness);
              if (!okDim) {throw new Error('writeData32 soft-fail');}
              if (brightness === 0) {
                const okOff = await this.writeBool(map.onoff.dp, false);
                if (!okOff) {throw new Error('writeBool soft-fail');}
                await this.safeSetCapabilityValue('onoff', false);
              }
            }
            return 'writeBool-writeData32';
          },
        },
      ],
    });

    let r = { ok: false };
    const delays = [0, 350, 350];
    for (let i = 0; i < delays.length; i++) {
      if (this._destroyed) { return r; }
      if (delays[i] > 0) {
        await new Promise((resolve) => {
          if (this._destroyed) { resolve(); return; }
          try {
            const { safeSetTimeout } = require('../../lib/utils/safe-timers');
            safeSetTimeout(this, () => {
              if (this._destroyed) { resolve(); return; }
              resolve();
            }, delays[i]);
          } catch (_e) {
            // WHY(P2329): never bare setTimeout — TITAN syntax-check fails CI
            if (this.homey && typeof this.homey.setTimeout === 'function') {
              this.homey.setTimeout(() => {
                if (this._destroyed) { resolve(); return; }
                resolve();
              }, delays[i]);
            } else {
              resolve();
            }
          }
        });
      }
      try {
        r = await attempt();
      } catch (err) {
        r = { ok: false, error: err };
      }
      if (r?.ok) {break;}
      // Re-heal + re-magic between retries (hollow IEEE after re-pair / PresentSky dead UI)
      await healZigbeeNodeIdentity(this, { force: true }).catch(() => {});
      this._dimmerMagicArmedThisSession = false;
      await this._ensureDimmerMagicHandshake(this.zclNode).catch(() => {});
      this._dimmerMagicArmedThisSession = true;
    }

    if (!r.ok) {
      const err = r.error || new Error(`[WALL-DIMMER] ${capability} TX unreachable`);
      this.error(`[WALL-DIMMER] ${capability} TX failed after retries:`, err?.message || err);
      throw err;
    }
    this.log(`[WALL-DIMMER] ${capability} via ${r.via}`);
    return r;
  }

  async _setupGang(zclNode) {
    this.registerCapabilityListener('onoff', async (value) => {
      this.log('onoff:', value);
      await this._txCapability('onoff', value);
    });

    this.registerCapabilityListener('dim', async (value) => {
      const brightness = toTuyaBrightness(value);
      this.log('brightness:', brightness);
      await this._txCapability('dim', value);
    });
  }

  async processDatapoint(data) {
    if (this._destroyed) { return; }
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    if (this._processLayoutDp(dp, parsedValue)) { return; }

    switch (dp) {
      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff:
        this.log('Received on/off:', parsedValue);
        await this.safeSetCapabilityValue('onoff', parsedValue === true || parsedValue === 1)
          .catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        break;

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness:
        this.log('Received dim level:', parsedValue);
        await this.safeSetCapabilityValue('dim', fromTuyaBrightness(parsedValue))
          .catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        break;

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.countdown:
        this.log('Countdown DP6:', parsedValue);
        break;

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.powerOnBehavior: {
        const map = { 0: 'off', 1: 'on', 2: 'previous' };
        const key = map[Number(parsedValue)];
        if (key && typeof this.setSettings === 'function') {
          await this.setSettings({ power_on_behavior: key }).catch(() => {});
        }
        break;
      }

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.backlightMode: {
        const map = { 0: 'off', 1: 'normal', 2: 'inverted' };
        const key = map[Number(parsedValue)];
        if (key && typeof this.setSettings === 'function') {
          await this.setSettings({ backlight_mode: key }).catch(() => {});
        }
        break;
      }

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.typeOfLightSource: {
        const map = { 0: 'led', 1: 'incandescent', 2: 'halogen' };
        const key = map[Number(parsedValue)];
        if (key && typeof this.setSettings === 'function') {
          await this.setSettings({ light_type: key }).catch(() => {});
        }
        break;
      }

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.minimumBrightness:
        this.log('Informational DP (min brightness):', parsedValue);
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  /** P3064: MG-DIM02Z datapoints; returns true when the DP belongs to that layout. */
  _processMgDim02z(dp, v) {
    const err = this._boundError || ((e) => { try { this.error(e); } catch (_) { /* noop */ } });
    if (dp === 141) { this.safeSetCapabilityValue('onoff', v === true || v === 1).catch(err); return true; }
    if (dp === 142) { this.safeSetCapabilityValue('dim', fromTuyaBrightness(v)).catch(err); return true; }
    const m = MG_DIM02Z_METER[dp];
    if (m) {
      const n = Number(v) / m[1];
      if (Number.isFinite(n) && n >= 0) {
        require('../../lib/helpers/LateCapability').ensureAndSet(this, m[0], Math.round(n * 1000) / 1000).catch(() => {});
      }
      return true;
    }
    if (dp === 143 || dp === 144 || dp === 146) { this._mirrorLayoutSetting(dp, v); return true; }
    return false;
  }

  /** Couple-specific DP layouts (MG-DIM02Z, knob); true when the DP was consumed. */
  _processLayoutDp(dp, v) {
    if (this._isMgDim02z()) { return this._processMgDim02z(dp, v); }
    return this._isKnob() && this._processKnob(dp, v);
  }

  _initKnob() {
    if (!this._isKnob()) { return; }
    for (const dp of KNOB_DPS) { this._dynCapBlockDps.add(dp); }
    if (this.hasCapability('light_temperature')) { this._registerKnobTemperature(); }
  }

  /** P3066: knob dimmer datapoints; returns true when the DP belongs to that layout. */
  _processKnob(dp, v) {
    const err = this._boundError || ((e) => { try { this.error(e); } catch (_) { /* noop */ } });
    if (dp === 102) { this.safeSetCapabilityValue('onoff', v === true || v === 1).catch(err); return true; }
    if (dp === 103) { this.safeSetCapabilityValue('dim', fromTuyaBrightness(v)).catch(err); return true; }
    if (dp === 107) {
      const t = Number(v);
      if (Number.isFinite(t) && t >= 0 && t <= 1000) {
        require('../../lib/helpers/LateCapability').ensureAndSet(this, 'light_temperature', t / 1000)
          .then((ok) => { if (ok) { this._registerKnobTemperature(); } }).catch(() => {});
      }
      return true;
    }
    if (dp === 106 || dp === 141) { this._mirrorLayoutSetting(dp, v); return true; }
    if (KNOB_DPS.includes(dp)) { this.log('[KNOB] informational DP', dp, v); return true; }
    return false;
  }

  _registerKnobTemperature() {
    if (this._knobTempListener) { return; }
    this._knobTempListener = true;
    try {
      this.registerCapabilityListener('light_temperature', async (value) => {
        const raw = Math.min(1000, Math.max(0, Math.round(Number(value) * 1000)));
        const ok = await this.writeData32(107, raw);
        if (!ok) { throw new Error('dp_107_not_sent'); }
      });
    } catch (_e) { this._knobTempListener = false; }
  }

  /** P3067: settings page follows what MG-DIM02Z / knob report (DP143/144/146, DP106/141); never blocks RX. */
  _mirrorLayoutSetting(dp, v) {
    const n = Number(v);
    if (!Number.isFinite(n)) { return; }
    const POWER = ['off', 'on', 'previous'];
    const map = {
      143: ['mg_min_brightness', n >= 0 && n <= 1000 ? n : null],
      144: ['mg_max_brightness', n >= 0 && n <= 1000 ? n : null],
      146: ['power_on_behavior', POWER[n] || null],
      106: ['power_on_behavior', POWER[n] || null],
      141: ['knob_mode', ['knob', 'scene'][n] || null],
    }[dp];
    if (!map || map[1] === null || this.getSetting?.(map[0]) === map[1]) { return; }
    Promise.resolve().then(() => this.setSettings({ [map[0]]: map[1] })).catch(() => {});
  }

  /** P3067: per-layout DP for a shared setting (MG-DIM02Z DP146, knob DP106, V1 DP14). */
  _powerOnDp() {
    if (this._isMgDim02z()) { return 146; }
    return this._isKnob() ? 106 : V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.powerOnBehavior;
  }

  /** P3067: MG-DIM02Z min/max brightness (DP143/144 raw 0-1000) and knob mode (DP141), written only on change. */
  async _applyLayoutSettings(newSettings, keys) {
    if (this._isMgDim02z()) {
      for (const [key, dp] of [['mg_min_brightness', 143], ['mg_max_brightness', 144]]) {
        if (keys.includes(key)) { await this.writeData32(dp, Math.max(0, Math.min(1000, Math.round(Number(newSettings[key]) || 0)))); }
      }
    }
    if (this._isKnob() && keys.includes('knob_mode')) {
      await this.writeEnum(141, newSettings.knob_mode === 'scene' ? 1 : 0);
    }
  }

  /**
   * Z2M TS0601_dimmer_1_gang_1 + #28658: DP14 power-on, DP4 light type, DP21 backlight.
   * Backlight values MUST stay strings (off/normal/inverted).
   */
  async onSettings({ newSettings, changedKeys }) {
    if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
    await healZigbeeNodeIdentity(this, { force: false }).catch(() => {});
    const ns = newSettings || {};
    const keys = changedKeys || Object.keys(ns);
    if (keys.includes('power_on_behavior')) {
      const mode = String(ns.power_on_behavior || 'previous');
      await this.writeEnum(this._powerOnDp(), { off: 0, on: 1 }[mode] ?? 2);
    }
    await this._applyLayoutSettings(ns, keys);
    // WHY(P3067): backlight / light type are V1 DPs (21 / 4); the MG-DIM02Z and knob layouts use other DPs there.
    if (!this._isMgDim02z() && !this._isKnob()) { await this._applyV1Settings(ns, keys); }
  }

  async _applyV1Settings(ns, keys) {
    if (keys.includes('backlight_mode')) {
      const mode = String(ns.backlight_mode || 'normal');
      await this.writeEnum(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.backlightMode, { off: 0, inverted: 2 }[mode] ?? 1);
    }
    if (keys.includes('light_type')) {
      const mode = String(ns.light_type || 'led');
      await this.writeEnum(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.typeOfLightSource, { incandescent: 1, halogen: 2 }[mode] ?? 0);
    }
  }

  onDeleted() {
    if (this._destroyed) { return; }
    this._destroyed = true;
    super.onDeleted();
    this.log('Wall Dimmer removed');
  }

}

module.exports = wall_dimmer_tuya;
module.exports.isMgDim02z = isMgDim02z;
module.exports.isKnob = isKnob;
module.exports.KNOB_DP_MAP = KNOB_DP_MAP;
module.exports.MG_DIM02Z_DP_MAP = MG_DIM02Z_DP_MAP;
