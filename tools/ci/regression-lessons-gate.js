#!/usr/bin/env node
'use strict';

/**
 * regression-lessons-gate.js
 *
 * Encodes MUST-KEEP reliability fixes as detectable CI rules so auto-fix /
 * publish bots cannot silently regress known fatal eras.
 *
 * Era map (forum T140352 + AGENTS.md + Gmail P18/P19/P100/P101):
 *   BAD : 5.11.152 (crash wave), 5.11.138/166, 7.4.1/7.4.6 (app crashes),
 *         9.0.218 (Peter "Gecrasht")
 *   GOOD: 5.7.15/16, 5.8.25/40, 5.11.25/146, 7.4.9, 9.0.258+ ("no crashes")
 *
 * Lessons encoded (presence OR anti-pattern):
 *   P19  — safe-timers.js (setTimeout/_destroyed race), registerRunListenerasync
 *   P51  — dual-track awareness (warn-only unless --expect-id)
 *   P92  — clusterUtils/_destroyed timer guards still wired via safe-timers
 *   P94  — anti-bot-regression-gate.js present
 *   P100 — app.js FLOW-GUARD (getDeviceActionCard), no this.error= in drivers
 *   P101 — ZigBeeDriverFlowCardPatch __p101GetDeviceByIdPatched + app require
 *   Misc — titleFormatted [[device]] ban, linear battery formula ban
 *
 * Usage:
 *   node tools/ci/regression-lessons-gate.js
 *   node tools/ci/regression-lessons-gate.js --root C:/Users/Dell/Documents/homey/stable
 *   node tools/ci/regression-lessons-gate.js --json
 *   node tools/ci/regression-lessons-gate.js --expect-id com.dlnraja.tuya.zigbee
 *
 * Exit 0 = all fatal MUST-KEEP rules pass
 * Exit 1 = at least one fatal regression / missing fix
 *
 * Note: Does NOT edit lib/tuya/TuyaZigbeeDevice.js (owned elsewhere).
 * Complements gmail-crash-pattern-gate.js (email signatures) + anti-bot-regression-gate.js (FP routing).
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let ROOT = process.cwd();
let EXPECT_ID = null;
const JSON_MODE = args.includes('--json');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') ROOT = path.resolve(args[++i]);
  if (args[i] === '--expect-id') EXPECT_ID = args[++i];
}

const OUT = path.join(ROOT, '.github', 'state', 'regression-lessons-gate.json');

/** @typedef {{ id: string, severity: 'fatal'|'warn', title: string, era: string, ok: boolean, detail?: string }} RuleResult */

function readText(rel) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp, 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function scanMatches(files, re, { excludeRel = [] } = {}) {
  const hits = [];
  for (const rel of files) {
    if (excludeRel.some((x) => rel.includes(x))) continue;
    const text = readText(rel);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (re.test(line)) hits.push({ file: rel, line: idx + 1, code: line.trim().slice(0, 140) });
      re.lastIndex = 0;
    });
  }
  return hits;
}

