'use strict';
/**
 * P3039: one adapter per upstream project for the multi-source coverage matrix (scripts/kb/z2m-coverage.js).
 *
 * Every adapter reads a local mirror (kept by scripts/kb/refresh.sh under $KB_DIR) and returns facts only:
 *   { source, entries: [{ mfr, pid, model, ref, tuya, exposes?, dps? }], meta: { commit, date, repo, license, note } }
 * No upstream code or prose is copied: we read identifiers (manufacturerName + productId/modelID), the
 * capability names a definition exposes and Tuya DP numbers, then re-express them in our own format.
 * A missing mirror is not an error: the adapter returns { missing: true } and the matrix says so.
 *
 * Tuya scope: manufacturerName shaped like a Tuya OEM id (_TZ*, _TYZB*, _TYST*) or productId TSxxxx, or a
 * definition that declares Tuya datapoints. Everything else is counted as "non-Tuya" and never implemented.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const TUYA_MFR = /^(_T[A-Z0-9]*_|_TYZB|_TYST)/i;
const TUYA_PID = /^TS[0-9]{3,4}[A-Z]?$/i;
const isTuya = (mfr, pid) => TUYA_MFR.test(String(mfr || '')) || TUYA_PID.test(String(pid || ''));

function walk(dir, re, out = []) {
  if (!fs.existsSync(dir)) { return out; }
  for (const f of fs.readdirSync(dir)) {
    if (f === '.git' || f === 'node_modules') { continue; }
    const p = path.join(dir, f);
    let st;
    try { st = fs.statSync(p); } catch (_e) { continue; }
    if (st.isDirectory()) { walk(p, re, out); } else if (re.test(f)) { out.push(p); }
  }
  return out;
}

function gitHead(dir) {
  try {
    return {
      commit: cp.execSync(`git -C "${dir}" rev-parse HEAD`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(),
      date: cp.execSync(`git -C "${dir}" log -1 --format=%cI`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(),
    };
  } catch (_e) { return { commit: null, date: null }; }
}

const lineOf = (txt, idx) => txt.slice(0, idx).split('\n').length;

/* ------------------------------------------------------------------ Z2M (herdsman-converters package) */

/** Flatten a Z2M expose tree to plain names ("temperature", "state", "climate", "cover", ...). */
function exposeNames(list) {
  const out = new Set();
  const visit = (e) => {
    if (!e || typeof e !== 'object') { return; }
    if (['light', 'switch', 'climate', 'cover', 'lock', 'fan'].includes(e.type)) { out.add(e.type); }
    if (e.name) { out.add(e.name); }
    if (e.property && e.property !== e.name) { out.add(String(e.property).replace(/_(l|ep)?\d+$/, '')); }
    for (const f of e.features || []) { visit(f); }
  };
  for (const e of list || []) { visit(e); }
  return [...out].sort();
}

function resolveExposes(def) {
  if (Array.isArray(def.exposes)) { return def.exposes; }
  if (typeof def.exposes === 'function') {
    // WHY: dynamic exposes take (device, options); with no device most return the full static list.
    try { const r = def.exposes(undefined, {}); return Array.isArray(r) ? r : []; } catch (_e) { return []; }
  }
  return [];
}

