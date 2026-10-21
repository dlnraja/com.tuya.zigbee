'use strict';
/** P-KB2 availability (idea from Z2M availability feature: active vs passive timeouts). Pure. */
const DEFAULTS = { mainsMs: 10 * 60 * 1000, batteryMs: 25 * 60 * 60 * 1000 };
function isAvailable({ lastSeen, mains, now = Date.now(), mainsMs = DEFAULTS.mainsMs, batteryMs = DEFAULTS.batteryMs }) {
  if (!lastSeen) return true; // never judge before the first message (boot grace)
  return now - lastSeen <= (mains ? mainsMs : batteryMs);
}
/** Mains devices may be pinged (read Basic attr) once per window, never sleepy ones. */
function shouldPing({ lastSeen, lastPing = 0, mains, now = Date.now(), mainsMs = DEFAULTS.mainsMs }) {
  return !!mains && now - (lastSeen || 0) > mainsMs / 2 && now - lastPing > mainsMs / 2;
}
module.exports = { isAvailable, shouldPing, DEFAULTS };
