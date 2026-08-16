'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const GlobalTimeSyncEngine = require('../../lib/tuya/GlobalTimeSyncEngine');
const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
const { ClimateInference, BatteryInference } = require('../../lib/IntelligentSensorInference');
const { safeSetTimeout, safeClearTimeout } = require('../../lib/utils/safe-timers');

/**
 * P133 / GH #513 — Dedicated thin driver for ZT08 LCD climate
 * (_TZE284_hodyryli + TS0601). Interview clusters: 0,4,5,61184,60672.
 *
 * P140: Z2M #29627 — MCU needs Unix-1970 mcuSyncTime THEN DP17=false (~500ms)
 * to commit the LCD clock. Without the commit, the MCU often stays silent /
 * reports temp 0 until wall-clock sync sticks. DP17 is applied inside
 * GlobalTimeSyncEngine via MCUFormatDatabase firmware workaround.
 */
class ClimateSensorZt08Device extends UnifiedSensorBase {
  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  get dpMappings() {
    return {
      // Z2M ZT08: DP1 temp/10, DP2 humidity raw 0-100, DP3 battery enum, DP38 probe/10
      1: { capability: 'measure_temperature', smartDivisor: true, useInference: true },
      2: { capability: 'measure_humidity', smartDivisor: true, useInference: true },
      3: {
        capability: 'measure_battery',
        transform: (v) => UnifiedBatteryHandler.calculateFromTuyaDP(v, 'enum3'),
      },
      38: { capability: 'measure_temperature.probe', smartDivisor: true, dynamicAdd: true },
    };
  }

  async onNodeInit({ zclNode }) {
    this._climateInference = new ClimateInference(this, {
      maxTempJump: 5,
      maxHumidityJump: 15,
      minTemp: -40,
      maxTemp: 100,
    });
    this._batteryInference = new BatteryInference(this);

    await super.onNodeInit({ zclNode });

    try {
      // Force Unix-1970 (Z2M timeStart) — guessFormat alone used to prefer dual-2000
      this._timeSyncEngine = new GlobalTimeSyncEngine(this, { epoch: 'unix_1970' });
      this._timeSyncEngine.setupListener(zclNode);
      this._initialTimeSyncTimer = safeSetTimeout(this, async () => {
        if (this._destroyed) { return; }
        await this._syncZt08Clock(zclNode).catch((e) => {
          this.log('[ZT08] Clock sync sequence failed:', e?.message || e);
        });
      }, 5000);
      this._schedulePeriodicZt08Clock(zclNode);
    } catch (e) {
      this.log('[ZT08] Time sync engine failed:', e.message);
    }

    this.log('[ZT08] Ready (P133/P140 dedicated #513 driver + DP17 commit)');
  }

  _clearPeriodicClock() {
    if (this._periodicClockTimer) {
      safeClearTimeout(this, this._periodicClockTimer);
      this._periodicClockTimer = null;
    }
  }

  _schedulePeriodicZt08Clock(zclNode) {
    this._clearPeriodicClock();
    // Every 4h — engine applies DP17 commit after each successful sync
    this._periodicClockTimer = safeSetTimeout(this, async () => {
      if (this._destroyed) { return; }
      await this._syncZt08Clock(zclNode).catch(() => {});
      this._schedulePeriodicZt08Clock(zclNode);
    }, 4 * 60 * 60 * 1000);
  }

  /**
   * mcuSyncTime (Unix dual) → engine DP17 commit → dataQuery refresh.
   */
  async _syncZt08Clock(zclNode) {
    if (!this._timeSyncEngine) { return; }
    // Allow intentional periodic/manual sync past the engine's 60s dedupe
    this._timeSyncEngine._lastSync = 0;
    await this._timeSyncEngine.syncTime(zclNode);
    if (this._destroyed) { return; }
    try {
      if (typeof this._sendTuyaDataQuery === 'function') {
        await this._sendTuyaDataQuery();
      }
    } catch (_e) { /* non-fatal */ }
  }

  onUninit() {
    if (this._initialTimeSyncTimer) {
      safeClearTimeout(this, this._initialTimeSyncTimer);
      this._initialTimeSyncTimer = null;
    }
    this._clearPeriodicClock();
    try { this._timeSyncEngine?.destroy?.(); } catch (_e) { /* noop */ }
    if (typeof super.onUninit === 'function') { return super.onUninit(); }
  }

  async onDeleted() {
    if (this._initialTimeSyncTimer) {
      safeClearTimeout(this, this._initialTimeSyncTimer);
      this._initialTimeSyncTimer = null;
    }
    this._clearPeriodicClock();
    return super.onDeleted?.();
  }

  onTuyaDP(dpId, value) {
    this.log(`[ZT08] DP${dpId} = ${value}`);
    const mapping = this.dpMappings[dpId];
    if (!mapping) {
      return super.onTuyaDP(dpId, value);
    }

    if (mapping.dynamicAdd && mapping.capability && !this.hasCapability(mapping.capability)) {
      this.addCapability(mapping.capability)
        .then(() => this.log(`[ZT08] DYNAMIC ADD: ${mapping.capability}`))
        .catch((e) => this.log(`[ZT08] Could not add ${mapping.capability}: ${e.message}`));
    }

    let val;
    if (typeof mapping.transform === 'function') {
      val = mapping.transform(value);
    } else if (mapping.smartDivisor === true) {
      const { smartParse } = require('../../lib/managers/SmartDivisorManager');
      val = smartParse(value, dpId, {
        manufacturerName: this.getSetting('zb_manufacturer_name') || '_TZE284_hodyryli',
        capability: mapping.capability,
        deviceId: this.getData()?.id || '',
      });
    } else {
      val = value / (mapping.divisor || 1);
    }

    if (mapping.capability === 'measure_temperature' || mapping.capability === 'measure_temperature.probe') {
      val = this._climateInference?.validateTemperature(val) ?? val;
    } else if (mapping.capability === 'measure_humidity') {
      val = this._climateInference?.validateHumidity(val) ?? val;
    } else if (mapping.capability === 'measure_battery') {
      val = this._batteryInference?.validateBattery(val) ?? val;
    }

    if (val !== null && val !== undefined) {
      return this.safeSetCapabilityValue(mapping.capability, val).catch(() => {});
    }
  }
}

module.exports = ClimateSensorZt08Device;
