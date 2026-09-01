'use strict';

/**
 * UdpDiscoveryKeys.js (P2367)
 * Shared Tuya UDP discovery crypto constants — SSOT for TuyaUDPDiscovery + TuyaDeviceDiscovery.
 * Keys are well-known protocol constants (TinyTuya, tuyapi, Z2M, tuya-local).
 */

const crypto = require('crypto');

const UDP_KEY_RAW = Buffer.from('yGAdlopoPVldABfn', 'utf8');
const UDP_KEY_HEX = Buffer.from('6c1ec8e2bb9bb59ab50b0daf649b5cb0', 'hex');
const UDP_KEY_MD5 = crypto.createHash('md5').update('yGAdlopoPVldABfn', 'utf8').digest();
const UDP_KEY_GCM = UDP_KEY_MD5;

/** ECB keys in priority order (community implementations differ). */
const ECB_KEYS = [UDP_KEY_RAW, UDP_KEY_HEX, UDP_KEY_MD5];

const PREFIX = Buffer.from([0x00, 0x00, 0x55, 0xAA]);
const SUFFIX = Buffer.from([0x00, 0x00, 0xAA, 0x55]);

/**
 * Decrypt AES-128-ECB UDP payload, trying all known keys.
 * @returns {string|null} decrypted UTF-8 JSON fragment
 */
function decryptUdpEcb(data) {
  for (const key of ECB_KEYS) {
    try {
      const d = crypto.createDecipheriv('aes-128-ecb', key, null);
      d.setAutoPadding(true);
      const out = Buffer.concat([d.update(data), d.final()]).toString('utf8');
      if (out.includes('{')) { return out.replace(/[\x00-\x1f]/g, '').trim(); }
    } catch { /* try next key */ }
  }
  return null;
}

/**
 * Decrypt AES-128-GCM UDP payload (protocol 3.5).
 * @returns {string|null}
 */
function decryptUdpGcm(raw) {
  try {
    if (raw.length < 28) { return null; }
    const iv = raw.slice(0, 12);
    const tag = raw.slice(-16);
    const ct = raw.slice(12, raw.length - 16);
    const d = crypto.createDecipheriv('aes-128-gcm', UDP_KEY_GCM, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Strip Tuya UDP frame header/tail when present.
 */
function stripUdpFrame(msg) {
  const hasPfx = msg.length >= 4 && msg.slice(0, 4).equals(PREFIX);
  const dataStart = hasPfx ? 20 : 0;
  const hasSfx = msg.length >= 8 && msg.slice(-8).slice(4).equals(SUFFIX);
  const dataEnd = hasSfx ? msg.length - 8 : msg.length;
  return msg.slice(dataStart, dataEnd);
}

/**
 * Build active-discovery broadcast payload (TinyTuya deviceScan pattern).
 * @param {string} localIp - this host's LAN IP
 */
function buildActiveProbePayload(localIp) {
  return JSON.stringify({ from: 'app', ip: localIp || '0.0.0.0' });
}

module.exports = {
  UDP_KEY_RAW,
  UDP_KEY_HEX,
  UDP_KEY_MD5,
  UDP_KEY_GCM,
  ECB_KEYS,
  PREFIX,
  SUFFIX,
  decryptUdpEcb,
  decryptUdpGcm,
  stripUdpFrame,
  buildActiveProbePayload,
};
