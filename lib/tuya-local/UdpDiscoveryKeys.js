'use strict';

/**
 * UdpDiscoveryKeys.js (P2367 + P2408)
 * Shared Tuya UDP discovery crypto — SSOT for TuyaUDPDiscovery + TuyaDeviceDiscovery.
 *
 * WHY P2408: TinyTuya PROTOCOL.md parity —
 *   - 55AA ECB (3.3) with multi-key try
 *   - 6699 GCM (3.5) broadcast + solicitation on UDP/7000 (cmd 0x25)
 *   - plaintext 3.1 on 6666/7000
 *   - local_key normalization (ascii16 / hex32 / quoted)
 *
 * Keys are well-known protocol constants (TinyTuya, tuyapi, tuya-local, Z2M).
 */

const crypto = require('crypto');
const os = require('os');

const UDP_KEY_STRING = 'yGAdlopoPVldABfn';
const UDP_KEY_RAW = Buffer.from(UDP_KEY_STRING, 'utf8');
const UDP_KEY_HEX = Buffer.from('6c1ec8e2bb9bb59ab50b0daf649b5cb0', 'hex');
const UDP_KEY_MD5 = crypto.createHash('md5').update(UDP_KEY_STRING, 'utf8').digest();
/** Primary GCM discovery key = MD5(UDP_KEY_STRING) — tuyapi config.UDP_KEY */
const UDP_KEY_GCM = UDP_KEY_MD5;

/** ECB keys in priority order (community implementations differ). TinyTuya prefers MD5 first for 6667. */
const ECB_KEYS = [UDP_KEY_MD5, UDP_KEY_RAW, UDP_KEY_HEX];

const PREFIX_55AA = Buffer.from([0x00, 0x00, 0x55, 0xaa]);
const SUFFIX_55AA = Buffer.from([0x00, 0x00, 0xaa, 0x55]);
const PREFIX_6699 = Buffer.from([0x00, 0x00, 0x66, 0x99]);
const SUFFIX_6699 = Buffer.from([0x00, 0x00, 0x99, 0x66]);

/** Legacy aliases */
const PREFIX = PREFIX_55AA;
const SUFFIX = SUFFIX_55AA;

/** LAN TCP protocol cascade (tuyapi / TinyTuya) */
const PROTOCOL_VERSIONS = Object.freeze(['3.5', '3.4', '3.3', '3.2', '3.1']);

/** Discovery solicitation command (TinyTuya REQ_DEVINFO) */
const CMD_REQ_DEVINFO = 0x25;

/**
 * Normalize a Tuya local_key for TuyAPI.
 * Accepts: 16-char ASCII, 32-char hex, quoted strings, device_key alias paste.
 * @returns {string|null}
 */
function normalizeLocalKey(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  // Strip common copy/paste noise
  s = s.replace(/[\s\u200b]+/g, '');
  if (/^[0-9a-fA-F]{32}$/.test(s)) {
    // Hex-encoded 16-byte key → binary string TuyAPI expects
    return Buffer.from(s, 'hex').toString('latin1');
  }
  if (s.length === 16) return s;
  // Some firmwares expose 16-byte keys with non-printable — keep as-is if Buffer length 16
  if (Buffer.byteLength(s, 'utf8') === 16) return s;
  return s;
}

/**
 * Build protocol fallback chain starting from a preferred version (UDP discovery hint).
 * @param {string} [preferred]
 * @returns {string[]}
 */
function buildProtocolFallbackChain(preferred) {
  const pref = String(preferred || '').trim();
  if (!pref || pref === 'auto') return [...PROTOCOL_VERSIONS];
  const rest = PROTOCOL_VERSIONS.filter((v) => v !== pref);
  if (PROTOCOL_VERSIONS.includes(pref)) return [pref, ...rest];
  return [...PROTOCOL_VERSIONS];
}

/**
 * Guess LAN protocol from UDP discovery fields.
 */
function guessProtocolFromDiscovery(info = {}) {
  const v = String(info.version || '').trim();
  if (PROTOCOL_VERSIONS.includes(v)) return v;
  if (info.frame === '6699' || info.gcm === true) return '3.5';
  if (info.encrypted === true || info.encrypt === true) return '3.3';
  return '3.1';
}

