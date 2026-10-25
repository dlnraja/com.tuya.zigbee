'use strict';

/**
 * WHY(P3037b / forum 157537, Device Watchdog by Rick_D, v1.9.49-v1.9.51): a monitoring app must not
 * raise "device lost" alerts while Homey is still starting (routers and sleepy end devices need minutes
 * to report back), and must not repeat the same alert for the same device. Our
 * TuyaZigbeeDevice._notifyPairingFailure() had neither: after a Homey reboot or a mesh hiccup every
 * device past its retry budget posted one timeline entry per offline event.
 *
 * Pure decision helper (no Homey import) so it can be unit-tested.
 */
const MODULE_LOADED_AT = Date.now();
const STARTUP_GRACE_MS = 10 * 60 * 1000; // 10 min after the app process starts
const REPEAT_WINDOW_MS = 24 * 60 * 60 * 1000; // at most one notice per device per 24 h

function shouldSendReconnectNotice({ now = Date.now(), startedAt = MODULE_LOADED_AT, lastNoticeAt = 0 } = {}) {
  if (!Number.isFinite(now)) {return { send: false, reason: 'bad-clock' };}
  if (now - startedAt < STARTUP_GRACE_MS) {return { send: false, reason: 'startup-grace' };}
  const last = Number(lastNoticeAt) || 0;
  if (last > 0 && now - last < REPEAT_WINDOW_MS) {return { send: false, reason: 'already-notified' };}
  return { send: true, reason: 'ok' };
}

module.exports = { shouldSendReconnectNotice, STARTUP_GRACE_MS, REPEAT_WINDOW_MS, MODULE_LOADED_AT };
