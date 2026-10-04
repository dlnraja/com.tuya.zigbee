#!/usr/bin/env node
'use strict';

/**
 * Build config/flow/dead-flow-autowire.json (P2803).
 *
 * WHY: the Bastien flow audit found driver triggers that are never fired and
 * conditions that have no run listener. Their titles are clear ("Motion
 * detected", "Temperature is above", "Door locked") and the driver HAS the
 * matching capability, but the ids are hashed or driver-specific, so the
 * generic emitters never match them. This script maps each such card to a
 * capability from its English title + argument + driver capabilities. Only
 * unambiguous cases are mapped; everything else stays as it is.
 *
 * Usage: node tools/flow/build-dead-flow-autowire.js [--audit <flows-audit.json>] [--check]
 *   --audit  keep only ids the audit reports DEAD (extra guard against double fire)
 *   --check  exit 1 if the committed JSON differs from a fresh build
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'config', 'flow', 'dead-flow-autowire.json');

// [regex on lowercased title.en (without !{{..}}), capability preference list, value]
const TRIGGER_RULES = [
  [/^(motion detected|presence detected)$/, (c, t) => /presence/.test(t) ? ['alarm_human', 'alarm_motion'] : ['alarm_motion'], true],
  [/^(motion cleared|no motion|presence cleared)$/, (c, t) => /presence/.test(t) ? ['alarm_human', 'alarm_motion'] : ['alarm_motion'], false],
  [/^smoke detected$/, () => ['alarm_smoke'], true],
  [/^smoke cleared$/, () => ['alarm_smoke'], false],
  [/^tamper (alert|alarm)$/, () => ['alarm_tamper'], true],
  [/^(water leak detected|water alarm)$/, () => ['alarm_water'], true],
  [/^no water leak$/, () => ['alarm_water'], false],
  [/^door locked$/, () => ['locked'], true],
  [/^door unlocked$/, () => ['locked'], false],
  [/^gas alarm cleared$/, () => ['alarm_gas'], false],
  [/^co alarm cleared$/, () => ['alarm_co'], false],
  [/^co2 alert triggered$/, () => ['alarm_co2'], true],
  [/^co2 returned to normal$/, () => ['alarm_co2'], false],
  [/^battery (is )?low$/, () => ['alarm_battery'], true],
  [/^turned on$/, () => ['onoff'], true],
  [/^turned off$/, () => ['onoff'], false],
  [/^temperature changed$/, () => ['measure_temperature'], 'change'],
  [/^target temperature changed$/, () => ['target_temperature'], 'change'],
  [/^humidity changed$/, () => ['measure_humidity'], 'change'],
  [/^(power changed|power consumption changed)$/, () => ['measure_power'], 'change'],
  [/^voltage changed$/, () => ['measure_voltage'], 'change'],
  [/^current changed$/, () => ['measure_current'], 'change'],
  [/^energy consumption changed$/, () => ['meter_power'], 'change'],
  [/^illuminance changed$/, () => ['measure_luminance'], 'change'],
  [/^brightness changed$/, () => ['dim'], 'change']
];

// [regex, capability preference list, op] ; op: true | above | below
const CONDITION_RULES = [
  [/^(soil )?temperature (is )?above$/, () => ['measure_temperature'], 'above'],
  [/^(soil )?temperature (is )?below$/, () => ['measure_temperature'], 'below'],
  [/^soil moisture (is )?above$/, () => ['measure_humidity.soil', 'measure_humidity'], 'above'],
  [/^soil moisture (is )?below$/, () => ['measure_humidity.soil', 'measure_humidity'], 'below'],
  [/^humidity (is )?above$/, () => ['measure_humidity'], 'above'],
  [/^humidity (is )?below$/, () => ['measure_humidity'], 'below'],
  [/^battery (is )?above$/, () => ['measure_battery'], 'above'],
  [/^battery (is )?below$/, () => ['measure_battery'], 'below'],
  [/^battery voltage (is )?below$/, () => ['measure_voltage'], 'below'],
  [/^power (is )?above$/, () => ['measure_power'], 'above'],
  [/^power (is )?below$/, () => ['measure_power'], 'below'],
  [/^energy (is )?above$/, () => ['meter_power'], 'above'],
  [/^(co2 level is|co2|co) (is )?above$/, () => ['measure_co2'], 'above'],
  [/^illuminance (is )?above$/, () => ['measure_luminance'], 'above'],
  [/^illuminance (is )?below$/, () => ['measure_luminance'], 'below'],
  [/^motion (is )?detected$/, () => ['alarm_motion'], true],
  [/^someone (is )?present$/, () => ['alarm_human', 'alarm_motion'], true],
  [/^smoke (is )?detected$/, () => ['alarm_smoke'], true],
  [/^tamper (is )?active$/, () => ['alarm_tamper'], true],
  [/^water (is )?detected$/, () => ['alarm_water'], true],
  [/^(plug )?(is )?on$/, () => ['onoff'], true],
  [/^child lock is enabled$/, () => ['child_lock'], true],
  [/^(door|lock) (is )?locked$/, () => ['locked'], true]
];

function normTitle(t) {
  return String(t || '').toLowerCase()
    .replace(/!\{\{([^|}]*)\|[^}]*\}\}/g, '$1') // keep the positive branch
    .replace(/\s+/g, ' ').replace(/[.…]+$/, '').trim();
}

function driverCaps(dir) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', dir, 'driver.compose.json'), 'utf8'));
    return Array.isArray(j.capabilities) ? j.capabilities : [];
  } catch (_) { return []; }
}

function pick(prefs, caps) { return prefs.find((c) => caps.includes(c)) || null; }

function numericArg(card) {
  const a = (card.args || []).find((x) => x && x.type === 'number' || x && x.type === 'range');
  return a ? a.name : null;
}

function loadAuditDead(file) {
  if (!file) {return null;}
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dead = new Set();
  for (const r of j.rows || []) {
    if (/^DEAD/.test(r.status)) {dead.add(r.id);}
  }
  return dead;
}

/** Ids quoted literally in JS (drivers/, lib/, app.js): already handled somewhere, never auto-wire. */
function literalJsIds() {
  const ids = new Set();
  const suffixes = new Set();
  const re = /['"`]([a-z0-9_.]+)['"`]/g;
  const tpl = /\}(_[a-z0-9_]+)`/g; // `${driverId}_motion_detected` style template ids
  const scan = (src) => {
    for (const m of src.matchAll(re)) {ids.add(m[1]);}
    for (const m of src.matchAll(tpl)) {suffixes.add(m[1]);}
  };
  const walk = (d) => {
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (_) { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'assets') {walk(p);} } else if (e.name.endsWith('.js')) {
        scan(fs.readFileSync(p, 'utf8'));
      }
    }
  };
  walk(path.join(ROOT, 'drivers'));
  walk(path.join(ROOT, 'lib'));
  try { scan(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8')); } catch (_) { /* no app.js */ }
  return {
    // strict (no audit): also skip `${driver}_${literal}` ids, since code may build them at runtime
    has: (id, driver, strict) => ids.has(id) || [...suffixes].some((sfx) => id.endsWith(sfx))
      || (strict && id.startsWith(`${driver}_`) && ids.has(id.slice(driver.length + 1)))
  };
}

function build({ auditFile, strict } = {}) {
  const dead = loadAuditDead(auditFile);
  const strictIds = strict === undefined ? !dead : Boolean(strict);
  const literal = literalJsIds();
  const out = { _comment: 'Generated by tools/flow/build-dead-flow-autowire.js (P2803). Do not edit by hand.', triggers: {}, conditions: {} };
  const dirs = fs.readdirSync(path.join(ROOT, 'drivers')).sort();
  for (const dir of dirs) {
    const f = path.join(ROOT, 'drivers', dir, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) {continue;}
    let flow;
    try { flow = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { continue; }
    const caps = driverCaps(dir);
    for (const t of flow.triggers || []) {
      if (!t || !t.id || (dead && !dead.has(t.id)) || literal.has(t.id, dir, strictIds)) {continue;}
      const title = normTitle(t.title && t.title.en);
      for (const [re, prefs, when] of TRIGGER_RULES) {
        if (!re.test(title)) {continue;}
        const cap = pick(prefs(caps, title), caps);
        if (cap) {out.triggers[t.id] = { driver: dir, cap, when };}
        break;
      }
    }
    for (const c of flow.conditions || []) {
      if (!c || !c.id || (dead && !dead.has(c.id)) || literal.has(c.id, dir, strictIds)) {continue;}
      const title = normTitle(c.title && c.title.en);
      for (const [re, prefs, op] of CONDITION_RULES) {
        if (!re.test(title)) {continue;}
        const cap = pick(prefs(caps, title), caps);
        const arg = op === true ? null : numericArg(c);
        if (cap && (op === true || arg)) {
          out.conditions[c.id] = { driver: dir, cap, op, ...arg ? { arg } : {} };
        }
        break;
      }
    }
  }
  return out;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const ai = argv.indexOf('--audit');
  const auditFile = ai >= 0 ? argv[ai + 1] : null;
  const fresh = build({ auditFile, strict: argv.includes('--check') ? false : undefined });
  const text = `${JSON.stringify(fresh, null, 2)}\n`;
  if (argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    const curJ = cur ? JSON.parse(cur) : { triggers: {}, conditions: {} };
    // Without the audit, a fresh build is a superset; check committed entries still map the same way.
    const bad = [];
    for (const kind of ['triggers', 'conditions']) {
      for (const [id, v] of Object.entries(curJ[kind] || {})) {
        if (JSON.stringify(fresh[kind][id]) !== JSON.stringify(v)) {bad.push(`${kind}:${id}`);}
      }
    }
    if (bad.length) { console.error(`[P2803] stale entries: ${bad.slice(0, 20).join(', ')}`); process.exit(1); }
    console.log(`[P2803] ${Object.keys(curJ.triggers).length} triggers / ${Object.keys(curJ.conditions).length} conditions OK`);
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`[P2803] wrote ${Object.keys(fresh.triggers).length} triggers / ${Object.keys(fresh.conditions).length} conditions`);
}

module.exports = { build, normTitle, TRIGGER_RULES, CONDITION_RULES };