function z2mAdapter(kb, opts = {}) {
  const pkg = opts.zhcPkg || process.env.ZHC_PKG_DIR || path.join(kb, 'zhc-pkg', 'node_modules', 'zigbee-herdsman-converters');
  const devDir = path.join(pkg, 'dist', 'devices');
  if (!fs.existsSync(devDir)) { return { source: 'z2m', missing: true, entries: [], meta: { note: `herdsman-converters package not found at ${pkg}` } }; }
  let version = null;
  try { version = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8')).version; } catch (_e) { /* keep null */ }
  const entries = [];
  let nonTuyaDefs = 0;
  for (const f of fs.readdirSync(devDir).filter((x) => x.endsWith('.js') && x !== 'index.js').sort()) {
    let mod;
    try { mod = require(path.resolve(devDir, f)); } catch (_e) { continue; }
    for (const def of mod.definitions || []) {
      const fps = [...(def.fingerprint || [])];
      for (const w of def.whiteLabel || []) { for (const x of w.fingerprint || []) { fps.push({ ...x, _wl: w.model }); } }
      const dps = def.meta && Array.isArray(def.meta.tuyaDatapoints) ? def.meta.tuyaDatapoints.map((r) => r[0]).filter(Number.isInteger) : [];
      const tuyaDef = dps.length > 0 || fps.some((x) => isTuya(x.manufacturerName, x.modelID));
      if (!tuyaDef) { nonTuyaDefs++; continue; }
      const exposes = exposeNames(resolveExposes(def));
      const file = f.replace(/\.js$/, '.ts');
      for (const x of fps) {
        if (!x.manufacturerName || !x.modelID) { continue; }
        entries.push({
          mfr: x.manufacturerName, pid: x.modelID, model: x._wl || def.model, vendor: def.vendor || null, tuya: true,
          exposes, dps: [...new Set(dps)].sort((a, b) => a - b),
          ref: `https://www.zigbee2mqtt.io/devices/${encodeURIComponent(String(def.model).replace(/[/ ]/g, '_'))}.html`,
          file,
        });
      }
    }
  }
  return { source: 'z2m', entries, meta: { repo: 'https://github.com/Koenkk/zigbee-herdsman-converters', license: 'MIT', version, nonTuyaDefinitions: nonTuyaDefs } };
}

/* ------------------------------------------------------------------ ZHA (zha-device-handlers) */
function zhaAdapter(kb) {
  const d = path.join(kb, 'zha');
  if (!fs.existsSync(d)) { return { source: 'zha', missing: true, entries: [] }; }
  const h = gitHead(d);
  const entries = [];
  for (const f of walk(path.join(d, 'zhaquirks'), /\.py$/)) {
    const t = fs.readFileSync(f, 'utf8');
    const rel = path.relative(d, f);
    const push = (mfr, pid, idx) => entries.push({ mfr, pid, tuya: isTuya(mfr, pid), ref: `https://github.com/zigpy/zha-device-handlers/blob/${h.commit}/${rel}#L${lineOf(t, idx)}` });
    for (const m of t.matchAll(/\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g)) {
      const [a, b] = [m[1], m[2]];
      if (TUYA_MFR.test(a) && !TUYA_MFR.test(b)) { push(a, b, m.index); } else if (TUYA_MFR.test(b) && !TUYA_MFR.test(a)) { push(b, a, m.index); }
    }
    for (const m of t.matchAll(/(?:\.applies_to|TuyaQuirkBuilder)\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g)) { push(m[1], m[2], m.index); }
    // MODELS_INFO: [("mfr","model"), ...] and signature dicts { MODEL: "TS0601", MANUFACTURER: "_TZE200_x" }
    for (const m of t.matchAll(/MANUFACTURER\s*:\s*"([^"]+)"[\s\S]{0,200}?MODEL\s*:\s*"([^"]+)"/g)) { push(m[1], m[2], m.index); }
  }
  return { source: 'zha', entries, meta: { repo: 'https://github.com/zigpy/zha-device-handlers', license: 'Apache-2.0', ...h } };
}

/* ------------------------------------------------------------------ deCONZ DDF */
function deconzAdapter(kb) {
  const d = path.join(kb, 'deconz');
  if (!fs.existsSync(d)) { return { source: 'deconz', missing: true, entries: [] }; }
  const h = gitHead(d);
  const entries = [];
  for (const f of walk(path.join(d, 'devices'), /\.json$/)) {
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_e) { continue; }
    if (!j || !j.manufacturername) { continue; }
    const mf = [].concat(j.manufacturername);
    const mo = [].concat(j.modelid || []);
    // WHY: DDF pairs manufacturername[i] with modelid[i]; a single modelid applies to all names.
    mf.forEach((m, i) => {
      const p = mo.length === mf.length ? mo[i] : (mo.length === 1 ? mo[0] : null);
      if (typeof m === 'string' && typeof p === 'string' && !m.startsWith('$')) {
        entries.push({ mfr: m, pid: p, model: j.product || null, tuya: isTuya(m, p), ref: `https://github.com/dresden-elektronik/deconz-rest-plugin/blob/${h.commit}/${path.relative(d, f)}` });
      }
    });
  }
  return { source: 'deconz', entries, meta: { repo: 'https://github.com/dresden-elektronik/deconz-rest-plugin', license: 'BSD-3-Clause', ...h } };
}

/* ------------------------------------------------------------------ Johan Bendz com.tuya.zigbee */
function johanAdapter(kb) {
  const d = path.join(kb, 'johan');
  if (!fs.existsSync(d)) { return { source: 'johan', missing: true, entries: [] }; }
  const h = gitHead(d);
  const entries = [];
  for (const f of walk(path.join(d, 'drivers'), /^driver\.compose\.json$/)) {
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_e) { continue; }
    const z = j.zigbee || {};
    const mf = [].concat(z.manufacturerName || []);
    const pids = [].concat(z.productId || []);
    // WHY: Homey pairs any listed name with any listed productId, so each combination is a couple Johan's app accepts.
    for (const m of mf) {
      for (const p of pids) {
        entries.push({ mfr: m, pid: p, model: path.basename(path.dirname(f)), class: j.class || null, tuya: isTuya(m, p), ref: `https://github.com/JohanBendz/com.tuya.zigbee/blob/${h.commit}/${path.relative(d, f)}` });
      }
    }
  }
  return { source: 'johan', entries, meta: { repo: 'https://github.com/JohanBendz/com.tuya.zigbee', license: 'GPL-3.0', ...h, note: 'driver lists are mfr×pid cross products (Homey semantics)' } };
}

