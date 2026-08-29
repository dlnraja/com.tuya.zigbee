'use strict';

const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('./helpers');
const { Cluster } = require('zigbee-clusters');
const { equalsCI } = require('../../lib/utils/CaseInsensitiveMatcher');
const TuyaDeviceHelper = require('../../lib/utils/TuyaDeviceHelper');

Cluster.addCluster(TuyaOnOffCluster);
Cluster.addCluster(TuyaSpecificCluster);

/** BHT-002 / generic wall thermostat (floor/boiler) — DP2 = manual/program. */
const BHT_DATA_POINTS = {
  onOff: 1,
  mode: 2,
  targetTemperature: 16,
  currentTemperature: 24,
  childlock: 40,
};

/**
 * TYBAC-006 FCU (Z2M herdsman #6174) — sacred couples only:
 *   _TZE204_mpbki2zm|TS0601, _TZE204_qujphad5|TS0601
 * DP2 = system_mode cool/heat/fan_only; DP28 = fan_mode; DP101 = manual/schedule.
 * DP36 = 3-way valve (FCU signature — never on BHT-002).
 */
const FCU_DATA_POINTS = {
  onOff: 1,
  systemMode: 2,
  targetTemperature: 16,
  currentTemperature: 24,
  fanMode: 28,
  valve: 36,
  childlock: 40,
  manualMode: 101,
};

const FCU_MFRS = ['_TZE204_mpbki2zm', '_TZE204_qujphad5'];
const FCU_SIGNAL_DPS = new Set([28, 36, 101]);
const SYSTEM_MODE_RX = { 0: 'cool', 1: 'heat', 2: 'fan_only' };
const SYSTEM_MODE_TX = { cool: 0, heat: 1, fan_only: 2 };
const FAN_MODE_RX = { 0: 'low', 1: 'medium', 2: 'high', 3: 'auto' };
const FAN_MODE_TX = { low: 0, medium: 1, high: 2, auto: 3 };

const FCU_QUERY_DPS = [1, 2, 16, 24, 28, 36, 40, 101];

/**
 * WallThermostatDevice — BHT-002 path + TYBAC-006 FCU couple branch.
 * WHY(P2300–P2303 / Adam K #532 xDMcGee):
 *  - must call super.onNodeInit (DeviceIO/EF00)
 *  - break safeSet recursion
 *  - FRAG/DP1 bool handled in TuyaEF00Manager
 *  - empty mfr at init → BHT forever: arm FCU from meta + DP28/36/101 + store
 *  - TX via DeviceIO.sendDP cascade (cluster-only writeBool can soft-fail)
 */
class WallThermostatDevice extends TuyaSpecificClusterDevice {
  get mainsPowered() { return true; }

  _resolveMfrPid() {
    const data = (typeof this.getData === 'function' ? this.getData() : null) || {};
    const meta = (typeof TuyaDeviceHelper.getDeviceMeta === 'function'
      ? TuyaDeviceHelper.getDeviceMeta(this)
      : {}) || {};
    const settings = (typeof this.getSettings === 'function' ? this.getSettings() : null) || {};

    const mfr = this.getSetting?.('zb_manufacturer_name')
      || settings.zb_manufacturer_name
      || (typeof this.getManufacturerName === 'function' ? this.getManufacturerName() : '')
      || this._cachedManufacturerName
      || meta.manufacturerName
      || data.manufacturerName
      || this.getStoreValue?.('manufacturerName')
      || this.zclNode?.manufacturerName
      || this.zigbee?.manufacturerName
      || '';

    const pid = this.getSetting?.('zb_model_id')
      || settings.zb_model_id
      || this._cachedModelId
      || meta.productId
      || meta.modelId
      || data.productId
      || data.modelId
      || this.getStoreValue?.('modelId')
      || this.getStoreValue?.('productId')
      || this.zclNode?.modelId
      || this.zigbee?.productId
      || '';

    return { mfr: String(mfr || ''), pid: String(pid || '') };
  }

