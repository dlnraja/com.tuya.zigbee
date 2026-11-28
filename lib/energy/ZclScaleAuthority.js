'use strict';

/**
 * ZclScaleAuthority - P3400 (issue #559, _TZ3210_w0qqde0g / TS011F, Haozee HT-SP-ZB-01).
 *
 * WHY: a TS011F plug reports 0x0B04 rmsVoltage in plain volts (interview: 241), activePower in W and
 * rmsCurrent in mA, and 0x0702 currentSummationDelivered in 1/100 kWh (zhc tuya.ts: seMetering
 * divisor 100, haElectricalMeasurement divisors absent -> 1). Besides the device's own listeners the
 * app still has several generic ZCL writers with hardcoded divisors (hybrid mode /10, universal
 * energy handler TS011F quirk voltage x0.1, raw-cluster fallback, dynamic capability manager). They
 * all write the same report and the last one wins, which showed 22.3 V and ~0 W / ~0 A.
 *
 * This authority sees every raw attribute report first (prependListener), computes the one correct
 * value with the device's own zclEnergyDivisors (the exact-couple override) and
 *   1) writes it itself (so the right value always lands),
 *   2) replaces any other writer's value for the same capability inside the same report window.
 * A plausibility fallback also lifts a mains voltage that is below 50 V by x10 when no report is cached.
 * Pure helpers are exported for tests. No re-pair needed, nothing is removed.
 */

const WINDOW_MS = 2500;
const ATTRS = {
  activePower: 'measure_power',
  rmsVoltage: 'measure_voltage',
  rmsCurrent: 'measure_current',
  currentSummationDelivered: 'meter_power',
};

function rawNumber(value) {
  if (value === null || value === undefined) { return null; }
  if (Buffer.isBuffer(value)) { try { return value.readUIntBE(0, Math.min(6, value.length)); } catch (_e) { return null; } }
  if (Array.isArray(value)) { return rawNumber(value.length > 1 && value[0] === 0 ? value[1] : value[0]); }
  if (typeof value === 'object') { return rawNumber(value.value ?? value.raw ?? null); }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** authoritative display value for one raw ZCL report */
function scaleRaw(capability, raw, divisors) {
  const n = rawNumber(raw);
  if (n === null || !divisors) { return null; }
  const key = { measure_power: 'power', measure_voltage: 'voltage', measure_current: 'current', meter_power: 'energy' }[capability];
  const div = Number(divisors[key]);
  if (!key || !Number.isFinite(div) || div <= 0) { return null; }
  const v = n / div;
  if (capability === 'measure_power') { return Math.max(0, v); }
  if (capability === 'measure_voltage' && (v < 50 || v > 300)) { return null; }
  if (capability === 'measure_current' && (v < 0 || v > 100)) { return null; }
  return v;
}

/** mains voltage plausibility: repairs both /10 mistakes (9..30 V) and x10 mistakes (900..3000 V) */
function repairVoltage(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) { return value; }
  if (v < 50) {
    const x = v * 10;
    return x >= 90 && x <= 300 ? Number(x.toFixed(1)) : value;
  }
  if (v > 300) {
    const d = v / 10;
    return d >= 90 && d <= 300 ? Number(d.toFixed(1)) : value;
  }
  return value;
}

class ZclScaleAuthority {
  constructor(device, now = () => Date.now()) {
    this.device = device;
    this.now = now;
    this.last = {};
    this._writing = false;
    this._attached = false;
  }

  _clusters(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    const c = ep?.clusters || {};
    return {
      elec: c.haElectricalMeasurement || c.electricalMeasurement || c[0x0B04] || c[2820] || null,
      meter: c.seMetering || c.metering || c[0x0702] || c[1794] || null,
    };
  }

  attach(zclNode) {
    if (this._attached) { return false; }
    const { elec, meter } = this._clusters(zclNode);
    let n = 0;
    const hook = (cluster, attr) => {
      if (!cluster || typeof cluster.on !== 'function') { return; }
      const fn = (value) => this.onReport(attr, value);
      // prepend: the cache must be filled before the other (wrong-scale) writers run
      (typeof cluster.prependListener === 'function' ? cluster.prependListener : cluster.on).call(cluster, `attr.${attr}`, fn);
      n += 1;
    };
    for (const attr of ['activePower', 'rmsVoltage', 'rmsCurrent']) { hook(elec, attr); }
    hook(meter, 'currentSummationDelivered');
    this._attached = n > 0;
    return this._attached;
  }

  onReport(attr, value) {
    const capability = ATTRS[attr];
    if (!capability) { return null; }
    const dev = this.device;
    let divisors = null;
    try { divisors = dev.zclEnergyDivisors; } catch (_e) { divisors = null; }
    const scaled = scaleRaw(capability, value, divisors);
    if (scaled === null) { return null; }
    this.last[capability] = { value: scaled, at: this.now() };
    if (typeof dev.hasCapability === 'function' && !dev.hasCapability(capability)) { return scaled; }
    this._writing = true;
    try {
      const p = dev.safeSetCapabilityValue(capability, scaled);
      if (p && typeof p.catch === 'function') { p.catch(() => {}); }
    } catch (_e) { /* soft */ } finally { this._writing = false; }
    return scaled;
  }

  /** called by the device's safeSetCapabilityValue for every write */
  correct(capability, value) {
    if (this._writing || typeof value !== 'number') { return value; }
    const rec = this.last[capability];
    if (rec && this.now() - rec.at <= WINDOW_MS) {
      const tol = Math.max(Math.abs(rec.value) * 0.02, 1e-9);
      return Math.abs(value - rec.value) <= tol ? value : rec.value;
    }
    return capability === 'measure_voltage' ? repairVoltage(value) : value;
  }
}

module.exports = { ZclScaleAuthority, scaleRaw, repairVoltage, rawNumber, WINDOW_MS };
