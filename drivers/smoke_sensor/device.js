'use strict';

const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');
const PassiveDpRx = require('../../lib/tuya/PassiveDpRx');
const LateCapability = require('../../lib/helpers/LateCapability');

// P3064: exact TS0601 couples hosted here, DP layouts from zigbee-herdsman-converters tuya.ts
// (Koen Kanters and contributors; facts only, own code):
//   TS0601_smoke_co (_TZE284_6ycgarab, _TZE284_aoah6bv8 = Moes JKD-513COM-Z, _TZE2841000000_6ycgarab):
//     DP1 enum 0 = smoke alarm, DP15 battery %, DP18 enum 0 = carbon monoxide alarm.
//   PA-44Z (_TZE284_qvzsq3s2): DP1 0 = smoke, DP15 battery %.
//   GSKS-ZB (_TZE200_qcasmfan): DP1 0 = smoke, DP4 tamper, DP15 battery %.
// Receive-only: nothing is written to 0xEF00. alarm_co / alarm_tamper are added only after a real report.
const TS0601_SMOKE = {
  _tze284_6ycgarab: 'smoke_co', _tze284_aoah6bv8: 'smoke_co', _tze2841000000_6ycgarab: 'smoke_co',
  _tze284_qvzsq3s2: 'pa44z', _tze200_qcasmfan: 'gsks',
};

function smokeProfileFor(mfr) {
  return TS0601_SMOKE[String(mfr || '').toLowerCase()] || null;
}

/** Map one datapoint to [capability, value] or null for an exact profile. */
function mapSmokeDp(profile, dp, raw) {
  if (!profile) { return null; }
  const n = Number(raw);
  if (!Number.isFinite(n)) { return null; }
  if (dp === 1) { return ['alarm_smoke', n === 0]; }
  if (dp === 15) { return n >= 0 && n <= 100 ? ['measure_battery', n] : null; }
  if (dp === 18 && profile === 'smoke_co') { return ['alarm_co', n === 0]; }
  if (dp === 4 && profile === 'gsks') { return ['alarm_tamper', n !== 0]; }
  return null;
}

/**
 * P113: migrate bare ZigBeeDevice → TuyaZigbeeDevice for DeviceIO + IAS enroll
 * + L14 safeSetCapabilityValue (was undefined on bare ZigBeeDevice).
 */
class smoke_sensor extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    ZclBatteryMonitor.attach(this, zclNode);
    this.printNode();

    try {
      const ias = zclNode?.endpoints?.[1]?.clusters?.[CLUSTER.IAS_ZONE.NAME];
      if (ias) {
        ias.onZoneStatusChangeNotification = (payload) => {
          this.onIASZoneStatusChangeNotification(payload);
        };
      }
    } catch (err) {
      this.error('IAS Zone listener setup failed:', err);
    }

    if (this.io && typeof this.io.ensureIasEnrolled === 'function') {
      await this.io.ensureIasEnrolled({ force: true }).catch(() => false);
    }

    // P3064: TS0601 smoke / CO couples had no datapoint path in this IAS-based driver.
    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName;
    this._ts0601Smoke = smokeProfileFor(mfr);
    if (this._ts0601Smoke) {
      PassiveDpRx.attach(this, (dp, raw) => this._onSmokeDp(dp, raw));
    }
  }

  _onSmokeDp(dp, raw) {
    const hit = mapSmokeDp(this._ts0601Smoke, dp, raw);
    if (!hit) { return; }
    const [cap, value] = hit;
    if (this.hasCapability(cap)) {
      this.safeSetCapabilityValue(cap, value).catch((e) => this.error(e));
    } else {
      LateCapability.ensureAndSet(this, cap, value).catch(() => {});
    }
  }

  onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay }) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    const set = (cap, val) => {
      if (typeof this.hasCapability === 'function' && !this.hasCapability(cap)) {return;}
      this.safeSetCapabilityValue(cap, val).catch((e) => this.error(e));
    };
    set('alarm_smoke', !!(zoneStatus && zoneStatus.alarm1));
    set('alarm_battery', !!(zoneStatus && zoneStatus.battery));
  }

  onDeleted() {
    super.onDeleted();
    this.log('Smoke Sensor removed');
  }
}

module.exports = smoke_sensor;
module.exports.smokeProfileFor = smokeProfileFor;
module.exports.mapSmokeDp = mapSmokeDp;