function decryptUdpEcb(data) {
  for (const key of ECB_KEYS) {
    try {
      const d = crypto.createDecipheriv('aes-128-ecb', key, null);
      d.setAutoPadding(true);
      const out = Buffer.concat([d.update(data), d.final()]).toString('utf8');
      if (out.includes('{')) {
        return out.replace(/[\x00-\x1f]/g, '').trim();
      }
    } catch { /* try next key */ }
  }
  return null;
}

/**
 * Decrypt raw AES-128-GCM blob (IV12 | CT | TAG16) with discovery key.
 */
function decryptUdpGcmRaw(raw, key = UDP_KEY_GCM) {
  try {
    if (!raw || raw.length < 28) return null;
    const iv = raw.slice(0, 12);
    const tag = raw.slice(-16);
    const ct = raw.slice(12, raw.length - 16);
    const d = crypto.createDecipheriv('aes-128-gcm', key, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** @deprecated use decryptUdpGcmRaw — kept for P2367 tests */
function decryptUdpGcm(raw) {
  return decryptUdpGcmRaw(raw);
}

/**
 * Decrypt a 6699 GCM frame (TinyTuya / tuyapi 3.5 discovery).
 * Header AAD = bytes after prefix (reserved+seq+cmd+length).
 */
function decrypt6699Frame(msg) {
  try {
    if (!msg || msg.length < 18 + 12 + 16 + 4) return null;
    if (!msg.slice(0, 4).equals(PREFIX_6699)) return null;
    const header = msg.slice(0, 18);
    const length = header.readUInt32BE(14);
    const bodyEnd = 18 + length;
    if (msg.length < bodyEnd) return null;
    const body = msg.slice(18, bodyEnd);
    if (body.length < 28) return null;
    const iv = body.slice(0, 12);
    const tag = body.slice(-16);
    const ct = body.slice(12, body.length - 16);
    const d = crypto.createDecipheriv('aes-128-gcm', UDP_KEY_GCM, iv);
    d.setAAD(header.slice(4));
    d.setAuthTag(tag);
    const plain = Buffer.concat([d.update(ct), d.final()]).toString('utf8');
    return plain.replace(/[\x00-\x1f]/g, '').trim();
  } catch {
    return null;
  }
}

/**
 * Pack TinyTuya-style 6699 GCM discovery solicitation (cmd 0x25 REQ_DEVINFO).
 * @param {string} localIp
 * @param {object} [opts]
 * @param {number} [opts.seq=1]
 */
function packDiscoverySolicitation(localIp, opts = {}) {
  const seq = Number.isFinite(opts.seq) ? opts.seq : 1;
  const payload = Buffer.from(buildActiveProbePayload(localIp), 'utf8');
  const iv = crypto.randomBytes(12);
  const length = 12 + payload.length + 16;
  const header = Buffer.alloc(18);
  header.writeUInt32BE(0x00006699, 0);
  header.writeUInt16BE(0, 4);
  header.writeUInt32BE(seq, 6);
  header.writeUInt32BE(CMD_REQ_DEVINFO, 10);
  header.writeUInt32BE(length, 14);
  const cipher = crypto.createCipheriv('aes-128-gcm', UDP_KEY_GCM, iv);
  cipher.setAAD(header.slice(4));
  const ct = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([header, iv, ct, tag, SUFFIX_6699]);
}

function stripUdpFrame(msg) {
  const hasPfx = msg.length >= 4 && msg.slice(0, 4).equals(PREFIX_55AA);
  const dataStart = hasPfx ? 20 : 0;
  const hasSfx = msg.length >= 8 && msg.slice(-4).equals(SUFFIX_55AA);
  const dataEnd = hasSfx ? msg.length - 8 : msg.length;
  return msg.slice(dataStart, dataEnd);
}

/**
 * Cascade decrypt any discovery datagram (plaintext / 6699 / 55AA+ECB / raw GCM).
 * @returns {{payload: string, frame: string}|null}
 */
function decryptUdpDiscoveryMessage(msg) {
  if (!Buffer.isBuffer(msg)) {
    try { msg = Buffer.from(msg); } catch { return null; }
  }
  if (msg.length < 8 || msg.length > 4096) return null;

  // 1) 6699 GCM frame (3.5)
  if (msg.slice(0, 4).equals(PREFIX_6699)) {
    const p = decrypt6699Frame(msg);
    if (p && p.includes('{')) return { payload: p, frame: '6699' };
  }

  // 2) Embedded plaintext JSON (3.1 / some framed)
  const jStart = msg.indexOf('{');
  const jEnd = msg.lastIndexOf('}');
  if (jStart >= 0 && jEnd > jStart) {
    const slice = msg.slice(jStart, jEnd + 1).toString('utf8');
    if (slice.includes('gwId') || slice.includes('"ip"')) {
      return { payload: slice.replace(/[\x00-\x1f]/g, '').trim(), frame: 'plaintext' };
    }
  }

  // 3) 55AA-framed ECB
  const stripped = stripUdpFrame(msg);
  const ecb = decryptUdpEcb(stripped);
  if (ecb && ecb.includes('{')) return { payload: ecb, frame: '55aa-ecb' };

  // 4) Raw ECB (no frame)
  const ecbRaw = decryptUdpEcb(msg);
  if (ecbRaw && ecbRaw.includes('{')) return { payload: ecbRaw, frame: 'raw-ecb' };

  // 5) Raw GCM blob
  const gcm = decryptUdpGcmRaw(stripped.length >= 28 ? stripped : msg);
  if (gcm && gcm.includes('{')) return { payload: gcm.replace(/[\x00-\x1f]/g, '').trim(), frame: 'raw-gcm' };

  return null;
}

function buildActiveProbePayload(localIp) {
  return JSON.stringify({ from: 'app', ip: localIp || '0.0.0.0' });
}

/**
 * Enumerate LAN IPv4 + broadcast targets for active discovery (multi-NIC).
 * @returns {{ip: string, broadcast: string}[]}
 */
function listLanBroadcastTargets() {
  const out = [];
  try {
    const ifaces = os.networkInterfaces();
    for (const addrs of Object.values(ifaces || {})) {
      for (const a of addrs || []) {
        if (a.family !== 'IPv4' && a.family !== 4) continue;
        if (a.internal) continue;
        const ip = a.address;
        // Derive /24 broadcast when netmask unknown (Homey common case)
        let broadcast = '255.255.255.255';
        if (a.cidr && a.cidr.includes('/')) {
          const bits = parseInt(a.cidr.split('/')[1], 10);
          if (bits === 24) {
            const parts = ip.split('.').map(Number);
            broadcast = `${parts[0]}.${parts[1]}.${parts[2]}.255`;
          }
        } else {
          const parts = ip.split('.').map(Number);
          if (parts.length === 4) broadcast = `${parts[0]}.${parts[1]}.${parts[2]}.255`;
        }
        out.push({ ip, broadcast });
      }
    }
  } catch { /* ignore */ }
  if (!out.length) out.push({ ip: '0.0.0.0', broadcast: '255.255.255.255' });
  return out;
}

module.exports = {
  UDP_KEY_STRING,
  UDP_KEY_RAW,
  UDP_KEY_HEX,
  UDP_KEY_MD5,
  UDP_KEY_GCM,
  ECB_KEYS,
  PREFIX,
  SUFFIX,
  PREFIX_55AA,
  SUFFIX_55AA,
  PREFIX_6699,
  SUFFIX_6699,
  PROTOCOL_VERSIONS,
  CMD_REQ_DEVINFO,
  decryptUdpEcb,
  decryptUdpGcm,
  decryptUdpGcmRaw,
  decrypt6699Frame,
  decryptUdpDiscoveryMessage,
  stripUdpFrame,
  buildActiveProbePayload,
  packDiscoverySolicitation,
  normalizeLocalKey,
  buildProtocolFallbackChain,
  guessProtocolFromDiscovery,
  listLanBroadcastTargets,
};
