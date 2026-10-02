'use strict';

/**
 * TuyaReconnectPolicy — pure helpers for LAN reconnect pacing and
 * sleepy-device availability. Behaviour notes: docs/automation/localtuya-study.md.
 *
 * Idea: retry quickly (steady base interval) while an outage is fresh, since
 * most drops are Wi-Fi blips; once a device has been gone for a while, back
 * off so a powered-off device does not keep the event loop and the router busy.
 * A small random jitter avoids every device on a rebooted router reconnecting
 * in the same instant.
 */

const DEFAULTS = Object.freeze({
  baseMs: 5000,
  growth: 1.5,
  maxMs: 60000,
  steadyWindowMs: 0, // 0 = grow from the first retry (legacy client behaviour)
  longOutageMs: 5 * 60 * 1000,
  longOutageGrowth: 2,
  jitterRatio: 0.1,
});

/**
 * Compute the next reconnect delay.
 * @param {object} p
 * @param {number} p.attempt        1-based retry counter for the current outage
 * @param {number} [p.offlineForMs] how long the device has been unreachable
 * @param {function} [p.random]     injectable RNG (tests)
 * @returns {number} delay in ms (integer, >= 250)
 */
function computeReconnectDelay({ attempt = 1, offlineForMs = 0, random = Math.random, ...opts } = {}) {
  const o = { ...DEFAULTS, ...opts };
  const n = Math.max(1, Math.floor(Number(attempt) || 1));
  let delay;
  if (o.steadyWindowMs > 0 && offlineForMs < o.steadyWindowMs) {
    delay = o.baseMs;
  } else {
    delay = o.baseMs * Math.pow(o.growth, n - 1);
    if (offlineForMs >= o.longOutageMs) {
      delay = Math.max(delay, o.baseMs * o.longOutageGrowth);
    }
  }
  delay = Math.min(delay, o.maxMs);
  if (o.jitterRatio > 0) {
    const r = typeof random === 'function' ? random() : 0.5;
    delay += (r * 2 - 1) * o.jitterRatio * delay;
  }
  return Math.max(250, Math.round(Math.min(delay, o.maxMs * (1 + o.jitterRatio))));
}

/**
 * Sleepy (battery Wi-Fi) devices disconnect between reports by design.
 * Returns true while we are still inside the configured sleep window since
 * the last report, i.e. the device should NOT be flagged unavailable yet.
 */
function isWithinSleepGrace(lastSeenMs, sleepWindowMs, nowMs = Date.now()) {
  const last = Number(lastSeenMs);
  const win = Number(sleepWindowMs);
  if (!Number.isFinite(last) || last <= 0 || !Number.isFinite(win) || win <= 0) {return false;}
  return nowMs - last < win;
}

/**
 * Heartbeat health: declare the link dead after `maxMissed` consecutive
 * unanswered heartbeats (default 2, i.e. ~2 intervals of silence).
 */
function isHeartbeatDead(missedCount, maxMissed = 2) {
  return Number(missedCount) >= Math.max(1, Number(maxMissed) || 2);
}

module.exports = { DEFAULTS, computeReconnectDelay, isWithinSleepGrace, isHeartbeatDead };
