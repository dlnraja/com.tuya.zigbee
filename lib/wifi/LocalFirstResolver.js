'use strict';

/**
 * LocalFirstResolver - v9.1.1
 * Local-first transport resolver for Tuya WiFi devices (tuya-local inspired).
 *
 * Pure decision logic, no I/O: given the device policy, credentials and
 * discovery state, decide which transport to use and explain WHY so the
 * caller can log a verbose, user-diagnosable decision line.
 *
 * Priority (tuya-local pattern):
 *   1. LAN (local TCP, tinytuya/TuyAPI protocol) - always preferred
 *   2. Cloud - only when LAN is impossible AND policy opted in (cloudFallback)
 *      AND cloud is not marked unhealthy/rate-limited
 *   3. None - device cannot be reached at all
 *
 * v9.1.1: When cloud auth/token endpoints are rate-limited or unhealthy,
 * refuse cloud transport/fallback so Homey keeps retrying LAN instead of
 * hammering cloud (avoids the common 30s cloud-timeout / re-login loop).
 */

const { normalizeWiFiConnectionPolicy, allowsCloudFallback } = require('./WiFiConnectionPolicy');
let normalizeLocalKey;
try {
  ({ normalizeLocalKey } = require('../tuya-local/UdpDiscoveryKeys'));
} catch (_e) {
  normalizeLocalKey = (k) => typeof k === 'string' ? k.replace(/["'\s]/g, '') : k;
}

const TRANSPORT_LAN = 'lan';
const TRANSPORT_CLOUD = 'cloud';
const TRANSPORT_NONE = 'none';

function isCloudUnhealthy(opts = {}) {
  return opts.cloudUnhealthy === true || opts.cloudRateLimited === true;
}

/**
 * Resolve the primary transport for a WiFi device.
 * @param {object} opts
 * @param {object} [opts.policy] - raw wifi_connection_policy store value
 * @param {string} [opts.deviceId] - Tuya device id
 * @param {string} [opts.localKey] - Tuya local key
 * @param {string} [opts.ip] - IP from device settings
 * @param {string} [opts.discoveredIp] - IP from UDP discovery cache
 * @param {boolean} [opts.hasCloudCredentials] - app-level cloud credentials present
 * @param {boolean} [opts.cloudRateLimited] - cloud token/API rate limit active
 * @param {boolean} [opts.cloudUnhealthy] - cloud auth/reachability degraded
 * @returns {{transport: string, ip: string|null, ipSource: string|null, reason: string}}
 */
function resolveWiFiTransport(opts = {}) {
  const policy = normalizeWiFiConnectionPolicy(opts.policy);
  const reasons = [];
  const rawId = opts.deviceId || opts.device_id || opts.id || '';
  const deviceId = typeof rawId === 'string' ? rawId.trim() : (rawId ? String(rawId) : '');
  const rawKey = opts.localKey || opts.local_key || opts.key || opts.device_key || '';
  const localKey = (typeof normalizeLocalKey === 'function' ? normalizeLocalKey(rawKey) : null) || (typeof rawKey === 'string' ? rawKey.trim() : '');
  const rawIp = opts.ip || opts.ip_address || opts.device_ip || opts.address || '';
  const ip = typeof rawIp === 'string' ? rawIp.trim() : null;
  const rawDiscIp = opts.discoveredIp || '';
  const discoveredIp = typeof rawDiscIp === 'string' ? rawDiscIp.trim() : null;
  const cloudSick = isCloudUnhealthy(opts);

  if (deviceId && localKey) {
    const ipSource = ip ? 'settings' : (discoveredIp ? 'udp-discovery' : null);
    reasons.push(`local credentials present (device_id=${deviceId})`);
    reasons.push(ipSource
      ? `IP known via ${ipSource}`
      : 'no IP cached yet: LAN scan (find()) will locate the device on connect');
    if (policy.strategy === 'local_first') {
      reasons.push('policy strategy=local_first: LAN preferred over cloud');
    }
    if (policy.localDiscovery) {
      reasons.push('localDiscovery=true: dynamic IP self-healing active');
    }
    if (cloudSick) {
      reasons.push('cloud unhealthy/rate-limited: keeping LAN-only path');
    }
    return { transport: TRANSPORT_LAN, ip: ip || discoveredIp || null, ipSource, reason: reasons.join('; ') };
  }

  reasons.push(`LAN impossible: ${!deviceId ? 'missing device_id' : 'missing local_key'}`);
  if (cloudSick) {
    reasons.push('cloud unhealthy/rate-limited: refusing cloud transport (stay offline until LAN credentials or cloud recovers)');
    return { transport: TRANSPORT_NONE, ip: null, ipSource: null, reason: reasons.join('; ') };
  }
  if (allowsCloudFallback(policy) && opts.hasCloudCredentials) {
    reasons.push('policy cloudFallback=true and cloud credentials present: cloud allowed as fallback');
    return { transport: TRANSPORT_CLOUD, ip: null, ipSource: null, reason: reasons.join('; ') };
  }
  reasons.push(allowsCloudFallback(policy)
    ? 'policy cloudFallback=true but cloud credentials missing in app settings'
    : 'policy cloudFallback=false (local-first default): cloud fallback disabled');
  return { transport: TRANSPORT_NONE, ip: null, ipSource: null, reason: reasons.join('; ') };
}

/**
 * Decide what to do when the LAN connection window is exhausted
 * (device unreachable locally after all retries).
 * @param {object} opts
 * @param {object} [opts.policy] - raw wifi_connection_policy store value
 * @param {boolean} [opts.hasCloudCredentials] - app-level cloud credentials present
 * @param {boolean} [opts.cloudRateLimited] - cloud token/API rate limit active
 * @param {boolean} [opts.cloudUnhealthy] - cloud auth/reachability degraded
 * @returns {{action: 'cloud_status'|'stay_local', reason: string}}
 */
function resolveLanFailureAction(opts = {}) {
  const policy = normalizeWiFiConnectionPolicy(opts.policy);
  if (isCloudUnhealthy(opts)) {
    return {
      action: 'stay_local',
      reason: 'LAN unreachable + cloud unhealthy/rate-limited: staying local, LAN retry scheduled (skip cloud status query)',
    };
  }
  if (allowsCloudFallback(policy)) {
    if (opts.hasCloudCredentials) {
      return {
        action: 'cloud_status',
        reason: 'LAN unreachable + policy cloudFallback=true + cloud credentials present: ' +
          'querying cloud for a diagnostic status snapshot (control stays local)',
      };
    }
    return {
      action: 'stay_local',
      reason: 'LAN unreachable + policy cloudFallback=true but cloud credentials missing: staying local, LAN retry scheduled',
    };
  }
  return {
    action: 'stay_local',
    reason: 'LAN unreachable + policy cloudFallback=false (local-first default): no cloud fallback, LAN retry scheduled',
  };
}

module.exports = {
  TRANSPORT_LAN,
  TRANSPORT_CLOUD,
  TRANSPORT_NONE,
  resolveWiFiTransport,
  resolveLanFailureAction,
};
