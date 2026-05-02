'use strict';

const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { MotionLuxInference, BatteryInference } = require('../../lib/IntelligentSensorInference');
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
};

const BATTERY_THROTTLE_MS = 300000;

class ContactMotionSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }
  get isSleepyDevice() { return true; }

  get sensorCapabilities() {
    return ['alarm_contact', 'alarm_motion', 'measure_luminance', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_contact', transform: (v) => !!v },
      3: { capability: 'alarm_motion', transform: (v) => !!v },
      4: { capability: 'measure_luminance', divisor: 1 },
      101: { capability: 'measure_battery', transform: (v) => Math.min(100, v) },
    };
  }

  async onNodeInit({ zclNode }) {
    this._motionLuxInference = new MotionLuxInference(this, {
      luxChangeThreshold: 8,
      motionHoldTime: 60000,
      luxActivityWindow: 5000
    });
    this._batteryInference = new BatteryInference(this);

    await super.onNodeInit({ zclNode });

    // Remove alarm_smoke if wrongly added (common corruption in this driver fleet)
    if (this.hasCapability('alarm_smoke')) {
      await this.removeCapability('alarm_smoke').catch(() => {});
    }

    await this._setupExplicitZCLClusters(zclNode);

    this.log('[CONTACT-MOTION] Hybrid sensor ready');
  }

  async _setupExplicitZCLClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const clusters = [
      { name: 'iasZone', attr: 'zoneStatus', cap: 'alarm_motion', isMotion: true },
      { name: 'powerConfiguration', attr: 'batteryPercentageRemaining', cap: 'measure_battery', factor: 0.5 },
      { name: 'illuminanceMeasurement', attr: 'measuredValue', cap: 'measure_luminance', isLux: true }
    ];

    for (const c of clusters) {
      const cluster = ep1.clusters[c.name] || ep1.clusters[`ms${c.name.charAt(0).toUpperCase()}${c.name.slice(1)}`];
      if (cluster) {
        await cluster.bind().catch(() => {});
        if (cluster.on) {
          cluster.on(`attr.${c.attr}`, (val) => {
            if (c.isMotion) {
              const motion = !!(val & 2);
              this._safeSetCapability('alarm_motion', motion).catch(() => {});
              // If motion bit 1 is set, it might be contact
              const contact = !!(val & 1);
              if (this.hasCapability('alarm_contact')) {
                this._safeSetCapability('alarm_contact', contact).catch(() => {});
              }
              return;
            }
            if (c.isLux) {
              const lux = Math.round(Math.pow(10, (val - 1) / 10000));
              this._safeSetCapability('measure_luminance', lux).catch(() => {});
              return;
            }
            let processed = safeMultiply(val, c.factor);
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

module.exports = ContactMotionSensorDevice;
