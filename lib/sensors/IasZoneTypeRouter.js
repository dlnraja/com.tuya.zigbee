'use strict';
/**
 * IAS zoneType → Homey alarm capability (ZCL spec 8.2.2.2.1.3).
 * Used where ONE public manufacturer/model identity ships as different physical
 * products (e.g. eWeLink|SNZB-03 = PIR or SQ510A water detector, JohanBendz #1113/#1475).
 * The static matcher cannot tell them apart; the device's own zoneType can.
 * Unknown/unreadable zoneType → null (caller adds nothing and retries later; never guesses).
 */
const MAP = Object.freeze({
  0x000D: 'alarm_motion',
  0x0015: 'alarm_contact',
  0x002A: 'alarm_water',
  0x0028: 'alarm_smoke',
  0x002B: 'alarm_co',
  0x002D: 'alarm_vibration',
});
const NAMES = Object.freeze({ motionSensor: 0x000D, contactSwitch: 0x0015, waterSensor: 0x002A, fireSensor: 0x0028, carbonMonoxideSensor: 0x002B, vibrationMovementSensor: 0x002D });
const ALL = Object.freeze([...new Set(Object.values(MAP))]);

function capabilityForZoneType(zoneType) {
  if (zoneType == null) {return null;}
  const n = typeof zoneType === 'string' ? NAMES[zoneType] ?? Number(zoneType) : Number(zoneType);
  return MAP[n] || null;
}

/** Decode an IAS zoneStatus (number | Buffer | {type:'Buffer',data} | {zoneStatus} | {value} | Bitmap). */
function decodeZoneStatus(status) {
  if (status == null) {return null;}
  if (typeof status === 'object' && ('alarm1' in status || 'alarm2' in status)) {
    return { alarm1: !!status.alarm1, alarm2: !!status.alarm2, tamper: !!status.tamper, batteryLow: !!status.battery };
  }
  let v = status;
  if (Buffer.isBuffer(v)) {v = v.length >= 2 ? (v[1] << 8) | v[0] : v[0] || 0;}
  else if (typeof v === 'object' && Array.isArray(v.data)) {v = v.data.length >= 2 ? (v.data[1] << 8) | v.data[0] : v.data[0] || 0;}
  else if (typeof v === 'object' && v.zoneStatus != null) {return decodeZoneStatus(v.zoneStatus);}
  else if (typeof v === 'object' && v.value != null) {return decodeZoneStatus(v.value);}
  v = Number(v);
  if (!Number.isFinite(v)) {return null;}
  return { alarm1: (v & 1) !== 0, alarm2: (v & 2) !== 0, tamper: (v & 4) !== 0, batteryLow: (v & 8) !== 0 };
}

/** Alarm value for a capability: hazard detectors may use alarm1 or alarm2. */
function alarmFor(capability, decoded) {
  if (!decoded) {return null;}
  return ['alarm_water', 'alarm_smoke', 'alarm_co'].includes(capability) ? decoded.alarm1 || decoded.alarm2 : decoded.alarm1;
}

module.exports = { capabilityForZoneType, decodeZoneStatus, alarmFor, ALL_ZONE_CAPABILITIES: ALL };
