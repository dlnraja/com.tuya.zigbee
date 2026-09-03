'use strict';

/**
 * TuyaKeyTypes.js (P2408)
 * Document + normalize all Tuya WiFi credential shapes used on Homey.
 *
 * Key types (community: TinyTuya / tuya-local / LocalTuya / tuyapi):
 *   local_key     — 16-byte device LAN key (ascii or hex32 paste)
 *   device_key    — alias of local_key in some Homey settings schemas
 *   uuid          — cloud UUID (pairing only; not used as AES key)
 *   gateway_key   — parent gateway local_key for Zigbee-over-WiFi bridge (cid)
 *   udp_broadcast — well-known MD5("yGAdlopoPVldABfn") for discovery only
 *
 * Protocol versions (LAN TCP): 3.1 → 3.5 (see PROTOCOL_VERSIONS).
 */

const {
  normalizeLocalKey,
  PROTOCOL_VERSIONS,
  buildProtocolFallbackChain,
  guessProtocolFromDiscovery,
  UDP_KEY_STRING,
  UDP_KEY_MD5,
} = require('./UdpDiscoveryKeys');

const KEY_TYPES = Object.freeze({
  LOCAL_KEY: 'local_key',
  DEVICE_KEY: 'device_key',
  UUID: 'uuid',
  GATEWAY_KEY: 'gateway_key',
  UDP_BROADCAST: 'udp_broadcast',
});

/**
 * Resolve the best LAN crypto key from Homey device settings / store.
 */
function resolveDeviceLanKey(settings = {}) {
  const raw = settings.local_key || settings.device_key || settings.key || null;
  return normalizeLocalKey(raw) || raw || null;
}

/**
 * Describe key format for diagnostics (never log the key itself).
 */
function describeKeyShape(raw) {
  if (raw == null || raw === '') return { present: false };
  const s = String(raw).trim();
  if (/^[0-9a-fA-F]{32}$/.test(s.replace(/[\s"']/g, ''))) {
    return { present: true, format: 'hex32', normalizedLength: 16 };
  }
  const n = normalizeLocalKey(s);
  return {
    present: true,
    format: n && n.length === 16 ? 'ascii16' : 'other',
    length: s.length,
    normalizedLength: n ? n.length : 0,
  };
}

module.exports = {
  KEY_TYPES,
  PROTOCOL_VERSIONS,
  UDP_KEY_STRING,
  UDP_BROADCAST_KEY_MD5: UDP_KEY_MD5,
  normalizeLocalKey,
  resolveDeviceLanKey,
  describeKeyShape,
  buildProtocolFallbackChain,
  guessProtocolFromDiscovery,
};
