'use strict';

/**
 * availability-learning — P3028 (master soak)
 *
 * Small pure helpers used by DeviceAvailabilityManager to learn how often each
 * device really talks, so that a sleepy sensor or a remote is not reported
 * "unavailable" just because it is quiet by nature.
 *
 * Ideas credited (rewritten, no code copied — SHS is a separate Homey app):
 *   Rick_D, "[APP][Pro][SHS] Device Watchdog"
 *   https://community.homey.app/t/157537
 *   - learned reporting interval / longest gap per device, used to raise the
 *     stale threshold after a minimum observation time
 *     (post ids 781378, 781761, 783688 — SHS v1.9.37–1.9.41 + #130)
 *   - buttons / remotes only talk when pressed → not "stale" by silence
 *     (post ids 773003, 772612)
 *   - flapping devices + "many devices dropped at once" hint
 *     (post ids 760791, 760906)
 *   - a months-old battery reading means "device went quiet", not "battery low"
 *     (post id 773565)
 *
 * Differences with SHS on purpose:
 *   - we learn from every incoming Zigbee frame (frame-level last seen), not
 *     from capability timestamps, so a battery-only report still counts and a
 *     frozen sensor is still visible;
 *   - learning only ever RAISES the timeout (raise-only) and is capped, so it
 *     can never make a device look offline sooner than today;
 *   - memory per device is 6 numbers, no arrays that grow, no timers.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const GAP_MIN_MS = 60 * 1000;            // ignore bursts (attribute dumps)
const MIN_SAMPLES = 5;                   // SHS waits for several reports too
const MIN_OBSERVATION_MS = 48 * HOUR_MS; // learn for 2 days before trusting it
const WINDOW_MS = 7 * DAY_MS;            // two rolling windows → an old outlier fades after 14 d
const MARGIN = 1.5;                      // longest normal gap × 1.5
const MAX_LEARNED_TIMEOUT_MS = 7 * DAY_MS;
const MEAN_CAP_N = 50;                   // running mean behaves like an EMA after 50 samples
const FLAP_WINDOW_MS = 6 * HOUR_MS;
const FLAP_MIN_EVENTS = 3;
const FLAP_RING = 4;                     // bounded ring of unavailable timestamps
const MASS_OUTAGE_MIN = 3;
const MASS_OUTAGE_RATIO = 0.3;
const BATTERY_READING_OLD_MS = 7 * DAY_MS;

const EVENT_ONLY_CLASSES = new Set(['button', 'remote']);
const EVENT_ONLY_CAP_RX = /^(button(\..+)?|measure_battery|alarm_battery|tuya_battery_low|measure_voltage|battery_.+)$/;

function emptyStats(now) {
  return { n: 0, mean: 0, maxCur: 0, maxPrev: 0, winStart: now, since: now };
}

/** Accept a persisted object only when every field is a sane number. */
function restoreStats(raw, now) {
  if (!raw || typeof raw !== 'object') {return emptyStats(now);}
  const nums = ['n', 'mean', 'maxCur', 'maxPrev', 'winStart', 'since'];
  for (const k of nums) {
    const v = Number(raw[k]);
    if (!Number.isFinite(v) || v < 0) {return emptyStats(now);}
  }
  if (raw.since > now + 5000 || raw.winStart > now + 5000) {return emptyStats(now);}
  return {
    n: Math.min(Math.floor(raw.n), 1e6),
    mean: Number(raw.mean),
    maxCur: Math.min(Number(raw.maxCur), 30 * DAY_MS),
    maxPrev: Math.min(Number(raw.maxPrev), 30 * DAY_MS),
    winStart: Number(raw.winStart),
    since: Number(raw.since),
  };
}

/**
 * Record one gap between two frames. Mutates and returns `stats`.
 * Gaps under a minute are bursts and say nothing about the reporting rhythm.
 */
function noteGap(stats, gapMs, now) {
  if (!stats || !Number.isFinite(gapMs) || gapMs < GAP_MIN_MS) {return stats;}
  if (now - stats.winStart >= WINDOW_MS) {
    stats.maxPrev = stats.maxCur;
    stats.maxCur = 0;
    stats.winStart = now;
  }
  stats.n = Math.min(stats.n + 1, 1e6);
  const k = Math.min(stats.n, MEAN_CAP_N);
  stats.mean += (gapMs - stats.mean) / k;
  if (gapMs > stats.maxCur) {stats.maxCur = gapMs;}
  return stats;
}

