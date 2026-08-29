'use strict';

const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('./helpers');
const { Cluster } = require('zigbee-clusters');
const { equalsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

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
 */
const FCU_DATA_POINTS = {
  onOff: 1,
  systemMode: 2,
  targetTemperature: 16,
  currentTemperature: 24,
  fanMode: 28,
  childlock: 40,
  manualMode: 101,
};

const FCU_MFRS = ['_TZE204_mpbki2zm', '_TZE204_qujphad5'];
const SYSTEM_MODE_RX = { 0: 'cool', 1: 'heat', 2: 'fan_only' };
const SYSTEM_MODE_TX = { cool: 0, heat: 1, fan_only: 2 };
const FAN_MODE_RX = { 0: 'low', 1: 'medium', 2: 'high', 3: 'auto' };
const FAN_MODE_TX = { low: 0, medium: 1, high: 2, auto: 3 };

const FCU_QUERY_DPS = [1, 2, 16, 24, 28, 40, 101];

/**
 * WallThermostatDevice — BHT-002 path + TYBAC-006 FCU couple branch.
 * WHY(P2300 / #532): must call super.onNodeInit so DeviceIO + EF00 cluster
 * attach/query run — otherwise caps show but TX/RX are dead (xDMcGee on 9.0.675).
 * WHY(P2302 / diag f84180b7): late identity left `_fcu=false` → BHT RX + generic
 * DP1→temp; OFF/setpoint ignored. Arm FCU from pairing data + re-register listeners.
 */
class WallThermostatDevice extends TuyaSpecificClusterDevice {
  get mainsPowered() { return true; }

  _resolveMfrPid() {
    const data = (typeof this.getData === 'function' ? this.getData() : null) || {};
    const mfr = this.getSetting?.('zb_manufacturer_name')
      || this._cachedManufacturerName
      || data.manufacturerName
      || this.getStoreValue?.('manufacturerName')
      || this.zigbee?.manufacturerName
      || '';
    const pid = this.getSetting?.('zb_model_id')
      || this._cachedModelId
      || data.productId
      || data.modelId
      || this.getStoreValue?.('modelId')
      || this.getStoreValue?.('productId')
      || this.zigbee?.productId
      || '';
    return { mfr: String(mfr), pid: String(pid) };
  }

  _isFcuCouple() {
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
    }
  }

  async onNodeInit({ zclNode }) {
    // WHY(P2300): parent installs DeviceIO, interview compensation, dataQuery
    await super.onNodeInit({ zclNode });
    this.printNode?.();

    this._fcu = this._isFcuCouple();
    this._installDpMappings();
    this.log(this._fcu
      ? `[WALL-THERMO] FCU path (${this._resolveMfrPid().mfr}|${this._resolveMfrPid().pid})`
      : '[WALL-THERMO] BHT path');

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

    if (this._fcu) {
      this._queryFcuState().catch((err) => {
        this.log('[WALL-THERMO] FCU DP query deferred:', err?.message || err);
      });
    }
  }

  _registerSharedListeners() {
    if (this._sharedListenersReady) return;
    this._sharedListenersReady = true;

    this.registerCapabilityListener('onoff', async (onOff) => {
      // WHY(P2301): avoid re-entrancy when syncing thermostat_mode ↔ onoff
      if (this._fcuSyncing) return;
      this._fcuSyncing = true;
      try {
        // WHY(P2302): schedule mode can ignore DP1 — force manual first (Z2M DP101)
        if (this._fcu) {
          await this.writeBool(FCU_DATA_POINTS.manualMode, true).catch(() => {});
        }
        await this.writeBool(BHT_DATA_POINTS.onOff, !!onOff);
        if (this._fcu && this.hasCapability('thermostat_mode')) {
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
      if (this._fcu) {
        const manualOn = String(mode) === '0';
        await this.writeBool(FCU_DATA_POINTS.manualMode, manualOn);
      } else {
        await this.writeEnum(BHT_DATA_POINTS.mode, Number(mode));
      }
      this.log('[WALL-THERMO] programming TX', mode);
    });

    this.registerCapabilityListener('target_temperature', async (targetTemperature) => {
      const rawValue = Math.round(Number(targetTemperature) * 10);
      // WHY(P2302): setpoint ignored while MCU is in schedule — arm manual first
      if (this._fcu) {
        await this.writeBool(FCU_DATA_POINTS.manualMode, true).catch(() => {});
      }
      await this.writeData32(BHT_DATA_POINTS.targetTemperature, rawValue);
      this.log('[WALL-THERMO] target_temperature TX', targetTemperature, 'raw', rawValue);
    });

    this.registerCapabilityListener('child_lock', async (childlock) => {
      await this.writeBool(BHT_DATA_POINTS.childlock, !!childlock);
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
        await this.writeBool(FCU_DATA_POINTS.manualMode, true).catch(() => {});
        // Z2M #8691: system_mode "off" → DP1 false; cool/heat/fan_only → DP1 true + DP2
        if (mode === 'off') {
          await this.writeBool(FCU_DATA_POINTS.onOff, false);
          await this.safeSetCapabilityValue('onoff', false);
          this.log('[WALL-THERMO] FCU system_mode TX off');
          return;
        }
        const enumVal = SYSTEM_MODE_TX[mode];
        if (enumVal === undefined) return;
        this._lastFcuSystemMode = mode;
        await this.writeBool(FCU_DATA_POINTS.onOff, true);
        await this.writeEnum(FCU_DATA_POINTS.systemMode, enumVal);
        await this.safeSetCapabilityValue('onoff', true);
        this.log('[WALL-THERMO] FCU system_mode TX', mode, enumVal);
      } finally {
        this._fcuSyncing = false;
      }
    });

    this.registerCapabilityListener('fan_mode', async (mode) => {
      const enumVal = FAN_MODE_TX[mode];
      if (enumVal === undefined) return;
      await this.writeEnum(FCU_DATA_POINTS.fanMode, enumVal);
      this.log('[WALL-THERMO] FCU fan_mode TX', mode, enumVal);
    });
  }

  /**
   * WHY(P2300): interview often exposes 0xEF00 without a ready `clusters.tuya`
   * handle — resolve via DeviceIO aliases and soft-fail if still missing.
   */
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
    // WHY(P2300): DeviceIO has requestDP / queryAllDPs — not queryDPs
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
    const dp = data.dp;
    const parsedValue = getDataValue(data);

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

  /**
   * WHY(P2300/P2302): MFR-ENSURE can land after onNodeInit — re-evaluate FCU branch
   * and register missing FCU capability listeners.
   */
  async _onZigbeeIdentityResolved(updates = {}) {
    const wasFcu = this._fcu;
    this._fcu = this._isFcuCouple();
    this._installDpMappings();
    if (this._fcu && !wasFcu) {
      this.log('[WALL-THERMO] P2302 identity → FCU path armed');
      for (const cap of ['thermostat_mode', 'fan_mode']) {
        if (!this.hasCapability(cap)) await this.addCapability(cap).catch(() => {});
      }
      this._registerFcuListeners();
      await this._queryFcuState().catch(() => {});
    }
  }
}

module.exports = WallThermostatDevice;
