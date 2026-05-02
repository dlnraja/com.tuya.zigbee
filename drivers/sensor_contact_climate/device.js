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

class ContactClimateSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }
  get usesTuyaDPBattery() { return true; }
  get forceActiveTuyaMode() { return true; }
  get hybridModeEnabled() { return true; }

  get sensorCapabilities() {
    return ['alarm_contact', 'measure_temperature', 'measure_humidity', 'measure_battery'];
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
      1: { capability: 'alarm_contact', transform: (v) => !!v },
      3: { capability: 'measure_temperature', divisor: 10 },
      4: {
        capability: 'measure_humidity',
        transform: (v) => {
          if (v > 100) return safeDivide(v, 10);
          return v;
        }
      },
      5: {
        capability: 'measure_battery',
        transform: (v) => {
          if (v === 0) return 10;
          if (v === 1) return 50;
          if (v === 2) return 100;
          return Math.min(100, safeMultiply(v, 2));
        }
      },
      6: { capability: 'measure_battery', transform: (v) => Math.min(100, v) },
      // v5.12.11: Support for specific HOBEIAN contact/climate hybrids
      101: { capability: 'measure_temperature', divisor: 10 },
      102: { capability: 'measure_humidity', divisor: 1 },
      103: { capability: 'measure_battery', divisor: 1 },
    };
  }

  get deviceProtocol() {
    const mfr = getManufacturer(this);
    if (CI.startsWithCI(mfr, '_tze200')) return 'TUYA_DP';
    if (CI.startsWithCI(mfr, '_tz3000')) return 'ZCL_STANDARD';
    return 'HYBRID';
  }

  async onNodeInit({ zclNode }) {
    this._climateInference = new ClimateInference(this, {
      maxTempJump: 5,
      maxHumidityJump: 15,
    });
    this._batteryInference = new BatteryInference(this);

    await super.onNodeInit({ zclNode });

    const rtcDetection = TuyaRtcDetector.hasRtc(this, { useHeuristics: true });
    if (rtcDetection.hasRtc) {
      this.zigbeeTimeSync = new ZigbeeTimeSync(this, {
        throttleMs: 24 * 60 * 60 * 1000,
        maxRetries: 3,
        retryDelayMs: 2000
      });
      await this.zigbeeTimeSync.sync({ force: true }).catch(() => {});
    }

    await this._setupExplicitZCLClusters(zclNode);
    await setupSonoffSensor(this, zclNode).catch(() => {});

    this.log('[CLIMATE-CONTACT] Hybrid sensor ready');
  }

  async _setupExplicitZCLClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const clusters = [
      { name: 'powerConfiguration', attr: 'batteryPercentageRemaining', cap: 'measure_battery', factor: 0.5 },
      { name: 'temperatureMeasurement', attr: 'measuredValue', cap: 'measure_temperature', factor: 0.01, isTemp: true },
      { name: 'relativeHumidity', attr: 'measuredValue', cap: 'measure_humidity', factor: 0.01, isHum: true },
      { name: 'iasZone', attr: 'zoneStatus', cap: 'alarm_contact', isContact: true }
    ];

    for (const c of clusters) {
      const cluster = ep1.clusters[c.name] || ep1.clusters[`ms${c.name.charAt(0).toUpperCase()}${c.name.slice(1)}`];
      if (cluster) {
        await cluster.bind().catch(() => {});
        if (cluster.on) {
          cluster.on(`attr.${c.attr}`, (val) => {
            if (c.isContact) {
              const contact = !!(val & 1);
              this._safeSetCapability('alarm_contact', contact).catch(() => {});
              return;
            }
            let processed = safeMultiply(val, c.factor);
            if (c.isTemp) processed = this._applyTempOffset(processed);
            if (c.isHum) processed = this._applyHumOffset(processed);
            this.setCapabilityValue(c.cap, processed).catch(() => {});
          });
        }
      }
    }
  }

  async onUninit() {
    return super.onUninit();
  }
}

module.exports = ContactClimateSensorDevice;
