'use strict';
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
const GlobalTimeSyncEngine = require('../../lib/tuya/GlobalTimeSyncEngine');
const ManufacturerNameHelper = require('../../lib/helpers/ManufacturerNameHelper');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

const DIRECT_HUMIDITY_MANUFACTURERS = [
  '_TZE200_vvmbj46n',
  '_TZE284_vvmbj46n',
  '_TZE200_locansqn',
  '_TZE284_locansqn',
];

/**
 * LCD Temperature & Humidity Sensor Device - v7.4.4
 *
 * For TS0201 LCD display temperature/humidity sensors
 * Manufacturers: _TYZB01_*, _TZ2000_*, _TZE284_vvmbj46n*
 *
 * Uses UnifiedSensorBase for full ZCL + Tuya DP support
 * Supports: Temperature, Humidity, Battery, Time Synchronization
 */
class LCDTempHumidSensorDevice extends UnifiedSensorBase {

  /** Battery powered */
  get mainsPowered() { return false; }

  /** v7.4.4: Intelligence for _TZE284_ sensors (No humidity divisor) */
  get usesDirectHumidity() {
    return includesCI(DIRECT_HUMIDITY_MANUFACTURERS, ManufacturerNameHelper.getManufacturerName(this));
  }

  /** Capabilities for LCD temp/humidity sensors */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /** DP mappings for TS0201 LCD sensors */
  get dpMappings() {
    const usesDirectHumidity = this.usesDirectHumidity;
    return {
      // Temperature (Standard DP 1 or 18 or 101)
      1: { capability: 'measure_temperature', divisor: 10 },
      18: { capability: 'measure_temperature', smartDivisor: true },
      101: { capability: 'measure_temperature', smartDivisor: true },

      // Humidity (DP 2 or 102)
      // v7.4.4: Research shows _TZE284_vvmbj46n does NOT use divisor 10 for humidity!
      2: { capability: 'measure_humidity', divisor: usesDirectHumidity ? 1 : 10 },
      102: { capability: 'measure_humidity', divisor: usesDirectHumidity ? 1 : 10 },

      // Battery
      // v5.12.3: DP 3 battery enum (0=low, 1=med, 2=high)
      3: { capability: 'measure_battery', transform: (v) => UnifiedBatteryHandler.calculateFromTuyaDP(v, 'enum3') },
      4: { capability: 'measure_battery', transform: (v) => UnifiedBatteryHandler.calculateFromTuyaDP(v, 'direct') },
      15: { capability: 'measure_battery', transform: (v) => UnifiedBatteryHandler.calculateFromTuyaDP(v, 'direct') },
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Global Time Sync Engine v7.4.4 ---
    // LCD sensors need clock sync for the display to show correct time.
    try {
      this._timeSyncEngine = new GlobalTimeSyncEngine(this);
      
      // Setup listener for MCU time requests
      this._timeSyncEngine.setupListener(zclNode);
      
      // Perform initial sync after 5 seconds
      this._initialTimeSyncTimer = this.homey.setTimeout(async () => {
        if (this._destroyed) return;
        await this._timeSyncEngine.syncTime(zclNode).catch(() => {});
      }, 5000);
      
      // Periodic sync every 4 hours for battery sensors
      this._timeSyncEngine.schedulePeriodicSync(zclNode,4 * 60 * 60 * 1000);
    } catch (e) {
      this.log('[LCD]  Time sync engine failed:', e.message);
    }

    // --- Attribute Reporting Configuration ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 50, // 0.5C
        },
        {
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100, // 1%
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 86400,
          minChange: 2,
        }
      ]);
    } catch (err) {
      this.log('[LCD]  Attribute reporting config skipped (using DP polling/reports)');
    }

    await super.onNodeInit({ zclNode });
    this.log('[LCD]  LCD Sensor ready (Universal Sync Engine active)');
  }

  onTuyaStatus(status) {
    this.log('[LCD]  Data received:', JSON.stringify(status));
    super.onTuyaStatus(status);
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') {this._updateLastSeen();}
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager?.forceRecovery?.();
    }
  }

  async onDeleted() {
    this._destroyed = true;
    if (this._initialTimeSyncTimer) {
      this.homey.clearTimeout(this._initialTimeSyncTimer);
      this._initialTimeSyncTimer = null;
    }
    this._timeSyncEngine?.destroy?.();
    this._timeSyncEngine = null;
    await super.onDeleted?.();
  }
}

module.exports = LCDTempHumidSensorDevice;
