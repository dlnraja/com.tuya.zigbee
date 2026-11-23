'use strict';
// P3382 (forum 21313 #291/#292, t1013u): plugs that report metering DPs the driver does not map.
// Standard Tuya plug DPs (Z2M tuya.ts / tuya-local smartplug): 18 cur_current mA, 19 cur_power 0.1 W,
// 20 cur_voltage 0.1 V. Applied ONLY on class "socket" devices, ONLY when the driver has no own mapping
// for that DP and the value is physically plausible. Capability added late (LateCapability), never at pairing.
const SOCKET_DPS = {
  18: { capability: 'measure_current', convert: (v) => v / 1000, ok: (v) => v >= 0 && v <= 32000 },
  19: { capability: 'measure_power', convert: (v) => v / 10, ok: (v) => v >= 0 && v <= 40000 },
  20: { capability: 'measure_voltage', convert: (v) => v / 10, ok: (v) => v >= 800 && v <= 2800 },
};

function driverMapsDp(device, dp) {
  try {
    const m = device.dpMappings;
    if (m && (m[dp] || m[String(dp)])) {return true;}
    const caps = device.capabilityMap;
    if (Array.isArray(caps) && caps.some((c) => Number(c.dp) === dp)) {return true;}
  } catch (_) { /* getter may throw in tests */ }
  return false;
}

/** Returns { capability, value } when the fallback applies, else null. Pure. */
function socketMeteringFor(device, dp, value) {
  const spec = SOCKET_DPS[dp];
  if (!spec || typeof value !== 'number' || !Number.isFinite(value) || !spec.ok(value)) {return null;}
  let cls = null;
  try { cls = device.getClass ? device.getClass() : null; } catch (_) { cls = null; }
  if (cls !== 'socket') {return null;}
  if (driverMapsDp(device, dp)) {return null;}
  return { capability: spec.capability, value: Math.round(spec.convert(value) * 100) / 100 };
}

async function applySocketMetering(device, dp, value) {
  const hit = socketMeteringFor(device, dp, value);
  if (!hit) {return false;}
  return require('../helpers/LateCapability').ensureAndSet(device, hit.capability, hit.value);
}

module.exports = { SOCKET_DPS, socketMeteringFor, applySocketMetering };
