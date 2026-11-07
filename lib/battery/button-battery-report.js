'use strict';

/**
 * A tile percent is a report only when a sample path stored both a time and
 * last_battery_from_report. A displayed 100 with neither is not fresh.
 * maxAgeMs matches the 24h battery-report setting: the setting is not itself
 * proof that the radio sent anything.
 */
function batteryTileReportIsFresh(capabilityValue, reportAt, now = Date.now(), maxAgeMs = 24 * 60 * 60 * 1000) {
  const pct = Number(capabilityValue);
  const ts = Number(reportAt);
  if (!(pct > 0) || !(ts > 0)) {return false;}
  return (now - ts) < maxAgeMs;
}

/** Paint a stored percent only after a sample path set the flag. */
function storedBatteryMayRestore(stored, fromReport) {
  const n = Number(stored);
  return fromReport === true && Number.isFinite(n) && n > 0 && n <= 100;
}

module.exports = { batteryTileReportIsFresh, storedBatteryMayRestore };
