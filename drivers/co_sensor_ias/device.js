'use strict';
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { decodeZoneStatus, alarmFor, capabilityForZoneType } = require('../../lib/sensors/IasZoneTypeRouter');

/**
 * P2870 — TS0212 carbon-monoxide alarms on the standard IAS Zone cluster (0x0500).
 * Exact couples (one owner each): _TYZB01_o7m83470 (Nedis ZBDCO11WT), _TYZB01_0aps0h1r
 * (Alecto SMARTCOA10), _TYZB01_wpmo3ja3 (Heiman HS1CA-M). Sources: JohanBendz #513 / #977
 * physical interviews (EP1 in 0/1/3/1280), SmartThings Edge "Zigbee Smoke/CO Detector Mc"
 * fingerprints (Mariano Colmenarejo, co-battery profile), Z2M #9291 (jimmyeao, Heiman TS0212
 * = IAS CO alarm). Native ZCL only: IAS zoneStatus alarm1|alarm2 → alarm_co, battery via
 * powerConfiguration. No Tuya DP / EF00 path, nothing non-native is needed to pair.
 */
class CoSensorIasDevice extends UnifiedSensorBase {
  get sensorCapabilities() {
    return ['alarm_co', 'measure_battery'];
  }

  get dpMappings() {
    return {};
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    // Informational only: log the advertised zoneType once (0x002B expected); never re-route.
    const ias = zclNode?.endpoints?.[1]?.clusters?.iasZone;
    if (ias && !this.getStoreValue('ias_zone_type_logged')) {
      ias.readAttributes(['zoneType']).then((a) => {
        this.log(`[CO-IAS] zoneType=${a?.zoneType} (${capabilityForZoneType(a?.zoneType) || 'unknown'})`);
        return this.setStoreValue('ias_zone_type_logged', true);
      }).catch(() => { /* sleepy device: fine, next wake */ });
    }
  }

  /** CO detectors may raise alarm1 or alarm2; tamper/battery-low bits stay optional. */
  async _handleIASZoneStatus(status) {
    const d = decodeZoneStatus(status);
    const v = alarmFor('alarm_co', d);
    if (v == null) {return;}
    await this.safeSetCapabilityValue('alarm_co', v).catch(() => { });
    if (this.hasCapability('alarm_tamper')) {await this.safeSetCapabilityValue('alarm_tamper', d.tamper).catch(() => { });}
    if (this.hasCapability('alarm_battery')) {await this.safeSetCapabilityValue('alarm_battery', d.batteryLow).catch(() => { });}
  }
}

module.exports = CoSensorIasDevice;
