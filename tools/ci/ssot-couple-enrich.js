#!/usr/bin/env node
'use strict';
/**
 * P3136 — SSOT couple enrichment ledger (t731u).
 *
 * Builds data/ssot/couple-sources.json : one entry per EXACT mfr+pid couple
 * declared in drivers/<id>/driver.compose.json, with:
 *   - external evidence (Z2M herdsman fingerprint, ZHA quirk tuple, Johan app listing,
 *     in-repo dp_couple_knowledge sources) — links only, no copied code (CREDITS.md);
 *   - DPs + meaning when dp_couple_knowledge knows the couple;
 *   - driver class, capabilities, gang count, HomeKit service mapping,
 *     custom-capability compensation for non-native features;
 *   - status 'verified' (>=1 external/recorded source) or 'unverified'.
 *
 * Additive data only: nothing here is read at pairing time; never invents ids/DPs.
 * Inputs are treated as untrusted DATA (regex-extracted ids only, never executed).
 *
 * Usage: node tools/ci/ssot-couple-enrich.js [--z2m=tuya.ts] [--zha=dir] [--johan=app.json] [--check]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'ssot', 'couple-sources.json');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=') || null;
const ID_RE = /^_T[A-Z0-9]{2,5}_[A-Za-z0-9]{4,16}$/;
const PID_RE = /^[A-Za-z0-9_\-]{3,24}$/;

const Z2M_URL = 'https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts';
const ZHA_URL = 'https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks/tuya';

// Homey device class -> HomeKit service (Homey's native HomeKit bridge behaviour).
const HOMEKIT = {
  socket: 'Outlet', light: 'Lightbulb', sensor: 'Sensor (per capability)', thermostat: 'Thermostat',
  windowcoverings: 'WindowCovering', curtain: 'WindowCovering', blinds: 'WindowCovering',
  lock: 'LockMechanism', fan: 'Fanv2', heater: 'HeaterCooler', button: 'StatelessProgrammableSwitch',
  remote: 'StatelessProgrammableSwitch', doorbell: 'Doorbell', homealarm: 'SecuritySystem',
  airpurifier: 'AirPurifier', airconditioning: 'HeaterCooler', kettle: 'Switch', sprinkler: 'Valve',
  speaker: 'none', other: 'Switch (if onoff) else none', solarpanel: 'none', amplifier: 'none',
  evcharger: 'Outlet', smokedetector: 'SmokeSensor', coffeemachine: 'Switch', tv: 'Television',
  garagedoor: 'GarageDoorOpener', vacuumcleaner: 'Switch', boiler: 'Switch', battery: 'Battery',
  waterheater: 'HeaterCooler', washer: 'Switch', dryer: 'Switch', dishwasher: 'Switch', petfeeder: 'Switch',
};
// Capabilities HomeKit (via Homey) exposes natively; everything else needs flow/custom compensation.
const HK_NATIVE = new Set(['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode',
  'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_co2', 'measure_co', 'measure_pm25',
  'measure_battery', 'alarm_battery', 'alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke', 'alarm_co',
  'alarm_co2', 'alarm_tamper', 'alarm_generic', 'target_temperature', 'thermostat_mode', 'windowcoverings_set',
  'windowcoverings_state', 'locked', 'fan_speed', 'button', 'alarm_occupancy']);

function homeySystemCaps() {
  const p = path.join(ROOT, 'node_modules', 'homey-lib', 'assets', 'capability', 'capabilities');
  try { return new Set(fs.readdirSync(p).map((f) => f.replace(/\.json$/, ''))); } catch { return null; }
}

function loadDrivers() {
  const couples = new Map();
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers')).sort()) {
    const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    let c; try { c = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
    const mfrs = [].concat(c.zigbee?.manufacturerName || []);
    const pids = [].concat(c.zigbee?.productId || []);
    const caps = (c.capabilities || []).map(String);
    const gangs = Math.max(1, caps.filter((x) => /^onoff(\.|$)/.test(x)).length,
      Number((d.match(/(\d)_?gang/) || [])[1] || 0), Number((d.match(/_(\d)$/) || [])[1] || 0));
    for (const mfr of mfrs) for (const pid of pids) {
      const k = `${mfr}|${pid}`;
      if (!couples.has(k)) couples.set(k, { mfr, pid, drivers: [] });
      couples.get(k).drivers.push({ id: d, class: c.class || null, capabilities: caps, gangOrButtons: gangs });
    }
  }
  return couples;
}

function parseZ2M(src) {
  const out = new Map();
  if (!src) return out;
  const re = /tuya\.fingerprint\(\s*['"]([^'"]+)['"]\s*,\s*\[([\s\S]*?)\]\s*\)|modelID:\s*['"]([^'"]+)['"]\s*,\s*manufacturerName:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const tail = src.slice(re.lastIndex, re.lastIndex + 4000);
    const model = (tail.match(/\bmodel:\s*['"]([^'"]{1,60})['"]/) || [])[1] || null;
    const vendor = (tail.match(/\bvendor:\s*['"]([^'"]{1,40})['"]/) || [])[1] || null;
    const pairs = m[1] ? [...m[2].matchAll(/['"](_T[^'"]+)['"]/g)].map((x) => [x[1], m[1]]) : [[m[4], m[3]]];
    for (const [mfr, pid] of pairs) {
      if (!ID_RE.test(mfr) || !PID_RE.test(pid)) continue;
      const k = `${mfr.toLowerCase()}|${pid.toUpperCase()}`;
      if (!out.has(k)) out.set(k, { source: 'z2m', model, vendor });
    }
  }
  // whiteLabel entries carry their own mfr list; pid = enclosing definition's single model id.
  for (const w of src.matchAll(/tuya\.whitelabel\(\s*['"]([^'"]{1,40})['"]\s*,\s*['"]([^'"]{1,60})['"]\s*,\s*['"][^'"]*['"]\s*,\s*\[([^\]]*)\]/g)) {
    const before = src.slice(Math.max(0, w.index - 8000), w.index);
    const defStart = before.lastIndexOf('\n    {\n');
    const def = defStart >= 0 ? before.slice(defStart) : '';
    const zm = def.match(/zigbeeModel:\s*\[\s*['"]([^'"]+)['"]\s*\]/);
    const fp = [...def.matchAll(/tuya\.fingerprint\(\s*['"]([^'"]+)['"]/g)].map((x) => x[1]);
    const pids = new Set([...(zm ? [zm[1]] : []), ...fp]);
    if (pids.size !== 1) continue;
    const pid = [...pids][0];
    for (const x of w[3].matchAll(/['"](_T[^'"]+)['"]/g)) {
      if (!ID_RE.test(x[1]) || !PID_RE.test(pid)) continue;
      const k = `${x[1].toLowerCase()}|${pid.toUpperCase()}`;
      if (!out.has(k)) out.set(k, { source: 'z2m', model: w[2], vendor: w[1], via: 'whitelabel' });
    }
  }
  return out;
}

function parseZHA(dir) {
  const out = new Map();
  if (!dir || !fs.existsSync(dir)) return out;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.py') ? [path.join(d, e.name)] : []);
  for (const f of walk(dir)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\(\s*"(_T[A-Za-z0-9_]+)"\s*,\s*"([A-Za-z0-9_\-]+)"\s*\)/g)) {
      if (!ID_RE.test(m[1]) || !PID_RE.test(m[2])) continue;
      const k = `${m[1].toLowerCase()}|${m[2].toUpperCase()}`;
      if (!out.has(k)) out.set(k, { source: 'zha', file: path.basename(f) });
    }
  }
  return out;
}

function parseJohan(file) {
  const out = new Map();
  if (!file || !fs.existsSync(file)) return out;
  let app; try { app = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return out; }
  for (const d of app.drivers || []) {
    const mf = [].concat(d.zigbee?.manufacturerName || []); const pi = [].concat(d.zigbee?.productId || []);
    for (const a of mf) for (const b of pi) {
      if (!ID_RE.test(a)) continue;
      out.set(`${a.toLowerCase()}|${String(b).toUpperCase()}`, { source: 'johan-app', driver: d.id, strength: 'driver-listing' });
    }
  }
  return out;
}

/**
 * P3225 — removal tombstones. A couple removed from every driver with recorded
 * multi-source evidence (data/couple-removal-evidence.json, P3134/P3146) stays in
 * the ledger as status 'unverified' with drivers [] and a `removed` note, so the
 * decision survives ledger refreshes and is never silently re-added as "new".
 * Additive: live couples are untouched; never read at pairing.
 */