  _isFcuCouple() {
    if (this.getStoreValue?.('wall_thermo_fcu') === true || this._fcuSignalSeen) {
      return true;
    }
    const { mfr, pid } = this._resolveMfrPid();
    const mfrOk = FCU_MFRS.some((m) => equalsCI(mfr, m));
    // Pairing may omit pid briefly — FCU mfrs are sacred to TS0601 only
    const pidOk = !pid || equalsCI(pid, 'TS0601');
    return mfrOk && pidOk;
  }

  /** Prevent TuyaEF00Manager generic DP1→measure_temperature for this driver. */
  _installDpMappings() {
    const map = this._fcu ? FCU_DATA_POINTS : BHT_DATA_POINTS;
    this.dpMappings = {
      [map.onOff]: { capability: 'onoff', type: 'bool' },
      [map.targetTemperature]: { capability: 'target_temperature', type: 'value', divisor: 10 },
      [map.currentTemperature]: { capability: 'measure_temperature', type: 'value', divisor: 10 },
      [map.childlock]: { capability: 'child_lock', type: 'bool' },
    };
    if (this._fcu) {
      this.dpMappings[FCU_DATA_POINTS.systemMode] = { capability: 'thermostat_mode', type: 'enum' };
      this.dpMappings[FCU_DATA_POINTS.fanMode] = { capability: 'fan_mode', type: 'enum' };
      this.dpMappings[FCU_DATA_POINTS.manualMode] = { capability: 'thermostat_programming', type: 'bool' };
      // DP36 valve is FCU signature only — handled in processResponse, not a Homey cap
    }
  }

  /**
   * WHY(P2303): Prefer DeviceIO.sendDP (manager → cluster → raw → magic) over
   * cluster-only writeBool — Homey Self-Hosted + EF00 often needs the cascade.
   */
  async _txBool(dp, value) {
    const v = !!value;
    if (this.io && typeof this.io.sendDP === 'function') {
      const ok = await this.io.sendDP(dp, v, { dpType: 'bool', type: 'bool' }).catch(() => false);
      if (ok) return true;
    }
    await this.writeBool(dp, v);
    return true;
  }

  async _txEnum(dp, value) {
    const v = Number(value);
    if (this.io && typeof this.io.sendDP === 'function') {
      const ok = await this.io.sendDP(dp, v, { dpType: 'enum', type: 'enum' }).catch(() => false);
      if (ok) return true;
    }
    await this.writeEnum(dp, v);
    return true;
  }

  async _txValue(dp, value) {
    const v = Number(value);
    if (this.io && typeof this.io.sendDP === 'function') {
      const ok = await this.io.sendDP(dp, v, { dpType: 'value', type: 'value' }).catch(() => false);
      if (ok) return true;
    }
    await this.writeData32(dp, v);
    return true;
  }

  async _armFcu(reason = 'signal') {
    if (this._fcu) return;
    this._fcu = true;
    this._fcuSignalSeen = true;
    try { await this.setStoreValue?.('wall_thermo_fcu', true); } catch (_) { /* ignore */ }
    this._installDpMappings();
    for (const cap of ['thermostat_mode', 'fan_mode']) {
      if (!this.hasCapability(cap)) await this.addCapability(cap).catch(() => {});
    }
    this._registerFcuListeners();
    this.log(`[WALL-THERMO] P2303 FCU armed (${reason})`);
    this._queryFcuState().catch(() => {});
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.printNode?.();

    // Persist / restore FCU arm from prior session (Adam re-pair churn)
    if (this.getStoreValue?.('wall_thermo_fcu') === true) {
      this._fcuSignalSeen = true;
    }

    this._fcu = this._isFcuCouple();
    this._installDpMappings();
    const id = this._resolveMfrPid();
    this.log(this._fcu
      ? `[WALL-THERMO] FCU path (${id.mfr}|${id.pid})`
      : `[WALL-THERMO] BHT path (${id.mfr}|${id.pid}) — will arm on DP28/36/101`);

    for (const cap of ['thermostat_programming', 'child_lock']) {
      if (!this.hasCapability(cap)) await this.addCapability(cap).catch(() => {});
    }
    if (this._fcu) {
      for (const cap of ['thermostat_mode', 'fan_mode']) {
        if (!this.hasCapability(cap)) await this.addCapability(cap).catch(() => {});
      }
    }

    this._registerSharedListeners();
    if (this._fcu) this._registerFcuListeners();

    this._attachTuyaRx(zclNode);

    // Soft-read Basic cluster identity if settings empty (Homey SHS often blanks zb_*)
    this._refreshIdentityFromBasic(zclNode).catch(() => {});

    if (this._fcu) {
      this._queryFcuState().catch((err) => {
        this.log('[WALL-THERMO] FCU DP query deferred:', err?.message || err);
      });
    }
  }