/* ------------------------------------------------------------------ Blakadder */
function blakadderAdapter(kb) {
  const d = path.join(kb, 'blakadder');
  if (!fs.existsSync(d)) { return { source: 'blakadder', missing: true, entries: [] }; }
  const h = gitHead(d);
  const entries = [];
  let ambiguous = 0;
  for (const f of walk(path.join(d, '_zigbee'), /\.md$/)) {
    const t = fs.readFileSync(f, 'utf8');
    const zm = (t.match(/^zigbeemodel:\s*\[?(.*?)\]?\s*$/m) || [])[1];
    if (!zm) { continue; }
    const toks = zm.split(',').map((s) => s.replace(/['"\s]/g, '')).filter(Boolean);
    const mfrs = toks.filter((x) => TUYA_MFR.test(x));
    const pids = toks.filter((x) => !TUYA_MFR.test(x));
    // WHY: a page lists models and OEM ids in one flat array; only one model makes the couple unambiguous.
    if (!mfrs.length) { continue; }
    if (pids.length !== 1) { ambiguous += mfrs.length; continue; }
    for (const m of mfrs) { entries.push({ mfr: m, pid: pids[0], model: (t.match(/^model:\s*(.*)$/m) || [])[1] || null, tuya: true, ref: `https://zigbee.blakadder.com/${path.basename(f, '.md')}.html` }); }
  }
  return { source: 'blakadder', entries, meta: { repo: 'https://github.com/blakadder/zigbee', license: 'MIT', ...h, ambiguousSkipped: ambiguous } };
}

/* ------------------------------------------------------------------ Hubitat (kkossev) */
function hubitatAdapter(kb) {
  const d = path.join(kb, 'hubitat');
  if (!fs.existsSync(d)) { return { source: 'hubitat', missing: true, entries: [] }; }
  const h = gitHead(d);
  const entries = [];
  for (const f of walk(d, /\.groovy$/)) {
    const t = fs.readFileSync(f, 'utf8');
    // WHY: fingerprints appear as `fingerprint ...` lines and as `[profileId:..., model:..., manufacturer:...]` maps in device profiles.
    for (const m of t.matchAll(/^[^\n]*\bmodel\s*:[^\n]*$/gm)) {
      const line = m[0];
      const mo = line.match(/model\s*:\s*["']([^"']+)["']/);
      const mf = line.match(/manufacturer\s*:\s*["']([^"']+)["']/);
      if (mo && mf) { entries.push({ mfr: mf[1], pid: mo[1], model: path.basename(f, '.groovy'), tuya: isTuya(mf[1], mo[1]), ref: `https://github.com/kkossev/Hubitat/blob/${h.commit}/${path.relative(d, f).split(path.sep).map(encodeURIComponent).join('/')}#L${lineOf(t, m.index)}` }); }
    }
  }
  return { source: 'hubitat', entries, meta: { repo: 'https://github.com/kkossev/Hubitat', license: 'Apache-2.0', ...h } };
}

/* ------------------------------------------------------------------ SmartThings Edge (official + Mariano community) */
function smartthingsAdapter(kb) {
  const roots = [['smartthings', 'SmartThingsCommunity/SmartThingsEdgeDrivers'], ['st-mariano', 'Mariano-Github/Edge-Drivers-Beta']];
  const entries = [];
  const metas = [];
  for (const [dir, repo] of roots) {
    const d = path.join(kb, dir);
    if (!fs.existsSync(d)) { continue; }
    const h = gitHead(d);
    metas.push({ repo: `https://github.com/${repo}`, ...h });
    for (const f of walk(d, /^fingerprints\.ya?ml$/)) {
      const t = fs.readFileSync(f, 'utf8');
      // blocks: "- id: ..." followed by manufacturer:/model: keys (order varies)
      for (const blk of t.split(/\n\s*-\s+id:/)) {
        const mf = blk.match(/\n\s*manufacturer:\s*["']?([^"'\n]+?)["']?\s*(\n|$)/);
        const mo = blk.match(/\n\s*model:\s*["']?([^"'\n]+?)["']?\s*(\n|$)/);
        if (mf && mo) { entries.push({ mfr: mf[1].trim(), pid: mo[1].trim(), model: path.relative(d, path.dirname(f)), tuya: isTuya(mf[1].trim(), mo[1].trim()), ref: `https://github.com/${repo}/blob/${h.commit}/${path.relative(d, f)}` }); }
      }
    }
  }
  if (!metas.length) { return { source: 'smartthings', missing: true, entries: [] }; }
  return { source: 'smartthings', entries, meta: { repos: metas, license: 'Apache-2.0' } };
}

/* ------------------------------------------------------------------ ioBroker.zigbee */
function iobrokerAdapter(kb) {
  const d = path.join(kb, 'iobroker');
  if (!fs.existsSync(d)) { return { source: 'iobroker', missing: true, entries: [] }; }
  const h = gitHead(d);
  const entries = [];
  for (const f of walk(path.join(d, 'lib'), /\.js$/)) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(/modelID\s*:\s*["']([^"']+)["']\s*,\s*manufacturerName\s*:\s*["']([^"']+)["']|manufacturerName\s*:\s*["']([^"']+)["']\s*,\s*modelID\s*:\s*["']([^"']+)["']/g)) {
      const pid = m[1] || m[4]; const mfr = m[2] || m[3];
      entries.push({ mfr, pid, tuya: isTuya(mfr, pid), ref: `https://github.com/ioBroker/ioBroker.zigbee/blob/${h.commit}/${path.relative(d, f)}#L${lineOf(t, m.index)}` });
    }
  }
  return { source: 'iobroker', entries, meta: { repo: 'https://github.com/ioBroker/ioBroker.zigbee', license: 'MIT', ...h, note: 'device definitions come from zigbee-herdsman-converters; only adapter-local fingerprints are counted' } };
}

/* ------------------------------------------------------------------ Domoticz (Zigbee for Domoticz certified devices) */
function domoticzAdapter(kb) {
  const d = path.join(kb, 'domoticz-cert');
  if (!fs.existsSync(d)) { return { source: 'domoticz', missing: true, entries: [] }; }
  const h = gitHead(d);
  const entries = [];
  for (const f of walk(d, /\.json$/)) {
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_e) { continue; }
    for (const pair of (j && Array.isArray(j.Identifier) ? j.Identifier : [])) {
      if (Array.isArray(pair) && pair.length >= 2 && typeof pair[0] === 'string' && typeof pair[1] === 'string') {
        entries.push({ mfr: pair[1], pid: pair[0], model: path.basename(f, '.json'), tuya: isTuya(pair[1], pair[0]), ref: `https://github.com/zigbeefordomoticz/z4d-certified-devices/blob/${h.commit}/${path.relative(d, f).split(path.sep).map(encodeURIComponent).join('/')}` });
      }
    }
  }
  return { source: 'domoticz', entries, meta: { repo: 'https://github.com/zigbeefordomoticz/z4d-certified-devices', license: 'GPL-3.0', ...h } };
}

