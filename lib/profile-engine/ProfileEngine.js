'use strict';
/**
 * P-KB2 declarative device profile engine (optional, additive, kill switch).
 * A profile (data/profiles/*.json) describes a device the way deCONZ DDFs (dresden-elektronik, BSD-3) and tuya-local
 * YAML configs (make-all, MIT) do, with Z2M-style whitelabel aliases and per-firmware DP variants (Koenkk zhc, MIT).
 * Own schema and code; native clusters stay the base — the engine only maps Tuya DPs / extra attributes.
 * Schema: { id, match:[{mfr,pid}], whitelabel:[{vendor,model}], variants:[{when:{appVersionMin?,appVersionMax?,mfr?}, dps:{...}}],
 *   dps:{ "<dp>": { cap, steps:[...], write?:true, endpoint?:n } }, settings?:{ powerOnBehavior?:{dp,map}, childLock?:{dp} },
 *   quirks?:{ replaceCluster?:{from,to}, reporting?:[{cluster,attr,min,max,change}], fixAttr?:[{cluster,attr,steps}] }, source:{name,url,commit} }
 */
const fs = require('fs');
const path = require('path');
const T = require('./transforms');
const DIR = path.join(__dirname, '../../data/profiles');
const MAX_FILE = 256 * 1024; const MAX_PROFILES = 2000;
let index = null; // lazy: built on first lookup only

function enabled(homey) {
  if (process.env.PROFILE_ENGINE_OFF === '1') {return false;}
  try { return !(homey && homey.settings && homey.settings.get('profile_engine_off') === true); } catch { return true; }
}
function load(dir = DIR) {
  const idx = new Map(); let n = 0;
  let files = []; try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort(); } catch { return idx; }
  for (const f of files) {
    if (n >= MAX_PROFILES) {break;}
    try { const p = path.join(dir, f); if (fs.statSync(p).size > MAX_FILE) {continue;}
      const j = JSON.parse(fs.readFileSync(p)); for (const prof of [].concat(j)) { if (!prof || !prof.match) {continue;} n++;
        for (const m of prof.match) {idx.set(`${String(m.mfr).toLowerCase()}|${String(m.pid).toUpperCase()}`, prof);} } } catch { /* skip bad file */ }
  }
  return idx;
}
function find(mfr, pid, { dir } = {}) { if (dir) {return load(dir).get(`${String(mfr).toLowerCase()}|${String(pid).toUpperCase()}`) || null;}
  if (!index) {index = load();} return index.get(`${String(mfr).toLowerCase()}|${String(pid).toUpperCase()}`) || null; }
function cmpVer(a, b) { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) {return d;} } return 0; }
/** Merge base DPs with the first matching variant (per firmware / mfr). */
function resolveDps(prof, { appVersion, mfr } = {}) {
  const dps = { ...prof.dps || {} };
  for (const v of prof.variants || []) { const w = v.when || {};
    if (w.mfr && String(w.mfr).toLowerCase() !== String(mfr).toLowerCase()) {continue;}
    if (w.appVersionMin != null && (appVersion == null || cmpVer(appVersion, w.appVersionMin) < 0)) {continue;}
    if (w.appVersionMax != null && (appVersion == null || cmpVer(appVersion, w.appVersionMax) > 0)) {continue;}
    Object.assign(dps, v.dps || {}); break; }
  return dps;
}
/** DP report -> [{cap, value, endpoint}] (unknown DP -> []). */
function decode(prof, dp, raw, ctx = {}) {
  const d = resolveDps(prof, ctx)[String(dp)]; if (!d) {return [];}
  const v = T.apply(raw, d.steps); if (d.fields) {return Object.entries(d.fields).map(([field, cap]) => ({ cap, value: v && v[field], endpoint: d.endpoint || 1 }));}
  return [{ cap: d.cap, value: v, endpoint: d.endpoint || 1 }];
}
/** capability write -> {dp, value} or null when the profile has no writable DP for it. */
function encode(prof, cap, value, ctx = {}) {
  for (const [dp, d] of Object.entries(resolveDps(prof, ctx))) {if (d.cap === cap && d.write) {return { dp: Number(dp), value: T.invert(value, d.steps) };}}
  return null;
}
/** Generic power-on behaviour / child lock exposure. */
function settingWrite(prof, key, value) {
  const s = (prof.settings || {})[key]; if (!s) {return null;}
  if (key === 'powerOnBehavior') { const e = Object.entries(s.map || {}).find(([, x]) => x === value); return e ? { dp: s.dp, value: Number(e[0]) } : null; }
  if (key === 'childLock') {return { dp: s.dp, value: !!value };}
  return null;
}
function whitelabelOf(prof, mfr) { return (prof.whitelabel || []).find((w) => !w.mfr || String(w.mfr).toLowerCase() === String(mfr).toLowerCase()) || null; }
module.exports = { enabled, load, find, resolveDps, decode, encode, settingWrite, whitelabelOf, _reset: () => { index = null; } };
