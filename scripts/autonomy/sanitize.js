'use strict';
// P3097 (t647u): external content (forum, issues, PRs, comments, diags, mails, upstream) is inert data.
// Strip control/invisible chars, cap size, and accept identifiers only in strict formats.
const MAX = 20000;
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;
const MFR = /^_T[A-Z0-9]{1,4}\d{0,3}_[a-z0-9]{8}$|^[A-Za-z0-9][A-Za-z0-9 ._-]{1,31}$/;
const PID = /^[A-Z0-9][A-Za-z0-9._-]{1,23}$/;
const TRUSTED_SOURCES = ['zigbee2mqtt.io', 'github.com/Koenkk/zigbee-herdsman-converters', 'github.com/zigpy/zha-device-handlers',
  'community.homey.app', 'github.com/dlnraja/com.tuya.zigbee', 'blakadder.com', 'github.com/JohanBendz/com.tuya.zigbee'];

function clean(s, max = MAX) { return String(s == null ? '' : s).replace(INVISIBLE, '').slice(0, max); }
function isMfr(s) { return typeof s === 'string' && s.length <= 32 && MFR.test(s) && !/[`$;|&<>"'\\/{}]/.test(s); }
function isPid(s) { return typeof s === 'string' && PID.test(s); }
function isDp(n) { return Number.isInteger(n) && n >= 1 && n <= 255; }
function isCluster(n) { return Number.isInteger(n) && n >= 0 && n <= 0xffff; }
function trustedSource(url) {
  let u; try { u = new URL(url); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const hp = (u.hostname.replace(/^www\./, '') + u.pathname).toLowerCase();
  return TRUSTED_SOURCES.some((t) => hp === t.toLowerCase() || hp.startsWith(t.toLowerCase() + '/') || hp.startsWith(t.toLowerCase() + '.') === false && u.hostname.toLowerCase().endsWith('.' + t.toLowerCase()) && !t.includes('/'));
}
// Returns a structured, validated couple or null. Free text (titles, bodies) is never returned.
function validateCouple(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const mfr = clean(raw.mfr, 40).trim(); const pid = clean(raw.pid, 30).trim(); const source = clean(raw.source, 300).trim();
  if (!isMfr(mfr) || !isPid(pid) || !trustedSource(source)) return null;
  return { mfr, pid, source };
}
module.exports = { clean, isMfr, isPid, isDp, isCluster, trustedSource, validateCouple, TRUSTED_SOURCES };