/* ------------------------------------------------------------------ Tasmota Zigbee plugins (.zb) */
function tasmotaAdapter(kb) {
  const d = path.join(kb, 'tasmota');
  if (!fs.existsSync(d)) { return { source: 'tasmota', missing: true, entries: [] }; }
  const h = gitHead(d);
  const entries = [];
  for (const f of walk(path.join(d, 'tasmota', 'zigbee'), /\.zb$/)) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(/^:([^,\s]+),([^\s#]+)/gm)) {
      if (m[2] === '*' || m[1] === '*') { continue; }
      entries.push({ mfr: m[2], pid: m[1], model: path.basename(f, '.zb'), tuya: isTuya(m[2], m[1]), ref: `https://github.com/arendst/Tasmota/blob/${h.commit}/${path.relative(d, f)}#L${lineOf(t, m.index)}` });
    }
  }
  return { source: 'tasmota', entries, meta: { repo: 'https://github.com/arendst/Tasmota', license: 'GPL-3.0', ...h } };
}

/** Order matters: it is the implementation priority asked by the owner (Z2M first). */
const ADAPTERS = [
  ['z2m', z2mAdapter], ['zha', zhaAdapter], ['deconz', deconzAdapter], ['johan', johanAdapter], ['blakadder', blakadderAdapter],
  ['hubitat', hubitatAdapter], ['smartthings', smartthingsAdapter], ['iobroker', iobrokerAdapter], ['domoticz', domoticzAdapter], ['tasmota', tasmotaAdapter],
];

/** Wi-Fi / LAN projects: separate matrix owned by the wifi-local work; listed here as leads only. */
const WIFI_LEADS = ['tuya-local', 'localtuya', 'tinytuya', 'esphome'];

module.exports = { ADAPTERS, WIFI_LEADS, isTuya, TUYA_MFR, TUYA_PID, exposeNames, resolveExposes, walk, gitHead };
