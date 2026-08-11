'use strict';
const { zclMeasuredValueToLux } = require('../../lib/utils/tuyaUtils.js');

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Outdoor Light Sensor
 * Combines ZCL illuminance + Tuya DP for solar-powered outdoor sensors
 */
class LightSensorOutdoorDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msIlluminanceMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // P98: dpMappings MUST be set before super.onNodeInit so EF00Manager sees them
    // P88: SmarterCurry Luminance Sensor (_TZE284_aaeasoll) uses DP 2 for illuminance
    // per Z2M PR #12347 (https://github.com/Koenkk/zigbee-herdsman-converters/pull/12347)
    // P102: S-LUX-ZB (_TYST11/_TZE200/_TZE204_pisltm67) — DP1=brightness_level enum,
    // DP2=illuminance (raw lx), DP3=battery% (Z2M S-LUX-ZB / issue #8036).
    const mfr = String(
      this.getSetting?.('zb_manufacturer_name')
      || this.getData?.()?.manufacturerName
      || '',
    ).toLowerCase();
    const isSlux = mfr.includes('pisltm67');
    this.dpMappings = isSlux
      ? {
        2: { capability: 'measure_luminance', divisor: 1 },
        3: { capability: 'measure_battery', divisor: 1 },
        4: { capability: 'measure_battery', divisor: 1 },
      }
      : {
        1: { capability: 'measure_luminance', divisor: 1 },
        2: { capability: 'measure_luminance', divisor: 1 },
        4: { capability: 'measure_battery', divisor: 1 },
      };

    await super.onNodeInit({ zclNode });

    // Sleepy illuminance sensors often miss the first report — arm passive + soft query.
    try {
      if (this.io && typeof this.io.runInterviewCompensation === 'function') {
        await this.io.runInterviewCompensation({
          queryAll: false,
          sleepyPassive: true,
        }).catch(() => {});
      }
    } catch (_e) { /* non-fatal */ }

    const ep1 = zclNode?.endpoints?.[1];

    // Standard illuminance measurement cluster (0x0400)
    const illum = ep1?.clusters?.illuminanceMeasurement || ep1?.clusters?.[1024];
    if (illum?.on) {
      illum.on('attr.measuredValue', (val) => {
        this.safeSetCapabilityValue('measure_luminance', zclMeasuredValueToLux(val)).catch(() => {});
      });
    }

    // Soft read after bind (many outdoor lux sensors only answer once awake)
    if (illum && typeof illum.readAttributes === 'function') {
      try {
        const attrs = await illum.readAttributes(['measuredValue']).catch(() => null);
        if (attrs && attrs.measuredValue != null) {
          await this.safeSetCapabilityValue('measure_luminance', zclMeasuredValueToLux(attrs.measuredValue));
        }
      } catch (_e) { /* sleepy — wait for report */ }
    }

    // Battery via power configuration (ZCL batteryPercentageRemaining is 0–200 = %×2)
    const power = ep1?.clusters?.powerConfiguration || ep1?.clusters?.[1];
    if (power?.on) {
      power.on('attr.batteryPercentageRemaining', (val) => {
        const raw = Number(val);
        const pct = Number.isFinite(raw)
          ? Math.min(100, Math.max(0, Math.round(raw > 100 ? raw / 2 : raw)))
          : 0;
        this.safeSetCapabilityValue('measure_battery', pct).catch(() => {});
      });
    }

    this.log('[LIGHT-OUT] \u2705 Ready' );
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
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
}
module.exports = LightSensorOutdoorDevice;
