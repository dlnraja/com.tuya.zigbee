'use strict';

/**
 * Process-local cloud health signals for local-first WiFi decisions.
 * Avoids hammering Tuya cloud token/API endpoints when rate-limited
 * (common failure mode: devices appear dead until app restart).
 */

const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000;

let rateLimitedUntil = 0;
let lastReason = null;

function markCloudRateLimited(opts = {}) {
  const ms = Number.isFinite(opts.cooldownMs) ? opts.cooldownMs : DEFAULT_COOLDOWN_MS;
  rateLimitedUntil = Date.now() + Math.max(60_000, ms);
  lastReason = opts.reason || 'rate_limited';
  return rateLimitedUntil;
}

function clearCloudRateLimited() {
  rateLimitedUntil = 0;
  lastReason = null;
}

function isCloudRateLimited() {
  return Date.now() < rateLimitedUntil;
}

function getCloudHealthSnapshot() {
  return {
    cloudRateLimited: isCloudRateLimited(),
    cloudUnhealthy: isCloudRateLimited(),
    rateLimitedUntil: rateLimitedUntil || null,
    reason: lastReason,
  };
}

/** Detect common Tuya/cloud rate-limit / auth-throttle shapes. */
function looksLikeCloudRateLimit(errOrRes) {
  if (!errOrRes) return false;
  const code = errOrRes.code != null ? String(errOrRes.code) : '';
  const status = errOrRes.statusCode != null ? String(errOrRes.statusCode) : '';
  const msg = String(errOrRes.message || errOrRes.msg || errOrRes.error || '').toLowerCase();
  if (code === '429' || status === '429') return true;
  if (/rate.?limit|too many request|quota|throttl|token.*(limit|exhaust)/i.test(msg)) return true;
  // Tuya-ish business codes sometimes used for frequency limits
  if (code === '28841002' || code === '28841001') return true;
  return false;
}

module.exports = {
  DEFAULT_COOLDOWN_MS,
  markCloudRateLimited,
  clearCloudRateLimited,
  isCloudRateLimited,
  getCloudHealthSnapshot,
  looksLikeCloudRateLimit,
};
