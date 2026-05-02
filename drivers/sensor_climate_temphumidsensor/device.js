'use strict';

const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const TuyaDeviceClassifier = require('../../lib/TuyaDeviceClassifier');
const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
const TuyaRtcDetector = require('../../lib/TuyaRtcDetector');
const { syncDeviceTimeTuya } = require('../../lib/tuya/TuyaTimeSync');
const { ClimateInference, BatteryInference } = require('../../lib/IntelligentSensorInference');
const { setupSonoffSensor } = require('../../lib/mixins/SonoffSensorMixin');
const CI = require('../../lib/utils/CaseInsensitiveMatcher');
const { getManufacturer, getModelId } = require('../../lib/helpers/DeviceDataHelper');

// v5.5.793: VALIDATION CONSTANTS
const VALIDATION = {
  TEMP_MIN: -40,
  TEMP_MAX: 80,
  HUMIDITY_MIN: 0,
  HUMIDITY_MAX: 100,
  BATTERY_MIN: 0,
  BATTERY_MAX: 100,
  LUX_MIN: 0,
  LUX_MAX: 100000,
  HUMIDITY_AUTO_DIVISOR_THRESHOLD: 100,
};

const BATTERY_THROTTLE_MS = 300000;

class ClimateSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }
  get usesTuyaDPBattery() { return true; }
  get skipZclBatteryPolling() { return false; }
  get forceActiveTuyaMode() { return true; }
  get hybridModeEnabled() { return true; }

  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  get temperatureOffset() {
    const settings = this.getSettings() || {};
    return parseFloat(settings.temperature_calibration) || parseFloat(settings.temperature_offset) || 0;
  }

  get humidityOffset() {
    const settings = this.getSettings() || {};
    return parseFloat(settings.humidity_calibration) || parseFloat(settings.humidity_offset) || 0;
  }

  _applyTempOffset(temp) {
    const offset = this.temperatureOffset;
    const calibrated = temp + offset;
    if (offset !== 0) {
      this.log(`[CALIBRATION] Temp: ${temp}°C + offset ${offset}°C = ${calibrated}°C`);
    }
    return calibrated;
  }

  _applyHumOffset(hum) {
    const offset = this.humidityOffset;
    const calibrated = Math.max(0, Math.min(100, hum + offset));
    if (offset !== 0) {
      this.log(`[CALIBRATION] Humidity: ${hum}% + offset ${offset}% = ${calibrated}%`);
    }
    return calibrated;
  }

  get dpMappings() {
    return {
      1: { capability: 'measure_temperature', divisor: 10 },
      6: { capability: 'measure_temperature', divisor: 10 },
      18: { capability: 'measure_temperature', divisor: 10 },
      38: { capability: 'measure_temperature.probe', divisor: 10, dynamicAdd: true },
      2: {
        capability: 'measure_humidity',
        transform: (v) => {
          if (v > 100) return safeDivide(v, 10);
          return v;
        }
      },
      7: {
        capability: 'measure_humidity',
        transform: (v) => {
          if (v > 100) return safeDivide(v, 10);
          return v;
        }
      },
      3: {
        capability: 'measure_battery', 
        transform: (v) => {
          if (v === 0) return 10;
          if (v === 1) return 50;
          if (v === 2) return 100;
          return Math.min(100, safeMultiply(v, 2));
        }
      },
      4: { capability: 'measure_battery', transform: (v) => Math.min(100, safeMultiply(v, 2)) },
      9: { setting: 'temperature_unit' },
      10: { setting: 'max_temp_alarm', divisor: 10 },
      11: { setting: 'min_temp_alarm', divisor: 10 },
      12: { capability: 'measure_luminance', divisor: 1 },
      13: { setting: 'min_humidity_alarm' },
      14: { setting: 'temp_alarm_status' },
      15: { setting: 'humidity_alarm_status' },
      17: { setting: 'temp_report_interval' },
      19: { setting: 'temp_sensitivity', divisor: 10 },
      20: { setting: 'humidity_sensitivity' },
      5: { capability: 'measure_luminance', divisor: 1 },
      101: { capability: 'measure_battery', transform: (v) => Math.min(100, v) },
      102: { capability: 'measure_battery', transform: (v) => Math.min(100, v) },
    };
  }

  get deviceProtocol() {
    const mfr = getManufacturer(this);
    if (CI.startsWithCI(mfr, '_tze284')) return 'TUYA_DP_LCD';
    if (CI.startsWithCI(mfr, '_tze200')) return 'TUYA_DP';
    if (CI.startsWithCI(mfr, '_tze204')) return 'TUYA_DP_ENHANCED';
    if (CI.startsWithCI(mfr, '_tz3000')) return 'ZCL_STANDARD';
    if (CI.startsWithCI(mfr, '_tz3210')) return 'ZCL_STANDARD';

    const modelId = getModelId(this);
    if (CI.equalsCI(modelId, 'TS0201')) return 'ZCL_STANDARD';
    if (CI.equalsCI(modelId, 'TS0601')) return 'TUYA_DP';

    return 'HYBRID';
  }

  get needsTuyaEpoch() {
    const mfr = getManufacturer(this);
    return CI.startsWithCI(mfr, '_tze200') ||
      CI.startsWithCI(mfr, '_tze204') ||
      CI.startsWithCI(mfr, '_tze284') ||
      CI.containsCI(mfr, 'vvmbj46n') ||
      CI.containsCI(mfr, 'aao6qtcs') ||
      CI.containsCI(mfr, 'znph9215') ||
      CI.containsCI(mfr, 'qoy0ekbd');
  }

  isLCDClimateDevice() {
    const mfr = getManufacturer(this);
    const modelId = getModelId(this);
    if (CI.startsWithCI(mfr, '_tze284_')) return true;
    const lcdManufacturers = [
      '_tze284_vvmbj46n', '_tze284_aao6qtcs', '_tze284_znph9215',
      '_tze284_qoy0ekbd', '_tze200_vvmbj46n'
    ];
    for (const lcdMfr of lcdManufacturers) {
      if (CI.containsCI(mfr, lcdMfr)) return true;
    }
    if (CI.equalsCI(modelId, 'TS0601') && CI.startsWithCI(mfr, '_tze284_')) return true;
    return false;
  }

  get usesBatteryStateEnum() {
    const mfr = getManufacturer(this);
    return CI.containsCI(mfr, '_tze200_vvmbj46n');
  }

  get clusterHandlers() {
    return {
      temperatureMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined && data.measuredValue !== -32768) {
            let rawTemp = safeDivide(data.measuredValue, 100);
            if (rawTemp < VALIDATION.TEMP_MIN || rawTemp > VALIDATION.TEMP_MAX) return;
            if (this._climateInference) {
              rawTemp = this._climateInference.validateTemperature(rawTemp);
              if (rawTemp === null) return;
            }
            this._safeSetCapability('measure_temperature', this._applyTempOffset(rawTemp)).catch(() => { });
          }
        }
      },
      relativeHumidity: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            let rawHum = safeDivide(data.measuredValue, 100);
            if (this._climateInference) {
              rawHum = this._climateInference.validateHumidity(rawHum);
              if (rawHum === null) return;
            }
            this._safeSetCapability('measure_humidity', this._applyHumOffset(rawHum)).catch(() => { });
          }
        }
      },
      powerConfiguration: {
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined && data.batteryPercentageRemaining !== 255) {
            const now = Date.now();
            if (this._lastBatteryReportTime && (now - this._lastBatteryReportTime) < BATTERY_THROTTLE_MS) return;
            this._lastBatteryReportTime = now;
            let battery = Math.round(safeDivide(data.batteryPercentageRemaining, 2));
            battery = Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, battery));
            if (this._batteryInference) {
              battery = this._batteryInference.validateBattery(battery) ?? battery;
            }
            this._safeSetCapability('measure_battery', battery).catch(() => { });
          }
        }
      }
    };
  }

  async onNodeInit({ zclNode }) {
    this._zclNode = zclNode;
    this._climateInference = new ClimateInference(this, {
      maxTempJump: 5,
      maxHumidityJump: 15,
    });
    this._batteryInference = new BatteryInference(this);

    await super.onNodeInit({ zclNode });

    if (this.hasCapability('measure_temperature.probe')) {
      const mfr = getManufacturer(this);
      const isPureZCL = CI.startsWithCI(mfr, '_tz3000_') || CI.startsWithCI(mfr, '_tz3210_') ||
                        CI.startsWithCI(mfr, '_tz6210_') || CI.startsWithCI(mfr, 'owon');
      if (isPureZCL) {
        await this.removeCapability('measure_temperature.probe').catch(() => {});
      } else {
        this._probeObservationSamples = [];
        this._probeObservationTimer = this.homey.setTimeout(() => {
          this._evaluateProbeDedup();
        }, 5 * 60 * 1000);
      }
    }

    const protocol = this.deviceProtocol;
    const needsEpoch = this.needsTuyaEpoch;
    this.log(`[CLIMATE] Protocol: ${protocol} | Tuya Epoch: ${needsEpoch}`);

    const rtcDetection = TuyaRtcDetector.hasRtc(this, { useHeuristics: true });
    if (rtcDetection.hasRtc) {
      this.zigbeeTimeSync = new ZigbeeTimeSync(this, {
        throttleMs: 24 * 60 * 60 * 1000,
        maxRetries: 3,
        retryDelayMs: 2000
      });
      await this.zigbeeTimeSync.sync({ force: true }).catch(() => {});
      this._dailyZclSyncInterval = this.homey.setInterval(async () => {
        await this.zigbeeTimeSync.sync().catch(() => {});
      }, 24 * 60 * 60 * 1000);
    }

    if (this.isLCDClimateDevice()) {
      const lcdSyncDelays = [3000, 10000, 30000, 60000, 120000];
      lcdSyncDelays.forEach((delay) => {
        this.homey.setTimeout(async () => {
          await this._sendForcedTimeSync().catch(() => {});
        }, delay);
      });
      this._hourlyLcdSyncInterval = this.homey.setInterval(async () => {
        await this._sendForcedTimeSync().catch(() => {});
      }, 60 * 60 * 1000);
    } else if (!TuyaDeviceClassifier.hasRtcScreen(this)) {
      this._hourlySyncInterval = this.homey.setInterval(async () => {
        await this._sendTimeSync().catch(() => {});
      }, 60 * 60 * 1000);
    }

    await this._setupExplicitZCLClusters(zclNode);
    this._scheduleInitialDPRequests();
    await this._readZCLAttributesNow(zclNode);
    await setupSonoffSensor(this, zclNode).catch(() => {});

    this.log('[CLIMATE] Climate sensor ready');
  }

  async _evaluateProbeDedup() {
    const samples = this._probeObservationSamples || [];
    this._probeObservationSamples = null;
    if (samples.length < 2) return;
    const allIdentical = samples.every(s => Math.abs(s.main - s.probe) <= 0.5);
    const neverReported = samples.every(s => s.probe === null || s.probe === undefined);
    if (neverReported || allIdentical) {
      await this.removeCapability('measure_temperature.probe').catch(() => {});
    }
  }

  async _sendForcedTimeSync() {
    try {
      const now = new Date();
      const timezoneMinutes = -now.getTimezoneOffset();
      return await syncDeviceTimeTuya(this, {
        useTuyaEpoch: true,
        timezoneMinutes: timezoneMinutes
      });
    } catch (err) {
      return false;
    }
  }

  async _sendTimeSync() {
    try {
      const now = new Date();
      const timezoneMinutes = -now.getTimezoneOffset();
      return await syncDeviceTimeTuya(this, {
        useTuyaEpoch: this.needsTuyaEpoch,
        timezoneMinutes: timezoneMinutes
      });
    } catch (err) {
      return false;
    }
  }

  async _setupExplicitZCLClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const clusters = [
      { name: 'powerConfiguration', attr: 'batteryPercentageRemaining', cap: 'measure_battery', factor: 0.5 },
      { name: 'temperatureMeasurement', attr: 'measuredValue', cap: 'measure_temperature', factor: 0.01, isTemp: true },
      { name: 'relativeHumidity', attr: 'measuredValue', cap: 'measure_humidity', factor: 0.01, isHum: true }
    ];

    for (const c of clusters) {
      const cluster = ep1.clusters[c.name] || ep1.clusters[`ms${c.name.charAt(0).toUpperCase()}${c.name.slice(1)}`];
      if (cluster) {
        await cluster.bind().catch(() => {});
        if (cluster.on) {
          cluster.on(`attr.${c.attr}`, (val) => {
            let processed = safeMultiply(val, c.factor);
            if (c.isTemp) processed = this._applyTempOffset(processed);
            if (c.isHum) processed = this._applyHumOffset(processed);
            this.setCapabilityValue(c.cap, processed).catch(() => {});
          });
        }
      }
    }
  }

  async _readZCLAttributesNow(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;
    const powerCfg = ep1.clusters?.powerConfiguration;
    if (powerCfg?.readAttributes) {
      const attrs = await powerCfg.readAttributes(['batteryPercentageRemaining']).catch(() => ({}));
      if (attrs.batteryPercentageRemaining !== undefined) {
        this.setCapabilityValue('measure_battery', safeDivide(attrs.batteryPercentageRemaining, 2)).catch(() => {});
      }
    }
  }

  _scheduleInitialDPRequests() {
    const intervals = [10000, 30000, 120000, 300000];
    this._aggressiveTimers = intervals.map((delay) => {
      return this.homey.setTimeout(async () => {
        if (this.safeTuyaDataQuery) {
          await this.safeTuyaDataQuery([1, 2, 4], { delayBetweenQueries: 100 }).catch(() => {});
        }
      }, delay);
    });
  }

  async _handleDP(dp, value, dataType) {
    if (this._isSoilSensor()) {
      if (dp === 5) return this._safeSetCapability('measure_temperature', this._applyTempOffset(safeDivide(value, 10)));
      if (dp === 3) return this._safeSetCapability('measure_humidity', value > 100 ? safeDivide(value, 10) : value);
      if (dp === 15) return this._safeSetCapability('measure_battery', Math.min(100, value));
    }
    return super._handleDP(dp, value, dataType);
  }

  _isSoilSensor() {
    const mfr = getManufacturer(this);
    return ['_tze284_oitavov2', '_tze200_myd45weu', '_tze200_ga1maeof',
      '_tze200_9cqcpkgb', '_tze204_myd45weu', '_tze284_myd45weu',
      '_tze200_2se8efxh'].some(s => CI.containsCI(mfr, s));
  }

  async onUninit() {
    if (this._dailyZclSyncInterval) this.homey.clearInterval(this._dailyZclSyncInterval);
    if (this._hourlyLcdSyncInterval) this.homey.clearInterval(this._hourlyLcdSyncInterval);
    if (this._hourlySyncInterval) this.homey.clearInterval(this._hourlySyncInterval);
    if (this._aggressiveTimers) this._aggressiveTimers.forEach(t => this.homey.clearTimeout(t));
    if (this._probeObservationTimer) this.homey.clearTimeout(this._probeObservationTimer);
    return super.onUninit();
  }
}

module.exports = ClimateSensorDevice;
