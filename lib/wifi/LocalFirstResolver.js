'use strict';

/**
 * LocalFirstResolver - v9.1.0
 * Local-first transport resolver for Tuya WiFi devices (tuya-local inspired).
 *
 * Pure decision logic, no I/O: given the device policy, credentials and
 * discovery state, decide which transport to use and explain WHY so the
 * caller can log a verbose, user-diagnosable decision line.
 *
 * Priority (tuya-local pattern):
 *   1. LAN (local TCP, tinytuya/TuyAPI protocol) - always preferred
 *   2. Cloud - only when LAN is impossible AND policy opted in (cloudFallback)
 *   3. None - device cannot be reached at all
 */

const { normalizeWiFiConnectionPolicy, allowsCloudFallback } = require('./WiFiConnectionPolicy');

const TRANSPORT_LAN = 'lan';
const TRANSPORT_CLOUD = 'cloud';
const TRANSPORT_NONE = 'none';

/**
 * Resolve the primary transport for a WiFi device.
 * @param {object} opts
 * @param {object} [opts.policy] - raw wifi_connection_policy store value
 * @param {string} [opts.deviceId] - Tuya device id
 * @param {string} [opts.localKey] - Tuya local key
 * @param {string} [opts.ip] - IP from device settings
 * @param {string} [opts.discoveredIp] - IP from UDP discovery cache
 * @param {boolean} [opts.hasCloudCredentials] - app-level cloud credentials present
 * @returns {{transport: string, ip: string|null, ipSource: string|null, reason: string}}
 */
function resolveWiFiTransport(opts = {}) {
  const policy = normalizeWiFiConnectionPolicy(opts.policy);
  const reasons = [];
  const { deviceId, localKey, ip, discoveredIp } = opts;

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
    return { transport: TRANSPORT_LAN, ip: ip || discoveredIp || null, ipSource, reason: reasons.join('; ') };
  }

  reasons.push(`LAN impossible: ${!deviceId ? 'missing device_id' : 'missing local_key'}`);
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
 * @returns {{action: 'cloud_status'|'stay_local', reason: string}}
 */
function resolveLanFailureAction(opts = {}) {
  const policy = normalizeWiFiConnectionPolicy(opts.policy);
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