  async _refreshIdentityFromBasic(zclNode) {
    try {
      const basic = zclNode?.endpoints?.[1]?.clusters?.basic
        || zclNode?.endpoints?.[1]?.clusters?.genBasic;
      if (!basic || typeof basic.readAttributes !== 'function') return;
      const attrs = await basic.readAttributes(['manufacturerName', 'modelId']).catch(() => null);
      if (!attrs) return;
      if (attrs.manufacturerName) {
        this._cachedManufacturerName = String(attrs.manufacturerName);
        try { await this.setStoreValue?.('manufacturerName', this._cachedManufacturerName); } catch (_) { /* ignore */ }
      }
      if (attrs.modelId) {
        this._cachedModelId = String(attrs.modelId);
        try { await this.setStoreValue?.('modelId', this._cachedModelId); } catch (_) { /* ignore */ }
      }
      if (!this._fcu && this._isFcuCouple()) {
        await this._armFcu('basic-cluster');
      }
    } catch (e) {
      this.log('[WALL-THERMO] basic identity read skipped:', e?.message || e);
    }
  }

  _registerSharedListeners() {
    if (this._sharedListenersReady) return;
    this._sharedListenersReady = true;

    this.registerCapabilityListener('onoff', async (onOff) => {
      if (this._fcuSyncing) return;
      this._fcuSyncing = true;
      try {
        // Always force manual before power TX — schedule ignores DP1 on TYBAC
        await this._txBool(FCU_DATA_POINTS.manualMode, true).catch(() => {});
        await this._txBool(BHT_DATA_POINTS.onOff, !!onOff);
        if (this.hasCapability('thermostat_mode')) {
          const mode = onOff
            ? (this._lastFcuSystemMode || 'cool')
            : 'off';
          await this.safeSetCapabilityValue('thermostat_mode', mode);
        }
        this.log('[WALL-THERMO] onoff TX', !!onOff, 'ok');
      } finally {
        this._fcuSyncing = false;
      }
    });

    this.registerCapabilityListener('thermostat_programming', async (mode) => {
      if (this._fcu || this._fcuSignalSeen) {
        const manualOn = String(mode) === '0';
        await this._txBool(FCU_DATA_POINTS.manualMode, manualOn);
      } else {
        await this._txEnum(BHT_DATA_POINTS.mode, Number(mode));
      }
      this.log('[WALL-THERMO] programming TX', mode);
    });

    this.registerCapabilityListener('target_temperature', async (targetTemperature) => {
      const rawValue = Math.round(Number(targetTemperature) * 10);
      // Force manual so schedule cannot swallow setpoint (Z2M DP101)
      await this._txBool(FCU_DATA_POINTS.manualMode, true).catch(() => {});
      await this._txValue(BHT_DATA_POINTS.targetTemperature, rawValue);
      this.log('[WALL-THERMO] target_temperature TX', targetTemperature, 'raw', rawValue);
    });

    this.registerCapabilityListener('child_lock', async (childlock) => {
      await this._txBool(BHT_DATA_POINTS.childlock, !!childlock);
      this.log('[WALL-THERMO] child_lock TX', childlock);
    });
  }

