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

class wall_dimmer_tuya extends TuyaSpecificClusterDevice {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    if (this.mainsPowered) {
      if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery').catch(() => {});
      }
      if (this.hasCapability('alarm_battery')) {
        await this.removeCapability('alarm_battery').catch(() => {});
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
      (typeof this.getData === 'function' && this.getData()?.ieeeAddress),
      (typeof this.getData === 'function' && this.getData()?.ieeeAddr),
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

    const attempt = async () => writeCapabilityWithFallbacks(this, capability, value, {
      forceDp: true,
      parallelDiscover: false,
      skipDp: false,
      dpMap: EF00_DP_MAP[capability],
      extraSteps: [
        {
          name: 'writeBool-writeData32',
          run: async () => {
            if (capability === 'onoff') {
              const ok = await this.writeBool(EF00_DP_MAP.onoff.dp, Boolean(value));
              if (ok === false) {throw new Error('writeBool soft-fail');}
            } else if (capability === 'dim') {
              const brightness = toTuyaBrightness(value);
              if (brightness > 0 && !this.getCapabilityValue('onoff')) {
                const okOn = await this.writeBool(EF00_DP_MAP.onoff.dp, true);
                if (okOn === false) {throw new Error('writeBool soft-fail');}
                await this.safeSetCapabilityValue('onoff', true);
              }
              const okDim = await this.writeData32(EF00_DP_MAP.dim.dp, brightness);
              if (okDim === false) {throw new Error('writeData32 soft-fail');}
              if (brightness === 0) {
                const okOff = await this.writeBool(EF00_DP_MAP.onoff.dp, false);
                if (okOff === false) {throw new Error('writeBool soft-fail');}
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
      if (delays[i] > 0) {
        await new Promise((resolve) => {
          try {
            const { safeSetTimeout } = require('../../lib/utils/safe-timers');
            safeSetTimeout(this, resolve, delays[i]);
          } catch (_e) {
            // WHY(P2329): never bare setTimeout — TITAN syntax-check fails CI
            if (this.homey && typeof this.homey.setTimeout === 'function') {
              this.homey.setTimeout(resolve, delays[i]);
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
      // Re-heal + re-magic between retries (hollow IEEE after re-pair)
      await healZigbeeNodeIdentity(this, { force: true }).catch(() => {});
      if (i === 0) {
        await this._ensureDimmerMagicHandshake(this.zclNode).catch(() => {});
      }
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
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

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

  /**
   * Z2M TS0601_dimmer_1_gang_1 + #28658: DP14 power-on, DP4 light type, DP21 backlight.
   * Backlight values MUST stay strings (off/normal/inverted).
   */
  async onSettings({ newSettings, changedKeys }) {
    if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
    await healZigbeeNodeIdentity(this, { force: false }).catch(() => {});
    const keys = changedKeys || Object.keys(newSettings || {});

    if (keys.includes('backlight_mode')) {
      const mode = String(newSettings.backlight_mode || 'normal');
      const enumVal = mode === 'off' ? 0 : mode === 'inverted' ? 2 : 1;
      await this.writeEnum(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.backlightMode, enumVal);
    }

    if (keys.includes('power_on_behavior')) {
      const mode = String(newSettings.power_on_behavior || 'previous');
      const enumVal = mode === 'off' ? 0 : mode === 'on' ? 1 : 2;
      await this.writeEnum(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.powerOnBehavior, enumVal);
    }

    if (keys.includes('light_type')) {
      const mode = String(newSettings.light_type || 'led');
      const enumVal = mode === 'incandescent' ? 1 : mode === 'halogen' ? 2 : 0;
      await this.writeEnum(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.typeOfLightSource, enumVal);
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log('Wall Dimmer removed');
  }

}

module.exports = wall_dimmer_tuya;
