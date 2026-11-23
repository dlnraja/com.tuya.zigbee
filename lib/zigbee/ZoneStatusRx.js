'use strict';

/**
 * P3397 IAS Zone status decoding + parallel RX for motion/presence drivers.
 *
 * WHY: zigbee-clusters decodes zoneStatus (attribute 0x0002 AND the
 * zoneStatusChangeNotification payload) as a map16 Bitmap object, not a number.
 * `bitmap & 0x01` is 0, `bitmap.data` is undefined, Number(bitmap) is NaN.
 * Every handler doing `(status & 0x03) !== 0` or `status?.data?.[0]` therefore
 * always computed "no motion" (forum 140352 #2275: motion sensor paired, PIR
 * works standalone, Homey never shows motion).
 *
 * The attribute name for the CIE address is `iasCIEAddress` (zigbee-clusters
 * iasZone.js). `iasCieAddress` throws "not a valid attribute" before any frame
 * is sent. Never write a zero or placeholder IEEE (it breaks enrollment).
 */

let _coerce = null;
function coerce(raw) {
  if (!_coerce) {
    _coerce = require('../managers/IASZoneEnhanced').coerceZoneStatusToUint16;
  }
  return _coerce(raw);
}

/**
 * @param {*} raw number | Bitmap | Buffer | {zoneStatus} | {type:'Buffer',data}
 * @returns {{value:number, alarm1:boolean, alarm2:boolean, tamper:boolean, battery:boolean}|null}
 */
function zoneStatusBits(raw) {
  let src = raw;
  // Notification payload object { zoneStatus, extendedStatus, zoneId, delay }
  if (src && typeof src === 'object' && !Buffer.isBuffer(src)
    && Object.prototype.hasOwnProperty.call(src, 'zoneStatus')) {
    src = src.zoneStatus;
  }
  let n = coerce(src);
  if (n === null && src && typeof src === 'object' && Array.isArray(src.data)) {
    n = coerce(Buffer.from(src.data));
  }
  if (n === null || !Number.isFinite(n)) return null;
  return {
    value: n,
    alarm1: (n & 0x01) !== 0,
    alarm2: (n & 0x02) !== 0,
    tamper: (n & 0x04) !== 0,
    battery: (n & 0x08) !== 0,
  };
}

/** alarm1 || alarm2, or null when the frame cannot be decoded (never guess false). */
function zoneStatusMotion(raw) {
  const b = zoneStatusBits(raw);
  return b ? (b.alarm1 || b.alarm2) : null;
}

const FAKE_IEEE_RE = /^(0x)?(0{16}|00124b0000000000|f{16})$/i;

/**
 * Write the real coordinator IEEE into iasCIEAddress. Returns true when written.
 * Skips (false) when no trustworthy coordinator address is known.
 */
async function writeCieAddress(device, ias) {
  if (!ias || typeof ias.writeAttributes !== 'function') return false;
  let cie = null;
  try {
    const IEEEAddressManager = require('../managers/IEEEAddressManager');
    cie = await new IEEEAddressManager(device).getCoordinatorIeeeAddress();
  } catch (_e) { cie = null; }
  const s = String(cie || '').replace(/:/g, '');
  if (!cie || FAKE_IEEE_RE.test(s)) return false;
  await ias.writeAttributes({ iasCIEAddress: cie });
  return true;
}

function findIasZone(zclNode) {
  const eps = zclNode && zclNode.endpoints;
  if (!eps) return null;
  const order = [1, 2, ...Object.keys(eps).map(Number).filter((k) => k !== 1 && k !== 2)];
  for (const ep of order) {
    const c = eps[ep] && eps[ep].clusters;
    const ias = c && (c.iasZone || c.ssIasZone);
    if (ias) return ias;
  }
  return null;
}

function findOccupancy(zclNode) {
  const eps = zclNode && zclNode.endpoints;
  if (!eps) return null;
  for (const ep of Object.keys(eps)) {
    const c = eps[ep] && eps[ep].clusters;
    const occ = c && (c.occupancySensing || c.msOccupancySensing);
    if (occ) return occ;
  }
  return null;
}

/**
 * Parallel RX for simple IAS motion drivers: zoneStatusChangeNotification
 * (command), attr.zoneStatus (0x0002 report) and occupancySensing 0x0406
 * attr.occupancy. Any one path is enough; duplicates within 1 s are dropped.
 * Feeds alarm_motion, plus alarm_tamper / alarm_battery when present.
 *
 * @param {object} device Homey device (safeSetCapabilityValue or setCapabilityValue)
 * @param {object} zclNode
 * @param {object} [opts] { onStatus(bits, source) } optional extra callback
 * @returns {{ias:boolean, occupancy:boolean}}
 */
function attachMotionRx(device, zclNode, opts = {}) {
  const res = { ias: false, occupancy: false };
  const set = (cap, v) => {
    try {
      if (typeof device.hasCapability === 'function' && !device.hasCapability(cap)) return;
      const fn = typeof device.safeSetCapabilityValue === 'function'
        ? device.safeSetCapabilityValue.bind(device) : device.setCapabilityValue.bind(device);
      const p = fn(cap, v);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_e) { /* never break RX */ }
  };
  let last = null;
  const apply = (motion, bits, source) => {
    const now = Date.now();
    if (last && last.motion === motion && now - last.t < 1000 && last.source !== source) return;
    last = { motion, t: now, source };
    try { device.log && device.log(`[P3397-RX] ${source} motion=${motion}${bits ? ` zs=0x${bits.value.toString(16)}` : ''}`); } catch (_e) { /* log only */ }
    set('alarm_motion', motion);
    if (bits) {
      set('alarm_tamper', bits.tamper);
      if (bits.battery) set('alarm_battery', true);
    }
    if (typeof opts.onStatus === 'function') {
      try { opts.onStatus(motion, bits, source); } catch (_e) { /* optional */ }
    }
  };
  const onZs = (raw, source) => {
    const bits = zoneStatusBits(raw);
    if (!bits) return; // undecodable: keep last state, never force false
    apply(bits.alarm1 || bits.alarm2, bits, source);
  };

  const ias = findIasZone(zclNode);
  if (ias) {
    res.ias = true;
    const prev = typeof ias.onZoneStatusChangeNotification === 'function'
      && !ias.onZoneStatusChangeNotification.__p3397 ? ias.onZoneStatusChangeNotification : null;
    const h = (payload) => {
      onZs(payload, 'ias-notify');
      if (prev) { try { prev(payload); } catch (_e) { /* chained */ } }
    };
    h.__p3397 = true;
    ias.onZoneStatusChangeNotification = h;
    if (typeof ias.on === 'function') {
      ias.on('attr.zoneStatus', (v) => onZs(v, 'ias-attr'));
    }
    if (typeof ias.onZoneEnrollRequest !== 'function' && typeof ias.zoneEnrollResponse === 'function') {
      // WHY: answer a device-initiated enroll on wake (no boot TX on sleepy nodes).
      ias.onZoneEnrollRequest = () => {
        ias.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 10 }).catch(() => {});
      };
    }
  }
  const occ = findOccupancy(zclNode);
  if (occ && typeof occ.on === 'function') {
    res.occupancy = true;
    occ.on('attr.occupancy', (v) => {
      const n = coerce(v);
      const occupied = n !== null ? (n & 0x01) !== 0 : (v && v.occupied === true);
      apply(!!occupied, null, 'occupancy');
    });
  }
  return res;
}

module.exports = { zoneStatusBits, zoneStatusMotion, writeCieAddress, attachMotionRx, findIasZone };