  _registerFcuListeners() {
    if (this._fcuListenersReady) return;
    this._fcuListenersReady = true;

    this.registerCapabilityListener('thermostat_mode', async (mode) => {
      if (this._fcuSyncing) return;
      this._fcuSyncing = true;
      try {
        await this._txBool(FCU_DATA_POINTS.manualMode, true).catch(() => {});
        // Z2M: system_mode "off" → DP1 false; cool/heat/fan_only → DP1 true + DP2
        if (mode === 'off') {
          await this._txBool(FCU_DATA_POINTS.onOff, false);
          await this.safeSetCapabilityValue('onoff', false);
          this.log('[WALL-THERMO] FCU system_mode TX off');
          return;
        }
        const enumVal = SYSTEM_MODE_TX[mode];
        if (enumVal === undefined) return;
        this._lastFcuSystemMode = mode;
        await this._txBool(FCU_DATA_POINTS.onOff, true);
        await this._txEnum(FCU_DATA_POINTS.systemMode, enumVal);
        await this.safeSetCapabilityValue('onoff', true);
        this.log('[WALL-THERMO] FCU system_mode TX', mode, enumVal);
      } finally {
        this._fcuSyncing = false;
      }
    });

    this.registerCapabilityListener('fan_mode', async (mode) => {
      const enumVal = FAN_MODE_TX[mode];
      if (enumVal === undefined) return;
      await this._txEnum(FCU_DATA_POINTS.fanMode, enumVal);
      this.log('[WALL-THERMO] FCU fan_mode TX', mode, enumVal);
    });
  }

  _attachTuyaRx(zclNode) {
    try {
      const cluster = (typeof this._resolveTuyaCluster === 'function'
        ? this._resolveTuyaCluster(zclNode)
        : null)
        || zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.[61184]
        || null;
      if (!cluster || typeof cluster.on !== 'function') {
        this.error('[WALL-THERMO] No Tuya EF00 cluster for RX — DeviceIO compensation should retry');
        return;
      }
      const onFrame = (value) => {
        this.processResponse(value).catch((e) => this.log('[WALL-THERMO] RX error', e?.message || e));
      };
      cluster.on('reporting', onFrame);
      cluster.on('response', onFrame);
      this.log('[WALL-THERMO] EF00 reporting/response listeners armed');
    } catch (err) {
      this.error('[WALL-THERMO] attach RX failed:', err?.message || err);
    }
  }

  async _queryFcuState() {
    const dps = FCU_QUERY_DPS;
    if (this.io && typeof this.io.requestDP === 'function') {
      for (const dp of dps) {
        await this.io.requestDP(dp, { silent: true }).catch(() => false);
      }
      this.log('[WALL-THERMO] FCU queried via DeviceIO.requestDP', dps.join(','));
      return;
    }
    if (this.io && typeof this.io.queryAllDPs === 'function') {
      await this.io.queryAllDPs({ silent: true }).catch(() => false);
      this.log('[WALL-THERMO] FCU queried via DeviceIO.queryAllDPs');
      return;
    }
    const cluster = typeof this._resolveTuyaCluster === 'function'
      ? this._resolveTuyaCluster(this.zclNode)
      : null;
    if (cluster && typeof cluster.dataQuery === 'function') {
      await cluster.dataQuery({}).catch(() => {});
      this.log('[WALL-THERMO] FCU queried via cluster.dataQuery');
    }
  }

