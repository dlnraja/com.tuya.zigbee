#!/usr/bin/env node
'use strict';
/*
 * Smart-home ecosystem audit (Matter Bridge -> Apple Home / Google Home / Alexa / SmartThings /
 * Home Assistant, plus Homey's own Google Assistant and Alexa integrations).
 *
 * Read-only. Reports, per driver, what each ecosystem can see from the driver's class and
 * standard capabilities. Never rewrites anything (additive fixes are done by hand, per driver).
 *
 * Sources (verified 2026-10-04):
 *  - Matter Bridge mapping: github.com/athombv/com.athom.matter-bridge lib/MatterBridgeServer.mjs
 *    @045787d (2026-09-14). The bridge switches on `device.virtualClass || device.class` and only
 *    reads exact capability ids (sub-capabilities such as onoff.gang2 are NOT exposed).
 *  - Alexa (Homey skill): support.homey.app "Control devices with Amazon Alexa" (2026-04-10):
 *    sockets, switches, lights, fans, thermostats, door locks, blinds and curtains, TVs, speakers,
 *    other devices with on/off.
 *  - Google Assistant (Homey integration): apps.developer.homey.app "Drivers & Devices" -> class +
 *    system capabilities drive the mapping; no public per-class table, so the audit only checks
 *    that a valid non-"other" class and at least one system capability are present.
 *  - SmartThings has no native Homey export: it sees Homey devices only through the Matter Bridge.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

// Matter Bridge mapping, extracted from Athom's source into data/matter-bridge-mapping.json.
const MAPPING = require(path.join(ROOT, 'data', 'matter-bridge-mapping.json'));
function resolveClass(cls) {
  let c = MAPPING.classes[cls];
  if (c && c.sameAs) {c = { ...MAPPING.classes[c.sameAs], ...c, capabilities: MAPPING.classes[c.sameAs].capabilities };}
  return c || null;
}
const MATTER_MAP = Object.freeze(Object.fromEntries(Object.keys(MAPPING.classes)
  .map((k) => [k, Object.keys(resolveClass(k).capabilities)])));
const MATTER_DEFAULT = Object.keys(MAPPING.default.capabilities);
const MATTER_ANY = new Set([].concat(...Object.values(MATTER_MAP), MATTER_DEFAULT));
const THERMO_MODES = new Set(['off', 'heat', 'cool', 'auto']);

function matterTypeFor(cls, cap) {
  const c = resolveClass(cls);
  if (!c) {return MAPPING.default.matterDeviceType;}
  const m = c.capabilities[cap] || {};
  return m.deviceType || m.extraEndpoint || c.matterDeviceType;
}

const ALEXA_CLASSES = new Set(['socket', 'light', 'fan', 'thermostat', 'lock', 'windowcoverings',
  'blinds', 'curtain', 'shutterblinds', 'sunshade', 'tv', 'speaker']);

function systemCapabilities() {
  try { return new Set(Object.keys(require('homey-lib').getCapabilities())); } catch { return null; }
}
function validClasses() {
  try { return new Set(Object.keys(require('homey-lib').getDeviceClasses())); } catch { return null; }
}

function capIds(compose) {
  return (Array.isArray(compose.capabilities) ? compose.capabilities : [])
    .map((c) => typeof c === 'string' ? c : c && c.id)
    .filter(Boolean)
    .map(String);
}

function auditDriver(id, compose, sys, classes) {
  const cls = String(compose.class || '');
  const caps = capIds(compose);
  const base = (c) => c.split('.')[0];
  const isSys = (c) => sys ? sys.has(base(c)) : !/^[a-z]+_custom|^tuya_/.test(c);
  const mapped = MATTER_MAP[cls] || MATTER_DEFAULT;
  const matter = caps.filter((c) => mapped.includes(c));
  const hidden = caps.filter((c) => MATTER_ANY.has(c) && !mapped.includes(c));
  const subOnly = caps.filter((c) => c.includes('.') && MATTER_ANY.has(base(c)) && !caps.includes(base(c)));
  const standard = caps.filter(isSys);
  const custom = caps.filter((c) => !isSys(c));
  const findings = [];
  // Thermostat-family: custom thermostat_mode values with none of off/heat/cool/auto -> not bridged at all.
  const famThermo = ['thermostat', 'heatpump', 'heater', 'airconditioning'].includes(cls);
  const modeOpt = compose.capabilitiesOptions && compose.capabilitiesOptions.thermostat_mode;
  if (famThermo && caps.includes('thermostat_mode') && modeOpt && Array.isArray(modeOpt.values)
    && !modeOpt.values.some((v) => THERMO_MODES.has(String(v && v.id)))) {
    findings.push('thermostat_mode has only custom values: Matter Bridge skips the whole device');
    matter.length = 0;
  }
  if (classes && cls && !classes.has(cls)) {findings.push(`invalid class "${cls}"`);}
  if (!matter.length) {findings.push('not exposed by Matter Bridge (no mapped capability for this class)');}
  if (hidden.length) {findings.push(`class "${cls}" hides bridge-mappable caps: ${hidden.join(', ')}`);}
  if (subOnly.length) {findings.push(`only sub-capabilities (not bridged): ${subOnly.join(', ')}`);}
  const alexa = ALEXA_CLASSES.has(cls) || caps.includes('onoff');
  if (!alexa) {findings.push('not in Alexa (class not supported and no onoff)');}
  const google = cls !== 'other' && standard.some((c) => !/^(measure|alarm)_battery$/.test(base(c)));
  if (!google) {findings.push('weak for Google (class other or only battery/custom capabilities)');}
  if (custom.length && !standard.some((c) => !/^(measure|alarm)_battery$/.test(base(c)))) {
    findings.push(`custom-only: ${custom.join(', ')} (mirror to closest standard capability or flow)`);
  }
  const exposed = Object.fromEntries(matter.map((c) => [c, matterTypeFor(cls, c)]));
  const notExposed = caps.filter((c) => !matter.includes(c));
  return { driver: id, class: cls, exposed, notExposed, matter, hidden, subOnly, alexa, google, custom, findings };
}

function run({ root = ROOT } = {}) {
  const sys = systemCapabilities();
  const classes = validClasses();
  const dir = path.join(root, 'drivers');
  const out = [];
  for (const id of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    let compose;
    try { compose = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {
      out.push({ driver: id, class: '?', matter: [], hidden: [], subOnly: [], alexa: false, google: false, custom: [], findings: [`invalid JSON: ${e.message}`] });
      continue;
    }
    out.push(auditDriver(id, compose, sys, classes));
  }
  const byClass = {};
  for (const r of out) {byClass[r.class] = (byClass[r.class] || 0) + 1;}
  return {
    total: out.length,
    matterExposed: out.filter((r) => r.matter.length).length,
    alexa: out.filter((r) => r.alexa).length,
    google: out.filter((r) => r.google).length,
    byClass,
    drivers: out,
  };
}

module.exports = { MAPPING, MATTER_MAP, matterTypeFor, ALEXA_CLASSES, auditDriver, run };

if (require.main === module) {
  const r = run();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(r, null, 2)  }\n`);
  } else {
    console.log(`[ecosystem-audit] drivers=${r.total} matterBridge=${r.matterExposed} alexa=${r.alexa} google=${r.google}`);
    for (const d of r.drivers.filter((x) => x.findings.length)) {
      console.log(`  ${d.driver} [${d.class}] ${d.findings.join(' | ')}`);
    }
  }
  // Report only: invalid classes are the single hard failure (they break Homey validation too).
  process.exit(r.drivers.some((d) => d.findings.some((f) => f.startsWith('invalid class'))) ? 1 : 0);
}