function addRemovalTombstones(couples, evidence) {
  let n = 0;
  for (const e of (evidence && evidence.entries) || []) {
    const [m, p] = String(e.couple || '').split('|');
    if (!m || !p || !ID_RE.test(m)) continue;
    const ck = `${m.toLowerCase()}|${p.toUpperCase()}`;
    if (couples[ck] && !couples[ck].removed) continue; // still live in some driver (a move, not a removal)
    const removed = couples[ck]?.removed || [];
    if (!removed.some((r) => r.driver === e.driver && r.pr === e.pr)) removed.push({ driver: e.driver, pr: e.pr, verdict: e.verdict });
    couples[ck] = { mfr: m, pid: p, status: 'unverified', reason: 'removed-with-evidence', sources: [{ source: 'couple-removal-evidence', ref: 'data/couple-removal-evidence.json' }],
      drivers: [], removed, dps: null, model: null, vendor: null, firstSeen: couples[ck]?.firstSeen || new Date().toISOString().slice(0, 10) };
    n++;
  }
  return n;
}

function main() {
  const z2m = parseZ2M(arg('z2m') && fs.existsSync(arg('z2m')) ? fs.readFileSync(arg('z2m'), 'utf8') : null);
  const zha = parseZHA(arg('zha'));
  const johan = parseJohan(arg('johan'));
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { couples: {} };
  const know = (() => { try { return require(path.join(ROOT, 'data', 'dp_couple_knowledge.json')).couples || {}; } catch { return {}; } })();
  const knowLc = new Map(Object.entries(know).map(([k, v]) => [k.toLowerCase(), v]));
  const sys = homeySystemCaps();
  const curated = new Map();
  try {
    for (const f of JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ssot', 'curated-facts.json'), 'utf8')).facts || []) {
      for (const cpl of f.couples || []) { const [a, b] = cpl.split('|'); curated.set(`${a.toLowerCase()}|${b.toUpperCase()}`, f); }
    }
  } catch { /* optional */ }
  const couples = {};
  const driverInfo = {};
  let verified = 0; let listingOnly = 0; const unver = {};
  for (const [k, c] of loadDrivers()) {
    const lk = `${c.mfr.toLowerCase()}|${String(c.pid).toUpperCase()}`;
    const old = prev.couples?.[`${c.mfr.toLowerCase()}|${String(c.pid).toUpperCase()}`] || {};
    // Additive: keep previously recorded evidence even if a source is unreachable this run.
    const ev = new Map((old.sources || []).map((s) => [s.source, s]));
    for (const m of [z2m, zha, johan]) if (m.has(lk)) ev.set(m.get(lk).source, m.get(lk));
    const kn = knowLc.get(lk.toLowerCase());
    if (kn?.sources?.length) {
      const refs = kn.sources.slice(0, 12);
      // Internal seeds (registry / auto-seed) are not external evidence.
      const external = refs.some((r) => /z2m|zha|zigpy|deconz|blakadder|hubitat|forum|diag|issue|#\d|github|johan|iobroker|tasmota/i.test(String(r)));
      ev.set('repo-knowledge', { source: 'repo-knowledge', refs, external });
    }
    if (curated.has(lk)) { const f = curated.get(lk); ev.set('curated', { source: 'curated', refs: f.refs, external: true, buttons: f.buttons, events: f.events, battery: f.battery }); }
    const sources = [...ev.values()].map((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v != null)));
    for (const d of c.drivers) if (!driverInfo[d.id]) {
      const nonNative = d.capabilities.filter((x) => !HK_NATIVE.has(x.split('.')[0]));
      const custom = sys ? d.capabilities.filter((x) => !sys.has(x.split('.')[0])) : [];
      driverInfo[d.id] = { class: d.class, gangOrButtons: d.gangOrButtons, capabilities: d.capabilities,
        homekit: { service: HOMEKIT[d.class] || 'none', notNativeInHomeKit: nonNative,
          compensation: nonNative.length ? 'flow cards / custom capability / setting (t722u)' : null },
        customCapabilities: custom };
    }
    const drivers = c.drivers.map((d) => d.id);
    const strong = sources.some((x) => x.source === 'z2m' || x.source === 'zha' || (x.source === 'repo-knowledge' && x.external));
    const status = strong ? 'verified' : sources.length ? 'unverified' : 'none';
    const reason = strong ? undefined : sources.some((x) => x.source === 'johan-app') ? 'johan-listing-only' : 'internal-seed-only';
    // listing-only = Johan driver listing or internal seed only: kept, flagged for review, never removed automatically (t730u).
    if (status === 'none') {
      // Cross-product mfr x pid lists are huge (phantom couples): record per driver+mfr, not per couple.
      for (const d of drivers) { (unver[d] = unver[d] || {}); (unver[d][c.mfr] = unver[d][c.mfr] || []).push(c.pid); }
      continue;
    }
    if (status === 'verified') verified++; else listingOnly++;
    const ck = lk;
    if (couples[ck]) { couples[ck].variants = [...new Set([...(couples[ck].variants || []), c.mfr])]; couples[ck].drivers = [...new Set([...couples[ck].drivers, ...drivers])]; continue; }
    couples[ck] = { mfr: c.mfr, pid: c.pid, status, reason, sources, drivers,
      dps: kn?.dps ? Object.fromEntries(Object.entries(kn.dps).map(([n, v]) => [n, { name: v.name, tuyaType: v.tuyaType, capability: v.capability ?? null }])) : (old.dps || null),
      model: sources.find((s) => s.model)?.model || old.model || null, vendor: sources.find((s) => s.vendor)?.vendor || old.vendor || null,
      firstSeen: old.firstSeen || new Date().toISOString().slice(0, 10) };
  }
  let removedTombstones = 0;
  try { removedTombstones = addRemovalTombstones(couples, JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'couple-removal-evidence.json'), 'utf8'))); } catch { /* optional */ }
  const total = Object.keys(couples).length - removedTombstones;
  verified = Object.values(couples).filter((x) => x.status === 'verified').length; listingOnly = total - verified;
  const doc = { _meta: { generator: 'tools/ci/ssot-couple-enrich.js (P3136)', doctrine: 'Exact mfr+pid couples only; links not copies (CREDITS.md); unverified = no external/recorded source yet; additive, never read at pairing.',
    sourceUrls: { z2m: Z2M_URL, zha: ZHA_URL, johan: 'https://github.com/JohanBendz/com.tuya.zigbee' },
    counts: { total, verified, unverifiedWithInternalOrListingSource: listingOnly, removedTombstones, unverifiedMfrDriverPairs: Object.values(unver).reduce((a, o) => a + Object.keys(o).length, 0), z2m: z2m.size, zha: zha.size, johan: johan.size } }, drivers: driverInfo, couples, unverified: Object.fromEntries(Object.entries(unver).map(([d, o]) => [d, Object.keys(o).sort()])) };
  if (process.argv.includes('--check')) { console.log(JSON.stringify(doc._meta.counts)); return; }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(doc) + '\n');
  console.log(JSON.stringify(doc._meta.counts));
}
if (require.main === module) main();
module.exports = { parseZ2M, parseZHA, parseJohan, ID_RE, addRemovalTombstones };