/** Learned silence timeout in ms, or null while still learning. */
function learnedTimeoutMs(stats, now) {
  if (!stats || stats.n < MIN_SAMPLES) {return null;}
  if (now - stats.since < MIN_OBSERVATION_MS) {return null;}
  const basis = Math.max(stats.maxCur, stats.maxPrev, stats.mean);
  if (!(basis > 0)) {return null;}
  return Math.min(Math.ceil(basis * MARGIN), MAX_LEARNED_TIMEOUT_MS);
}

/**
 * Raise-only merge with the fixed base timeout.
 * eventOnly devices (buttons / remotes) have no silence timeout until learned.
 */
function effectiveTimeoutMs({ baseMs, stats, eventOnly, now }) {
  const learned = learnedTimeoutMs(stats, now);
  if (eventOnly && learned == null) {return Infinity;}
  if (learned == null) {return baseMs;}
  return Math.min(Math.max(baseMs, learned), Math.max(baseMs, MAX_LEARNED_TIMEOUT_MS));
}

/**
 * A battery device that only talks on a press: driver class button/remote, or
 * nothing but button.* + battery capabilities.
 */
function isEventOnlyDevice(device, isBattery) {
  if (!isBattery || !device) {return false;}
  try {
    const cls = typeof device.getClass === 'function' ? device.getClass() : device.class;
    if (cls && EVENT_ONLY_CLASSES.has(String(cls))) {return true;}
    const caps = (device.getCapabilities && device.getCapabilities()) || [];
    if (!caps.some((c) => /^button(\.|$)/.test(c))) {return false;}
    return caps.every((c) => EVENT_ONLY_CAP_RX.test(c));
  } catch (_e) {
    return false;
  }
}

/** Push an unavailable timestamp into a bounded ring; returns the ring. */
function noteFlap(ring, now) {
  const out = Array.isArray(ring) ? ring : [];
  out.push(now);
  while (out.length > FLAP_RING) {out.shift();}
  return out;
}

function isFlapping(ring, now) {
  if (!Array.isArray(ring)) {return false;}
  let n = 0;
  for (const t of ring) {if (now - t <= FLAP_WINDOW_MS) {n++;}}
  return n >= FLAP_MIN_EVENTS;
}

/** Many devices dropping in the same pass is a hub / mesh event, not N dead devices. */
function isMassOutage(droppedCount, eligibleCount) {
  if (droppedCount < MASS_OUTAGE_MIN) {return false;}
  return droppedCount >= Math.max(MASS_OUTAGE_MIN, Math.ceil(eligibleCount * MASS_OUTAGE_RATIO));
}

/**
 * One short advice code per snapshot row (settings page / diagnostics).
 * Codes only — the UI owns the wording and the language.
 */
function adviseFor(row, now) {
  if (!row) {return null;}
  if (row.flapping) {return 'flapping_check_signal';}
  if (row.unavailable && row.massOutage) {return 'mass_outage_check_hub';}
  if (row.isBattery && row.batteryAt > 0 && now - row.batteryAt > BATTERY_READING_OLD_MS) {
    return row.unavailable ? 'battery_reading_old_device_quiet' : 'battery_reading_old';
  }
  if (row.eventOnly && !row.learned) {return 'event_only_not_monitored';}
  if (row.learned && row.baseTimeoutMs && row.timeoutMs > row.baseTimeoutMs) {return 'learned_longer_interval';}
  return null;
}

module.exports = {
  GAP_MIN_MS,
  MIN_SAMPLES,
  MIN_OBSERVATION_MS,
  WINDOW_MS,
  MARGIN,
  MAX_LEARNED_TIMEOUT_MS,
  FLAP_RING,
  BATTERY_READING_OLD_MS,
  emptyStats,
  restoreStats,
  noteGap,
  learnedTimeoutMs,
  effectiveTimeoutMs,
  isEventOnlyDevice,
  noteFlap,
  isFlapping,
  isMassOutage,
  adviseFor,
};
