'use strict';

/**
 * P2770 — generic trigger guards (additive, non-blocking).
 *
 * 1) Init "changed" guard: right after app/device init, the first value a
 *    device reports for a "*_changed" trigger only sets the baseline; it must
 *    not fire the Flow (a restart is not a change). Later values fire normally.
 *    Lead: forum reports of "changed" flows firing on every app restart
 *    (see docs/automation/leads-other-apps.md, L-INIT-CHANGED).
 *
 * 2) Availability grace: "became unavailable" is delayed by a short grace
 *    period; if the device comes back inside the grace, neither the
 *    unavailable nor the back-online trigger fires (avoids night spam on
 *    brief radio drops). Lead: L-OFFLINE-GRACE.
 */

const DEFAULT_INIT_WINDOW_MS = 45 * 1000;
const DEFAULT_AVAILABILITY_GRACE_S = 120;
const MAX_AVAILABILITY_GRACE_S = 3600;

function isChangedCard(cardId) {
  return typeof cardId === 'string' && /_changed$/i.test(cardId);
}

/** Record the init moment on a device (idempotent per init). */
function markInit(device, now = Date.now()) {
  if (!device) {return;}
  try {
    device._p2768InitAt = now;
    device._p2768Baseline = new Set();
  } catch (_e) { /* non-critical */ }
}

/**
 * @returns {boolean} true when the trigger should be skipped because it is the
 * first "*_changed" value after init (baseline only).
 */
function shouldSuppressChanged(device, cardId, now = Date.now(), windowMs = DEFAULT_INIT_WINDOW_MS) {
  try {
    if (!device || !isChangedCard(cardId)) {return false;}
    const at = device._p2768InitAt;
    if (typeof at !== 'number') {return false;}
    if (now - at > windowMs) {return false;}
    if (!(device._p2768Baseline instanceof Set)) {device._p2768Baseline = new Set();}
    const key = String(cardId).toLowerCase();
    if (device._p2768Baseline.has(key)) {return false;}
    device._p2768Baseline.add(key);
    return true;
  } catch (_e) {
    return false;
  }
}

/** Resolve the availability grace (seconds → ms) from an app setting value. */
function resolveAvailabilityGraceMs(value) {
  if (value === undefined || value === null || value === '') {return DEFAULT_AVAILABILITY_GRACE_S * 1000;}
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {return DEFAULT_AVAILABILITY_GRACE_S * 1000;}
  return Math.min(n, MAX_AVAILABILITY_GRACE_S) * 1000;
}

/**
 * P2774 — route direct `getDeviceTriggerCard(id).trigger(device, …)` calls (lib + drivers)
 * through the same post-init baseline guard. Wraps the card's trigger() once; additive and
 * soft: any error falls back to the original trigger. Devices that never called markInit()
 * (e.g. WiFi devices) are unaffected.
 */
function wrapTriggerCard(card, cardId) {
  try {
    if (!card || card.__flowGuardNoop || card.__p2774Guarded || typeof card.trigger !== 'function') {return card;}
    const orig = card.trigger;
    const id = (typeof card.id === 'string' && card.id) || cardId;
    card.trigger = function guardedTrigger(device, ...rest) {
      try {
        if (device && typeof device === 'object' && shouldSuppressChanged(device, id)) {
          return Promise.resolve(false);
        }
      } catch (_e) { /* soft */ }
      return orig.call(this, device, ...rest);
    };
    card.__p2774Guarded = true;
  } catch (_e) { /* frozen card: leave untouched */ }
  return card;
}

function installTriggerCardGuard(flow) {
  try {
    if (!flow || typeof flow.getDeviceTriggerCard !== 'function') {return false;}
    const current = flow.getDeviceTriggerCard;
    if (current.__p2774Guarded) {return true;}
    const wrapped = function (...args) {
      const card = current.apply(flow, args);
      return wrapTriggerCard(card, args[0]);
    };
    Object.keys(current).forEach((k) => { try { wrapped[k] = current[k]; } catch (_e) { /* soft */ } });
    wrapped.__p2774Guarded = true;
    flow.getDeviceTriggerCard = wrapped;
    return true;
  } catch (_e) {
    return false;
  }
}

module.exports = {
  wrapTriggerCard,
  installTriggerCardGuard,
  DEFAULT_INIT_WINDOW_MS,
  DEFAULT_AVAILABILITY_GRACE_S,
  MAX_AVAILABILITY_GRACE_S,
  isChangedCard,
  markInit,
  shouldSuppressChanged,
  resolveAvailabilityGraceMs,
};
