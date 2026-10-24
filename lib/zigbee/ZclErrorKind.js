'use strict';

/**
 * P3011: ZclErrorKind — one classifier for every "this did not work" outcome of a Zigbee op.
 *
 * WHY: errors reach us in many shapes and the app used to treat them all alike (retry
 * forever, or log at error level). Shapes handled here:
 *  - zigbee-clusters 2.6 (pinned): `new Error('UNSUPPORTED_ATTRIBUTE')` from writeAttributes /
 *    configureReporting / any Default Response with a failure status; 'Timeout: Expected Response';
 *    local 'X is not a valid attribute of Y' / 'Could not find attrId'; incoming
 *    'unknown_command_received', 'binding_unavailable', 'cluster_unavailable'.
 *  - zigbee-clusters 3.9 (reference): `class ZCLError` with message 'ZCL Error: <STATUS>' and
 *    `zclStatus` = status NAME (string); 'not_implemented'; 'unknown_command_received:<name>'.
 *  - numeric err.status / err.zclStatus / err.statusCode / err.code (kept for compatibility).
 *
 * Kinds: unsupported | read_only | write_only | invalid | denied | timeout | transient |
 *        local_unsupported | unknown_incoming | unknown
 * Only `unsupported`, `read_only`, `write_only` are "by design" and may be remembered for ever.
 */

const ZCL_STATUS = Object.freeze({
  SUCCESS: 0x00, FAILURE: 0x01, NOT_AUTHORIZED: 0x7e, RESERVED_FIELD_NOT_ZERO: 0x7f,
  MALFORMED_COMMAND: 0x80, UNSUP_CLUSTER_COMMAND: 0x81, UNSUP_GENERAL_COMMAND: 0x82,
  UNSUP_MANUF_CLUSTER_COMMAND: 0x83, UNSUP_MANUF_GENERAL_COMMAND: 0x84, INVALID_FIELD: 0x85,
  UNSUPPORTED_ATTRIBUTE: 0x86, INVALID_VALUE: 0x87, READ_ONLY: 0x88, INSUFFICIENT_SPACE: 0x89,
  DUPLICATE_EXISTS: 0x8a, NOT_FOUND: 0x8b, UNREPORTABLE_ATTRIBUTE: 0x8c, INVALID_DATA_TYPE: 0x8d,
  INVALID_SELECTOR: 0x8e, WRITE_ONLY: 0x8f, INCONSISTENT_STARTUP_STATE: 0x90,
  DEFINED_OUT_OF_BAND: 0x91, INCONSISTENT: 0x92, ACTION_DENIED: 0x93, TIMEOUT: 0x94, ABORT: 0x95,
  INVALID_IMAGE: 0x96, WAIT_FOR_DATA: 0x97, NO_IMAGE_AVAILABLE: 0x98, REQUIRE_MORE_IMAGE: 0x99,
  NOTIFICATION_PENDING: 0x9a, HARDWARE_FAILURE: 0xc0, SOFTWARE_FAILURE: 0xc1,
  CALIBRATION_ERROR: 0xc2, UNSUPPORTED_CLUSTER: 0xc3,
});

const ZCL_STATUS_NAME = Object.freeze(Object.entries(ZCL_STATUS)
  .reduce((r, [n, c]) => { r[c] = n; return r; }, {}));

// Aliases seen in the wild (Homey firmware, z2m-style names, older app code)
const NAME_ALIASES = Object.freeze({
  UNSUPPORTED_CLUSTER_COMMAND: 'UNSUP_CLUSTER_COMMAND',
  UNSUPPORTED_GENERAL_COMMAND: 'UNSUP_GENERAL_COMMAND',
  UNSUPPORTED_MANUF_CLUSTER_COMMAND: 'UNSUP_MANUF_CLUSTER_COMMAND',
  UNSUPPORTED_MANUF_GENERAL_COMMAND: 'UNSUP_MANUF_GENERAL_COMMAND',
  UNSUPPORTED_MANUFACTURER_CLUSTER: 'UNSUPPORTED_CLUSTER',
  UNSUPPORTED_ATTRIB: 'UNSUPPORTED_ATTRIBUTE',
  UNSUP_ATTRIBUTE: 'UNSUPPORTED_ATTRIBUTE',
  READONLY: 'READ_ONLY',
});

const KIND_BY_STATUS = Object.freeze({
  0x81: 'unsupported', 0x82: 'unsupported', 0x83: 'unsupported', 0x84: 'unsupported',
  0x86: 'unsupported', 0x8b: 'unsupported', 0x8c: 'unsupported', 0x8d: 'unsupported',
  0xc3: 'unsupported',
  0x88: 'read_only',
  0x8f: 'write_only',
  0x7f: 'invalid', 0x80: 'invalid', 0x85: 'invalid', 0x87: 'invalid', 0x89: 'invalid',
  0x8a: 'invalid', 0x8e: 'invalid', 0x92: 'invalid',
  0x7e: 'denied', 0x93: 'denied',
  0x94: 'timeout',
  0x01: 'transient', 0x90: 'transient', 0x91: 'transient', 0x95: 'transient', 0x96: 'transient',
  0x97: 'transient', 0x98: 'transient', 0x99: 'transient', 0x9a: 'transient',
  0xc0: 'transient', 0xc1: 'transient', 0xc2: 'transient',
});

const BY_DESIGN = new Set(['unsupported', 'read_only', 'write_only']);

