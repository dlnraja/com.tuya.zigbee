'use strict';

/**
 * ReportingPlan — sensible configureReporting defaults per capability, and a
 * bounded polling fallback ONLY for attributes whose reporting config failed.
 * Intervals follow the conservative values used by zigbee-herdsman's
 * reporting presets and ZHA's REPORT_CONFIG_* (rewritten, not copied).
 */

const DEFAULTS = {
  onoff: { cluster: 'onOff', attr: 'onOff', min: 0, max: 3600, change: 0 },
  dim: { cluster: 'levelControl', attr: 'currentLevel', min: 1, max: 3600, change: 1 },
  measure_temperature: { cluster: 'temperatureMeasurement', attr: 'measuredValue', min: 30, max: 3600, change: 10 },
  measure_humidity: { cluster: 'relativeHumidity', attr: 'measuredValue', min: 30, max: 3600, change: 100 },
  measure_luminance: { cluster: 'illuminanceMeasurement', attr: 'measuredValue', min: 10, max: 3600, change: 500 },
  measure_battery: { cluster: 'powerConfiguration', attr: 'batteryPercentageRemaining', min: 3600, max: 43200, change: 2 },
  measure_power: { cluster: 'electricalMeasurement', attr: 'activePower', min: 5, max: 900, change: 5 },
  measure_voltage: { cluster: 'electricalMeasurement', attr: 'rmsVoltage', min: 30, max: 900, change: 2 },
  measure_current: { cluster: 'electricalMeasurement', attr: 'rmsCurrent', min: 5, max: 900, change: 10 },
  meter_power: { cluster: 'metering', attr: 'currentSummationDelivered', min: 60, max: 3600, change: 1 },
  windowcoverings_set: { cluster: 'windowCovering', attr: 'currentPositionLiftPercentage', min: 1, max: 3600, change: 1 },
  target_temperature: { cluster: 'thermostat', attr: 'occupiedHeatingSetpoint', min: 1, max: 3600, change: 10 },
};

const MAX_POLLERS = 4;
const MIN_POLL_MS = 5 * 60 * 1000;

function planFor(capabilities = [], available = () => true) {
  const out = [];
  for (const cap of capabilities) {
    const d = DEFAULTS[String(cap).split('.')[0]];
    if (d && available(d.cluster)) out.push(Object.assign({ capability: cap }, d));
  }
  return out;
}

class ReportingManager {
  constructor({ setInterval: si = setInterval, clearInterval: ci = clearInterval, log } = {}) {
    this._si = si; this._ci = ci; this._log = log; this._pollers = new Map();
  }

  /** Configure each entry; on failure register a bounded poller. */
  async apply(endpoint, entries, { pollMs = MIN_POLL_MS } = {}) {
    const res = { configured: [], polled: [], dropped: [] };
    for (const e of entries) {
      const c = endpoint && endpoint.clusters && endpoint.clusters[e.cluster];
      if (!c) { res.dropped.push(e.capability); continue; }
      try {
        await c.configureReporting({ [e.attr]: { minInterval: e.min, maxInterval: e.max, minChange: e.change } });
        res.configured.push(e.capability);
      } catch (err) {
        if (this._pollers.size >= MAX_POLLERS) { res.dropped.push(e.capability); continue; }
        const key = `${e.cluster}.${e.attr}`;
        if (!this._pollers.has(key)) {
          const t = this._si(() => { c.readAttributes([e.attr]).catch(() => {}); }, Math.max(MIN_POLL_MS, pollMs));
          if (t && typeof t.unref === 'function') t.unref();
          this._pollers.set(key, t);
        }
        res.polled.push(e.capability);
      }
    }
    return res;
  }

  /** A report arrived: reporting works after all, stop polling that attribute. */
  onReport(cluster, attr) {
    const key = `${cluster}.${attr}`; const t = this._pollers.get(key);
    if (t) { this._ci(t); this._pollers.delete(key); }
  }

  destroy() { for (const t of this._pollers.values()) this._ci(t); this._pollers.clear(); }
  get pollerCount() { return this._pollers.size; }
}

module.exports = { DEFAULTS, planFor, ReportingManager, MAX_POLLERS, MIN_POLL_MS };