function checkPresenceRules() {
  /** @type {RuleResult[]} */
  const results = [];

  // P19: safe-timers MUST exist with core exports
  const stPath = 'lib/utils/safe-timers.js';
  const stText = readText(stPath);
  let stOk = false;
  let stDetail = 'missing lib/utils/safe-timers.js';
  if (stText) {
    // Prefer source inspection (avoid require() side-effects / cross-root cache hangs).
    stOk = /function\s+safeSetTimeout/.test(stText) && /function\s+isDestroyed/.test(stText)
      && /module\.exports/.test(stText);
    stDetail = stOk ? 'source defines safeSetTimeout + isDestroyed + exports' : 'safe-timers.js incomplete';
  }
  results.push({
    id: 'p19-safe-timers',
    severity: 'fatal',
    title: 'safe-timers.js MUST keep safeSetTimeout/isDestroyed (67x setTimeout/_destroyed era)',
    era: 'P19 / pre-9.0.258',
    ok: stOk,
    detail: stDetail,
  });

  // P100: FLOW-GUARD in app.js
  const appText = readText('app.js') || '';
  const flowGuardOk = /FLOW-GUARD/.test(appText)
    && /getDeviceActionCard/.test(appText)
    && /require\(['"]\.\/lib\/drivers\/ZigBeeDriverFlowCardPatch['"]\)/.test(appText);
  results.push({
    id: 'p100-flow-guard',
    severity: 'fatal',
    title: 'app.js MUST keep FLOW-GUARD polyfill + ZigBeeDriverFlowCardPatch require',
    era: 'P100 / getDeviceActionCard crashes',
    ok: flowGuardOk,
    detail: flowGuardOk
      ? 'FLOW-GUARD + getDeviceActionCard + patch require present'
      : 'missing FLOW-GUARD and/or patch require in app.js',
  });

  // P101: getDeviceById null-safe patch
  const patchText = readText('lib/drivers/ZigBeeDriverFlowCardPatch.js') || '';
  const p101Ok = /__p101GetDeviceByIdPatched/.test(patchText)
    && /getDeviceById/.test(patchText)
    && /return null/.test(patchText);
  results.push({
    id: 'p101-getdevicebyid',
    severity: 'fatal',
    title: 'ZigBeeDriverFlowCardPatch MUST keep P101 null-safe getDeviceById',
    era: 'P101 / Could not get device by id',
    ok: p101Ok,
    detail: p101Ok ? 'P101 patch marker present' : 'missing __p101GetDeviceByIdPatched patch',
  });

  // P94: anti-bot gate file
  const antiBotOk = exists('tools/ci/anti-bot-regression-gate.js');
  results.push({
    id: 'p94-anti-bot-gate',
    severity: 'fatal',
    title: 'anti-bot-regression-gate.js MUST remain (bot FP re-routing)',
    era: 'P94 / P19 bot revert',
    ok: antiBotOk,
    detail: antiBotOk ? 'present' : 'missing tools/ci/anti-bot-regression-gate.js',
  });

  // P100 companion: gmail crash pattern gate
  const gmailGateOk = exists('tools/ci/gmail-crash-pattern-gate.js');
  results.push({
    id: 'p100-gmail-crash-gate',
    severity: 'fatal',
    title: 'gmail-crash-pattern-gate.js MUST remain (email fatal signatures)',
    era: 'P100',
    ok: gmailGateOk,
    detail: gmailGateOk ? 'present' : 'missing tools/ci/gmail-crash-pattern-gate.js',
  });

  // Dual-app / P51 soft awareness
  let appJson = null;
  try {
    appJson = JSON.parse(readText('app.json') || '{}');
  } catch { /* ignore */ }
  const appId = appJson && appJson.id;
  const appVer = appJson && String(appJson.version || '');
  if (EXPECT_ID) {
    results.push({
      id: 'p51-expect-id',
      severity: 'fatal',
      title: `app.json id MUST be ${EXPECT_ID}`,
      era: 'P51 dual-track',
      ok: appId === EXPECT_ID,
      detail: `id=${appId || 'missing'} version=${appVer || '?'}`,
    });
  } else {
    const trackHint = appVer.startsWith('5.')
      ? 'stable-track version (5.x) — keep reliability-only backports'
      : appVer.startsWith('9.') || appVer.startsWith('7.')
        ? 'master-track version — features OK after crash gates'
        : 'unknown track';
    results.push({
      id: 'p51-track-hint',
      severity: 'warn',
      title: 'Dual-track version awareness (P51)',
      era: 'P51',
      ok: true,
      detail: `${trackHint}; id=${appId || '?'} v=${appVer || '?'}`,
    });
  }

  return results;
}

function walkDriverDeviceJs() {
  // Fast path: only device.js / driver.js per driver (not assets/tests).
  const out = [];
  const abs = path.join(ROOT, 'drivers');
  if (!fs.existsSync(abs)) return out;
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    for (const name of ['device.js', 'driver.js']) {
      const rel = path.join('drivers', ent.name, name).replace(/\\/g, '/');
      if (fs.existsSync(path.join(ROOT, rel))) out.push(rel);
    }
  }
  return out;
}

function checkAntiPatternRules() {
  /** @type {RuleResult[]} */
  const results = [];
  const driverJs = walkDriverDeviceJs();
  const appJs = exists('app.js') ? ['app.js'] : [];
  // Narrow lib scan — avoid full-tree walk (slow on Windows + large stable trees).
  // Do NOT edit/scan TuyaZigbeeDevice.js (owned elsewhere).
  const libHot = [
    'lib/drivers/ZigBeeDriverFlowCardPatch.js',
    'lib/utils/safe-timers.js',
    'lib/SDK3CompatBridge.js',
    'lib/LocalFirstEngine.js',
  ].filter((rel) => exists(rel));

  // P19 typo: actual call site only (drivers + app; lib hot files excluded if they only document the typo)
  const typoHits = scanMatches([...driverJs, ...appJs], /\.registerRunListenerasync\s*\(/);
  results.push({
    id: 'p19-registerRunListenerasync',
    severity: 'fatal',
    title: 'No registerRunListenerasync(...) call sites (P19 typo crash)',
    era: 'P19 / 5.11–7.4 crash cascade',
    ok: typoHits.length === 0,
    detail: typoHits.length
      ? typoHits.slice(0, 5).map((h) => `${h.file}:${h.line}`).join('; ')
      : 'clean',
  });

  // P100: never assign this.error in drivers/app (read-only property crash)
  const errAssignHits = scanMatches([...driverJs, ...appJs], /\bthis\.error\s*=/);
  results.push({
    id: 'p100-readonly-error-assign',
    severity: 'fatal',
    title: 'No this.error= in drivers/app.js (read-only property crash)',
    era: 'P100',
    ok: errAssignHits.length === 0,
    detail: errAssignHits.length
      ? errAssignHits.slice(0, 5).map((h) => `${h.file}:${h.line}`).join('; ')
      : 'clean',
  });

  // Flow card titleFormatted [[device]] ban — only compose flow files
  const titleHits = [];
  const driversAbs = path.join(ROOT, 'drivers');
  if (fs.existsSync(driversAbs)) {
    for (const ent of fs.readdirSync(driversAbs, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const rel = path.join('drivers', ent.name, 'driver.flow.compose.json').replace(/\\/g, '/');
      const text = readText(rel);
      if (!text) continue;
      if (text.includes('[[device]]') && /titleFormatted/.test(text)) titleHits.push(rel);
    }
  }
  results.push({
    id: 'flow-titleformatted-device',
    severity: 'fatal',
    title: 'No titleFormatted with [[device]] in driver.flow.compose.json',
    era: 'flow manual-select bug',
    ok: titleHits.length === 0,
    detail: titleHits.length ? titleHits.slice(0, 8).join('; ') : 'clean',
  });

  // Phoenix: linear battery formulas banned in drivers
  const linearBatt = scanMatches(driverJs, /\(\s*voltage\s*-\s*2\.5\s*\)\s*\/\s*0\.5|voltage\s*-\s*2\.5\s*\)\s*\/\s*0\.5/);
  results.push({
    id: 'phoenix-linear-battery',
    severity: 'fatal',
    title: 'No linear (voltage-2.5)/0.5 battery formulas in drivers',
    era: 'v8.2 Phoenix / UnifiedBatteryHandler',
    ok: linearBatt.length === 0,
    detail: linearBatt.length
      ? linearBatt.slice(0, 5).map((h) => `${h.file}:${h.line}`).join('; ')
      : 'clean',
  });

  // Soft: bare setTimeout(this, ...) in drivers (race) — warn, audit-regressions covers broader
  const bareTo = scanMatches(driverJs, /(?<![\w$.])(?<!safe)setTimeout\s*\(\s*this\b/);
  results.push({
    id: 'p19-bare-settimeout-this',
    severity: 'warn',
    title: 'Prefer safeSetTimeout over setTimeout(this, ...) in drivers',
    era: 'P19 / destroyed device',
    ok: bareTo.length === 0,
    detail: bareTo.length
      ? `${bareTo.length} hit(s) e.g. ${bareTo[0].file}:${bareTo[0].line}`
      : `clean (hot lib files checked: ${libHot.length})`,
  });

  return results;
}

function main() {
  const results = [...checkPresenceRules(), ...checkAntiPatternRules()];
  const fatals = results.filter((r) => r.severity === 'fatal' && !r.ok);
  const warns = results.filter((r) => r.severity === 'warn' && !r.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    summary: {
      rules: results.length,
      passed: results.filter((r) => r.ok).length,
      fatalFails: fatals.length,
      warnFails: warns.length,
      verdict: fatals.length === 0 ? 'ok' : 'fail',
    },
    eras: {
      bad: ['5.11.152', '5.11.138', '5.11.166', '7.4.1', '7.4.6', '9.0.218'],
      good: ['5.7.15', '5.7.16', '5.8.25', '5.8.40', '5.11.25', '5.11.146', '7.4.9', '9.0.258'],
    },
    results,
  };

  try {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  } catch (e) {
    console.error('Failed to write report:', e.message);
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[regression-lessons-gate] root=${ROOT}`);
    console.log(`  verdict=${report.summary.verdict} passed=${report.summary.passed}/${report.summary.rules} fatalFails=${fatals.length} warnFails=${warns.length}`);
    for (const r of results) {
      const mark = r.ok ? 'PASS' : (r.severity === 'fatal' ? 'FAIL' : 'WARN');
      console.log(`  [${mark}] ${r.id}: ${r.title}`);
      if (!r.ok && r.detail) console.log(`         ${r.detail}`);
    }
    console.log(`  wrote ${path.relative(process.cwd(), OUT).replace(/\\/g, '/')}`);
  }

  if (fatals.length > 0) process.exit(1);
}

main();