const UNSUPPORTED_TEXT = [
  'unsupported_attribute', 'unsupported attribute', 'unsupported_cluster_command',
  'unsupported cluster command', 'unsupported_general_command', 'unsup_general_command',
  'unsup_cluster_command', 'unsup_manuf_cluster_command', 'unsup_manuf_general_command',
  'unsupported_manufacturer_cluster', 'unsupported_cluster', 'unreportable_attribute',
  'not supported', 'not_supported', 'unimplemented',
];
const UNKNOWN_INCOMING_TEXT = ['unknown_command_received', 'not_implemented', 'binding_unavailable', 'cluster_unavailable'];
const LOCAL_TEXT = ['is not a valid attribute', 'is not a valid command', 'could not find attrid',
  'is not a function', 'cluster_unspecified', 'cluster_not_found', 'unknown cluster', 'no such cluster'];
const TIMEOUT_TEXT = ['timeout', 'timed out', 'etimedout', 'expected response'];
const TRANSIENT_TEXT = ['unreachable', 'no ack', 'mac_no_ack', 'network busy', 'ember', 'ezsp', 'buffer',
  'offline', 'not available', 'route', 'device_not_found', 'node not found', 'channel access',
  'econnreset', 'socket', 'busy'];

function _nameFromString(s) {
  if (typeof s !== 'string' || !s) { return null; }
  const up = s.trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(ZCL_STATUS, up)) { return up; }
  if (NAME_ALIASES[up]) { return NAME_ALIASES[up]; }
  return null;
}

/**
 * Extract the ZCL status (code + name) from any error shape, or null.
 * Numeric err.status/zclStatus/statusCode/code are trusted as ZCL (legacy behaviour);
 * string names are taken from zclStatus/status/code or from STATUS tokens in the message
 * ('ZCL Error: READ_ONLY', 'UNSUPPORTED_ATTRIBUTE', 'unknown_command_received:foo' …).
 * @param {any} err
 * @returns {{code:number,name:string}|null}
 */
function extractZclStatus(err) {
  if (err === null || err === undefined) { return null; }
  if (typeof err === 'number') { return ZCL_STATUS_NAME[err] ? { code: err, name: ZCL_STATUS_NAME[err] } : null; }
  const fields = typeof err === 'object' ? [err.zclStatus, err.status, err.statusCode, err.code] : [];
  for (const f of fields) {
    if (typeof f === 'number' && ZCL_STATUS_NAME[f] && f !== 0) { return { code: f, name: ZCL_STATUS_NAME[f] }; }
    const n = _nameFromString(f);
    if (n && n !== 'SUCCESS') { return { code: ZCL_STATUS[n], name: n }; }
  }
  const msg = String((err && err.message) || err);
  const tokens = msg.toUpperCase().match(/[A-Z][A-Z_]{5,}/g) || [];
  for (const t of tokens) {
    const n = _nameFromString(t);
    if (n && n !== 'SUCCESS') { return { code: ZCL_STATUS[n], name: n }; }
  }
  return null;
}

/**
 * @param {any} err
 * @returns {{kind:string,status:(number|null),statusName:(string|null),byDesign:boolean}}
 */
function classifyZclError(err) {
  const out = (kind, st) => ({
    kind, status: st ? st.code : null, statusName: st ? st.name : null, byDesign: BY_DESIGN.has(kind),
  });
  if (err === null || err === undefined) { return out('unknown', null); }
  const msg = String((err && err.message) || err).toLowerCase();
  // Incoming frames we could not handle — checked first ('unknown_command_received' is not a status)
  if (UNKNOWN_INCOMING_TEXT.some((t) => msg.includes(t))) { return out('unknown_incoming', null); }
  const st = extractZclStatus(err);
  if (st && KIND_BY_STATUS[st.code]) {
    // 3.9 raises UNSUP_CLUSTER_COMMAND from Cluster.handleFrame for INCOMING frames
    if (err && err.incoming === true) { return out('unknown_incoming', st); }
    return out(KIND_BY_STATUS[st.code], st);
  }
  if (UNSUPPORTED_TEXT.some((t) => msg.includes(t))) { return out('unsupported', st); }
  if (String((err && err.name) || '').toLowerCase().includes('unsupported')) { return out('unsupported', st); }
  if (LOCAL_TEXT.some((t) => msg.includes(t)) || (err instanceof TypeError)) { return out('local_unsupported', st); }
  if (TIMEOUT_TEXT.some((t) => msg.includes(t))) { return out('timeout', st); }
  if (TRANSIENT_TEXT.some((t) => msg.includes(t))) { return out('transient', st); }
  return out('unknown', st);
}

/** True when an incoming frame failed because nobody implements it (2.6 + 3.9 forms). */
function isUnknownIncomingError(err) {
  if (!err) { return false; }
  const msg = String(err.message || err).toLowerCase();
  if (UNKNOWN_INCOMING_TEXT.some((t) => msg.includes(t))) { return true; }
  const st = extractZclStatus(err);
  return Boolean(st && (st.code === 0x81 || st.code === 0x83 || st.code === 0xc3) && /zcl error|unsup|unsupported/.test(msg));
}

module.exports = {
  ZCL_STATUS,
  ZCL_STATUS_NAME,
  KIND_BY_STATUS,
  UNSUPPORTED_TEXT,
  extractZclStatus,
  classifyZclError,
  isUnknownIncomingError,
};
