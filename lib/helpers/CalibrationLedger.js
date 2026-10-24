'use strict';

/**
 * CalibrationLedger — P3002: one calibration per reading.
 *
 * WHY: safeSetCapabilityValue() calibrates every numeric value (v5.13.6), but older DP
 * handlers (UnifiedSensorBase._handleDP / ZCL handlers, UnifiedThermostatBase._handleDP,
 * climate_sensor, CapabilityManagerMixin) already called _applyCalibration() before
 * handing the value to safeSet → offset added twice (+1.5 °C showed +3 °C), and
 * target_temperature also got the measured-temperature offset.
 * A caller that pre-calibrates marks its output here; safeSet consumes the mark and
 * does not add the offset again. Marks are per capability, short-lived and bounded.
 */

const TTL_MS = 2000;
const MAX_MARKS = 16;
// Rounding between the caller and safeSet (sensor_precision) can move a value by < 0.05.
const EPS = 0.05 + 1e-9;

function _marks(device) {
  if (!device || typeof device !== 'object') {return null;}
  if (!(device.__calMarks instanceof Map)) {
    try { device.__calMarks = new Map(); } catch (_e) { return null; }
  }
  return device.__calMarks;
}

/** Record that `out` (for `capability`) already carries the calibration offset. */
function mark(device, capability, input, out) {
  if (typeof out !== 'number' || !Number.isFinite(out)) {return;}
  if (typeof input === 'number' && input === out) {return;} // offset 0 → nothing to protect
  const m = _marks(device);
  if (!m) {return;}
  m.delete(capability);
  m.set(capability, { out, t: Date.now() });
  while (m.size > MAX_MARKS) {m.delete(m.keys().next().value);}
}

/** True when `value` is the fresh output of a previous calibration (consumes the mark). */
function consume(device, capability, value) {
  const m = device && device.__calMarks instanceof Map ? device.__calMarks : null;
  if (!m || !m.has(capability)) {return false;}
  const e = m.get(capability);
  m.delete(capability);
  if (typeof value !== 'number' || !e) {return false;}
  return (Date.now() - e.t) <= TTL_MS && Math.abs(e.out - value) <= EPS;
}

/** Only measured values are calibrated — never setpoints (target_temperature / target_humidity). */
function isMeasuredTemperature(capability) {
  return typeof capability === 'string'
    && (capability === 'measure_temperature' || capability.startsWith('measure_temperature.'));
}

function isMeasuredHumidity(capability) {
  return typeof capability === 'string'
    && (capability === 'measure_humidity' || capability.startsWith('measure_humidity.'));
}

module.exports = { mark, consume, isMeasuredTemperature, isMeasuredHumidity, TTL_MS };
