#!/usr/bin/env node
/**
 * battery-button-intelligence-gate.js — P180
 *
 * Report-only static gate for the two subsystems that silently degrade without
 * ever throwing: battery percentage reporting and button / SOS alarm wiring.
 * Every rule below encodes a bug that actually shipped, so a regression is
 * caught in CI instead of on a user's Homey.
 *
 * Rules
 *   B1  no-op battery transform (`v * 0`) — capability pinned to 0% forever
 *   B2  raw ZCL batteryPercentageRemaining without the 0-200 -> 0-100 convention
 *   B3  banned linear voltage-to-percent formulas
 *   B4  energy.batteries declared without any battery capability
 *   C1  compose declares alarm_generic but device.js never drives it
 *   F1  marketing model names (ZG-*) used as Zigbee productId — they never match
 *
 * Usage:
 *   node tools/ci/battery-button-intelligence-gate.js
 *   node tools/ci/battery-button-intelligence-gate.js --json
 *   node tools/ci/battery-button-intelligence-gate.js --strict   # exit 1 on errors
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');
const REPORT_MD = path.join(ROOT, 'reports', 'BATTERY_BUTTON_INTELLIGENCE.md');
const REPORT_JSON = path.join(ROOT, '.github', 'state', 'battery-button-intelligence.json');

const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const STRICT = args.includes('--strict');

// The single sanctioned entry point for ZCL battery maths.
const HELPER_TOKENS = [
  'normalizeZclBatteryPercent',
  'normalizeZclBatteryVoltagePercent',
  'UnifiedBatteryHandler',
  'ZclBatteryMonitor',
];

// Files that legitimately contain the banned patterns (helper, gate, docs).
const RULE_EXEMPT = new Set([
  path.join('lib', 'battery', 'zcl-percent.js'),
  path.join('lib', 'battery', 'BatteryCore.js'),
  path.join('tools', 'ci', 'battery-button-intelligence-gate.js'),
]);

const findings = [];

function addFinding(rule, severity, file, line, message) {
  findings.push({ rule, severity, file, line, message });
}

function listFiles(dir, filename) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(dir, e.name, filename))
    .filter((p) => fs.existsSync(p));
}

function walkJs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, acc);
    else if (entry.name.endsWith('.js')) acc.push(full);
  }
  return acc;
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function isExempt(file) {
  return RULE_EXEMPT.has(path.relative(ROOT, file));
}

// ---------------------------------------------------------------------------
// B1 — no-op battery transform: `v * 0` clamps the capability to 0% forever.
// ---------------------------------------------------------------------------
const NOOP_TRANSFORM = /Math\.(?:min|max)\s*\(\s*Math\.(?:min|max)\s*\(\s*\w+\s*\*\s*0\s*\)/;

// ---------------------------------------------------------------------------
// B2 — raw ZCL percentage. The attribute is 0-200; rounding it as-is doubles
//      the reported charge on spec-compliant devices.
// ---------------------------------------------------------------------------
const RAW_ZCL_PERCENT = /Math\.round\(\s*[\w?.]*\.?batteryPercentageRemaining\s*\)/;
const RAW_ZCL_PERCENT_CLAMPED = /Math\.(?:min|max)\([^)]*Math\.round\(\s*[\w?.]*\.?batteryPercentageRemaining\s*\)/;

// ---------------------------------------------------------------------------
// B3 — linear voltage curves. A CR2032 at 2.7V is ~20%, not ~55%.
// ---------------------------------------------------------------------------
const LINEAR_VOLTAGE = [
  /\(\s*(?:voltage|v|safeParse\(v\))\s*-\s*2\.\d+\s*\)\s*\/\s*0?\.\d+/,
  /\(\s*[\w.()]*\s*-\s*2\.\d+\s*\)\s*\/\s*\(\s*3\.\d+\s*-\s*2\.\d+\s*\)/,
  /\(\s*[\w.()]*\s*-\s*2\.0\s*\)\s*\*\s*100\s*\/\s*\(\s*3\.0\s*-\s*2\.0\s*\)/,
];

/**
 * Blanks out comments while preserving line numbering, so a rule that documents
 * a banned pattern in a header comment does not report itself.
 */
