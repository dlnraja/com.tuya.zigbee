'use strict';
/**
 * P2931 — Normalise what a user types in the manual LAN pairing / repair form.
 * IP: trims, drops a ":port" suffix, accepts IPv4 only, rejects 0.0.0.0 / broadcast /
 * loopback. Protocol: resolves labels through TuyaProtocolVersions ("v3.3" -> 3.3,
 * "3.22" -> 3.3, "2.2" or unknown -> auto, so the documented chain is probed).
 */
const net = require('net');
const { resolve } = require('./TuyaProtocolVersions');

function normalizeIp(raw) {
  if (raw === undefined || raw === null) {return '';}
  let s = String(raw).trim();
  const m = s.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d{1,5})?$/);
  if (!m) {return '';}
  s = m[1];
  if (!net.isIPv4(s)) {return '';}
  if (s === '0.0.0.0' || s.endsWith('.255') || s.startsWith('127.')) {return '';}
  return s;
}

function normalizeVersion(raw) {
  const r = resolve(raw);
  if (r.status === 'documented' || r.status === 'alias') {return r.lan;}
  return 'auto';
}

module.exports = { normalizeIp, normalizeVersion };
