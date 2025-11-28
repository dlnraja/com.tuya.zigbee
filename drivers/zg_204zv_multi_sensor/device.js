'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');
const { initTuyaDpEngineSafe, logEF00Status } = require('../../lib/tuya/TuyaEF00Base');

/**
 * ZG-204ZV Multi-Sensor (Motion, Temp, Humidity, Light)
 *
 * Manufacturers: HOBEIAN, _TZE200_3towulqd, _TZE200_ppuj1vem, etc.
 * Product ID: ZG-204ZV, TS0601
 * Type: TS0601 (Pure Tuya DP device)
 *
 * Variants: ZG-204ZL (PIR), ZG-204ZM (mmWave), ZG-204ZV (mmWave+PIR)
 *
 * DP Mapping:
 * - DP1: Motion/Presence (alarm_motion)
 * - DP3: Temperature (measure_temperature) - scaled by 10
 * - DP4: Humidity (measure_humidity)
 * - DP9: Illuminance (measure_luminance)
 * - DP15: Battery (measure_battery)
 */
class ZG204MultiSensorDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    try {
      this.log('[ZG-204] 📡 Multi-Sensor initializing...');

      // Store zclNode
      this.zclNode = zclNode;

      // Force Tuya DP mode for TS0601
      this.usesTuyaDP = true;
      this.hasTuyaCluster = true;
      this.isTuyaDevice = true;

      // Initialize base first
      await super.onNodeInit({ zclNode }).catch(err => this.error(err));

      // Initialize Tuya DP engine
      await this._initTuyaDpEngine(zclNode);

      // Initialize Battery Manager V4
      this.batteryManagerV4 = new BatteryManagerV4(this, 'CR2450', {
        useTuyaDP: this._tuyaClusterAvailable === true
      });
      await this.batteryManagerV4.startMonitoring().catch(err => {
        this.log('[ZG-204] ⚠️  Battery V4 init failed:', err.message);
      });

      this.log('[ZG-204] ✅ Multi-Sensor initialized');
      await this.setAvailable();

    } catch (err) {
      this.error('[ZG-204] ❌ Initialization failed:', err);
    }
  }

  /**
   * Initialize Tuya DP engine
   */
  async _initTuyaDpEngine(zclNode) {
    try {
      this.log('[ZG-204] 🔧 Initializing Tuya DP engine...');

      const manager = await initTuyaDpEngineSafe(this, zclNode);

      if (!manager) {
        this.log('[ZG-204] ⚠️  EF00 manager not available');
        this._tuyaClusterAvailable = false;
        return;
      }

      this._tuyaClusterAvailable = true;
      logEF00Status(this);

      // DP Mapping for ZG-204 series
      this.dpMap = {
        '1': 'presence',           // Motion/Presence detection
        '3': 'temperature',        // Temperature (scaled by 10)
        '4': 'humidity',           // Humidity percentage
        '9': 'illuminance',        // Light level in lux
        '15': 'battery',           // Battery percentage
        '101': 'sensitivity',      // Detection sensitivity
        '102': 'keep_time'         // Detection hold time
      };

      this.log('[ZG-204] 📊 DP Map:', JSON.stringify(this.dpMap));

      // Register DP listeners
      Object.keys(this.dpMap).forEach(dpId => {
        manager.on(`dp-${dpId}`, (value) => {
          this._onDataPoint(parseInt(dpId), value);
        });
        this.log(`[ZG-204] ✅ Listening: dp-${dpId} → ${this.dpMap[dpId]}`);
      });

      // Debug mode listener
      if (this.getSetting('dp_debug_mode')) {
        manager.on('dataReport', (data) => {
          this.log('[ZG-204-DEBUG] Raw dataReport:', JSON.stringify(data));
        });
      }

      this.log('[ZG-204] ✅ Tuya DP engine initialized');

    } catch (err) {
      this.error('[ZG-204] ❌ DP engine init failed:', err);
      this._tuyaClusterAvailable = false;
    }
  }

  /**
   * Handle incoming DP values
   */
  _onDataPoint(dpId, value) {
    const role = this.dpMap[String(dpId)];
    this.log(`[ZG-204] DP${dpId} (${role}): ${value}`);

    switch (role) {
      case 'presence':
        this.setCapabilityValue('alarm_motion', !!value).catch(this.error);
        break;

      case 'temperature':
        // Temperature is scaled by 10 (e.g., 235 = 23.5°C)
        const temp = value / 10;
        this.setCapabilityValue('measure_temperature', temp).catch(this.error);
        break;

      case 'humidity':
        this.setCapabilityValue('measure_humidity', value).catch(this.error);
        break;

      case 'illuminance':
        this.setCapabilityValue('measure_luminance', value).catch(this.error);
        break;

      case 'battery':
        this.setCapabilityValue('measure_battery', value).catch(this.error);
        break;

      case 'sensitivity':
      case 'keep_time':
        // Configuration DPs - log only
        this.log(`[ZG-204] Config DP${dpId} (${role}):`, value);
        break;

      default:
        this.log(`[ZG-204] ⚠️  Unhandled DP${dpId}:`, value);
    }
  }

  async onDeleted() {
    this.log('[ZG-204] Device deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = ZG204MultiSensorDevice;