  async processResponse(data) {
    if (!data || data.dp == null) return;
    const dp = Number(data.dp);
    const parsedValue = getDataValue(data);

    // WHY(P2303 / Adam diag f84180b7): DP36 valve proved FCU while path was still BHT
    if (!this._fcu && FCU_SIGNAL_DPS.has(dp)) {
      await this._armFcu(`dp${dp}`);
    }

    if (this._fcu) {
      await this._processFcuResponse(dp, parsedValue);
      return;
    }

    switch (dp) {
      case BHT_DATA_POINTS.onOff:
        await this.safeSetCapabilityValue('onoff', !!parsedValue).catch(() => {});
        break;
      case BHT_DATA_POINTS.mode:
        await this.safeSetCapabilityValue('thermostat_programming', parsedValue === 0 ? '0' : '1').catch(() => {});
        break;
      case BHT_DATA_POINTS.currentTemperature:
        await this.safeSetCapabilityValue('measure_temperature', Number(parsedValue) / 10).catch(() => {});
        break;
      case BHT_DATA_POINTS.targetTemperature:
        await this.safeSetCapabilityValue('target_temperature', Number(parsedValue) / 10).catch(() => {});
        break;
      case BHT_DATA_POINTS.childlock:
        await this.safeSetCapabilityValue('child_lock', !!parsedValue).catch(() => {});
        break;
      default:
        this.log('[WALL-THERMO] BHT DP', dp, parsedValue);
    }
  }

  async _processFcuResponse(dp, parsedValue) {
    try {
      switch (dp) {
        case FCU_DATA_POINTS.onOff: {
          if (this._fcuSyncing) break;
          this._fcuSyncing = true;
          try {
            await this.safeSetCapabilityValue('onoff', !!parsedValue);
            if (this.hasCapability('thermostat_mode')) {
              const mode = parsedValue
                ? (this._lastFcuSystemMode || 'cool')
                : 'off';
              await this.safeSetCapabilityValue('thermostat_mode', mode);
            }
          } finally {
            this._fcuSyncing = false;
          }
          break;
        }
        case FCU_DATA_POINTS.systemMode: {
          const mode = SYSTEM_MODE_RX[parsedValue];
          if (mode) {
            this._lastFcuSystemMode = mode;
            if (this.hasCapability('thermostat_mode') && !this._fcuSyncing) {
              await this.safeSetCapabilityValue('thermostat_mode', mode);
            }
          }
          break;
        }
        case FCU_DATA_POINTS.fanMode: {
          const fan = FAN_MODE_RX[parsedValue];
          if (fan && this.hasCapability('fan_mode')) {
            await this.safeSetCapabilityValue('fan_mode', fan);
          }
          break;
        }
        case FCU_DATA_POINTS.manualMode: {
          await this.safeSetCapabilityValue('thermostat_programming', parsedValue ? '0' : '1');
          break;
        }
        case FCU_DATA_POINTS.valve:
          this.log('[WALL-THERMO] FCU valve', parsedValue === 0 ? 'OPEN' : 'CLOSE');
          break;
        case FCU_DATA_POINTS.currentTemperature:
          await this.safeSetCapabilityValue('measure_temperature', Number(parsedValue) / 10);
          break;
        case FCU_DATA_POINTS.targetTemperature:
          await this.safeSetCapabilityValue('target_temperature', Number(parsedValue) / 10);
          break;
        case FCU_DATA_POINTS.childlock:
          await this.safeSetCapabilityValue('child_lock', !!parsedValue);
          break;
        default:
          this.log('[WALL-THERMO] FCU DP', dp, parsedValue);
      }
    } catch (e) {
      this.log('[WALL-THERMO] FCU DP', dp, 'set failed', e?.message || e);
    }
  }

  async _onZigbeeIdentityResolved(updates = {}) {
    if (updates.manufacturerName) this._cachedManufacturerName = String(updates.manufacturerName);
    if (updates.modelId || updates.productId) {
      this._cachedModelId = String(updates.modelId || updates.productId);
    }
    if (!this._fcu && this._isFcuCouple()) {
      await this._armFcu('identity-resolved');
    }
  }
}

module.exports = WallThermostatDevice;