function codeOnlyLines(source) {
  const out = [];
  let inBlock = false;
  for (const raw of source.split(/\r?\n/)) {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf('*/');
      if (end === -1) { out.push(''); continue; }
      line = line.slice(end + 2);
      inBlock = false;
    }
    for (;;) {
      const start = line.indexOf('/*');
      if (start === -1) break;
      const end = line.indexOf('*/', start + 2);
      if (end === -1) { line = line.slice(0, start); inBlock = true; break; }
      line = line.slice(0, start) + line.slice(end + 2);
    }
    const slash = line.indexOf('//');
    if (slash !== -1) line = line.slice(0, slash);
    // Emptied string literals: log messages and lesson registries describe the
    // banned patterns verbatim and must not count as violations.
    line = line
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/`(?:\\.|[^`\\])*`/g, '``');
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------
// B5 — the ZCL batteryVoltage unit is not fixed in practice: devices report
//      volts, 100mV steps or millivolts. A hardcoded divisor guesses wrong.
// ---------------------------------------------------------------------------
const HARDCODED_VOLTAGE_UNIT = /batteryVoltage[\w.?\])\s]*\/\s*(?:10|100|1000)\b/;

function scanSource(file) {
  if (isExempt(file)) return;
  const lines = codeOnlyLines(fs.readFileSync(file, 'utf8'));

  lines.forEach((text, idx) => {
    const line = idx + 1;

    if (NOOP_TRANSFORM.test(text)) {
      addFinding('B1', 'error', rel(file), line,
        'battery transform multiplies by 0 — capability is pinned to 0%');
    }

    if (RAW_ZCL_PERCENT.test(text) || RAW_ZCL_PERCENT_CLAMPED.test(text)) {
      const usesHelper = HELPER_TOKENS.some((t) => text.includes(t));
      const divides = /batteryPercentageRemaining\s*\/\s*2/.test(text);
      if (!usesHelper && !divides) {
        addFinding('B2', 'error', rel(file), line,
          'raw batteryPercentageRemaining (0-200) used as a percentage — route through lib/battery/zcl-percent.js');
      }
    }

    for (const re of LINEAR_VOLTAGE) {
      if (re.test(text)) {
        addFinding('B3', 'error', rel(file), line,
          'linear voltage-to-percent formula — use UnifiedBatteryHandler discharge curves');
        break;
      }
    }

    if (HARDCODED_VOLTAGE_UNIT.test(text) && !HELPER_TOKENS.some((t) => text.includes(t))) {
      addFinding('B5', 'warn', rel(file), line,
        'batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent');
    }
  });
}

// ---------------------------------------------------------------------------
// Compose-level rules
// ---------------------------------------------------------------------------

const alarmCapableCache = new Map();

/** True when the file, or any lib module it requires, references alarm_generic. */
function drivesAlarmGeneric(devicePath) {
  const src = fs.readFileSync(devicePath, 'utf8');
  if (src.includes('alarm_generic')) return true;

  const dir = path.dirname(devicePath);
  for (const match of src.matchAll(/require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g)) {
    let target = path.resolve(dir, match[1]);
    if (!target.startsWith(LIB_DIR)) continue;
    if (!target.endsWith('.js')) target += '.js';
    if (!fs.existsSync(target)) continue;

    if (!alarmCapableCache.has(target)) {
      alarmCapableCache.set(target, fs.readFileSync(target, 'utf8').includes('alarm_generic'));
    }
    if (alarmCapableCache.get(target)) return true;
  }
  return false;
}
function scanCompose() {
  for (const composePath of listFiles(DRIVERS_DIR, 'driver.compose.json')) {
    const driver = path.basename(path.dirname(composePath));
    let compose;
    try {
      compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (err) {
      addFinding('B4', 'error', rel(composePath), 0, `unparseable compose: ${err.message}`);
      continue;
    }

    const caps = compose.capabilities || [];
    const batteries = compose.energy && compose.energy.batteries;
    const hasBatteryCap = caps.some((c) => String(c).startsWith('measure_battery') || String(c).startsWith('alarm_battery'));

    if (Array.isArray(batteries) && batteries.length && !hasBatteryCap) {
      addFinding('B4', 'warn', rel(composePath), 0,
        `energy.batteries [${batteries.join(', ')}] declared but no battery capability — phantom battery in the Homey UI`);
    }

    const devicePath = path.join(path.dirname(composePath), 'device.js');
    if (caps.includes('alarm_generic') && fs.existsSync(devicePath) && !drivesAlarmGeneric(devicePath)) {
      addFinding('C1', 'error', rel(devicePath), 0,
        `${driver} declares alarm_generic but neither device.js nor its base class drives it — the alarm can never fire`);
    }

    if (fs.existsSync(devicePath)) {
      const src = fs.readFileSync(devicePath, 'utf8');
      const runtimeCaps = new Set();
      for (const match of src.matchAll(/addCapability\(\s*['"]([\w.]+)['"]\s*\)/g)) {
        if (!caps.includes(match[1])) runtimeCaps.add(match[1]);
      }
      for (const cap of runtimeCaps) {
        addFinding('C2', 'warn', rel(devicePath), 0,
          `${driver} adds "${cap}" at runtime but the manifest does not declare it — Homey has no title, unit or energy metadata for it`);
      }
    }

    const pids = (compose.zigbee && compose.zigbee.productId) || [];
    const marketing = pids.filter((p) => /^ZG-\d/i.test(String(p)));
    if (marketing.length) {
      addFinding('F1', 'warn', rel(composePath), 0,
        `marketing model names used as productId (${marketing.join(', ')}) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json`);
    }
  }
}

// ---------------------------------------------------------------------------

function main() {
  for (const file of listFiles(DRIVERS_DIR, 'device.js')) scanSource(file);
  for (const file of walkJs(LIB_DIR)) scanSource(file);
  scanCompose();

  const errors = findings.filter((f) => f.severity === 'error');
  const warns = findings.filter((f) => f.severity === 'warn');
  const byRule = findings.reduce((acc, f) => {
    acc[f.rule] = (acc[f.rule] || 0) + 1;
    return acc;
  }, {});

  const summary = {
    generatedAt: new Date().toISOString(),
    totals: { errors: errors.length, warnings: warns.length },
    byRule,
    findings,
  };

  fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2));

  const md = [
    '# Battery / Button Intelligence Gate',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `- Errors: **${errors.length}**`,
    `- Warnings: **${warns.length}**`,
    '',
    '| Rule | Severity | File | Line | Detail |',
    '|------|----------|------|------|--------|',
    ...findings.map((f) => `| ${f.rule} | ${f.severity} | \`${f.file}\` | ${f.line || '-'} | ${f.message} |`),
    '',
  ].join('\n');
  fs.mkdirSync(path.dirname(REPORT_MD), { recursive: true });
  fs.writeFileSync(REPORT_MD, md);

  if (AS_JSON) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    console.log('[battery-button-gate] errors=%d warnings=%d', errors.length, warns.length);
    for (const [rule, count] of Object.entries(byRule)) console.log(`  ${rule}: ${count}`);
    for (const f of errors.slice(0, 40)) console.log(`  ERROR ${f.rule} ${f.file}:${f.line} ${f.message}`);
    console.log(`[battery-button-gate] report: ${rel(REPORT_MD)}`);
  }

  process.exit(STRICT && errors.length ? 1 : 0);
}

main();
