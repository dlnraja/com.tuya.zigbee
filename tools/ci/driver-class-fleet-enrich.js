#!/usr/bin/env node
'use strict';

/**
 * driver-class-fleet-enrich.js (P2372)
 *
 * Enrich ALL Homey driver classes (button/socket/switch/sensor/light/curtain/
 * thermostat/meter/fan/lock/siren/ir/wifi) — coverage report + safe apply hooks.
 * Never invents productId. Never degrades mfr coverage.
 *
 * Usage:
 *   node tools/ci/driver-class-fleet-enrich.js
 *   node tools/ci/driver-class-fleet-enrich.js --apply
 *   node tools/ci/driver-class-fleet-enrich.js --class=sensor
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(ROOT, 'reports', `driver-class-enrich-${DATE}`);
const CFG_PATH = path.join(ROOT, 'config/enrichment/driver-class-coverage.json');
const APPLY = process.argv.includes('--apply');
const CLASS_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--class='));
  return a ? a.split('=')[1].toLowerCase() : null;
})();

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadCfg() {
  return readJson(CFG_PATH);
}

function classify(driverId, compose, cfg) {
  const id = String(driverId || '').toLowerCase();
  const cls = String(compose?.class || '').toLowerCase();
  for (const c of cfg.classes) {
    if (c.id === 'other') continue;
    if (cls && cls === c.id) return c.id;
    if ((c.patterns || []).some((p) => id.includes(p.toLowerCase()))) return c.id;
  }
  if (cls) return cls;
  return 'other';
}

function scanFleet(cfg) {
  const byClass = {};
  for (const c of cfg.classes) byClass[c.id] = [];

  const driversDir = path.join(ROOT, 'drivers');
  for (const name of fs.readdirSync(driversDir)) {
    const fp = path.join(driversDir, name, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    let compose;
    try {
      compose = readJson(fp);
    } catch {
      continue;
    }
    const classId = classify(name, compose, cfg);
    if (CLASS_FILTER && classId !== CLASS_FILTER) continue;
    if (!byClass[classId]) byClass[classId] = [];

    const flowPath = path.join(driversDir, name, 'driver.flow.compose.json');
    let flowTriggers = 0;
    if (fs.existsSync(flowPath)) {
      try {
        flowTriggers = (readJson(flowPath).triggers || []).length;
      } catch { /* ignore */ }
    }
    const mfrs = compose.zigbee?.manufacturerName || [];
    const pids = compose.zigbee?.productId || [];
    const caps = compose.capabilities || [];
    const settings = compose.settings || [];
    const gaps = [];
    if (compose.zigbee && mfrs.length === 0) gaps.push('empty_mfr');
    if (compose.zigbee && pids.length === 0) gaps.push('empty_pid');
    if (/button|remote|scene|knob|sos/i.test(name) && flowTriggers === 0 && !/ir_remote|wifi_ir/i.test(name)) {
      gaps.push('empty_button_flow');
    }
    if (caps.some((c) => /measure_power|meter_power/.test(c)) && !settings.some((s) => s.id === 'power_scale')) {
      gaps.push('missing_power_scale_setting');
    }

    byClass[classId].push({
      driverId: name,
      homeyClass: compose.class || null,
      mfrCount: mfrs.length,
      pidCount: pids.length,
      capCount: caps.length,
      settingCount: settings.length,
      flowTriggers,
      gaps,
      productIds: pids.slice(0, 6),
    });
  }
  return byClass;
}

function runSoft(rel, args = []) {
  const script = path.join(ROOT, rel);
  if (!fs.existsSync(script)) return { ok: false, skipped: true };
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300000,
    env: {
      ...process.env,
      FORUM_AUTO_POST: '0',
      SHADOW_FORUM: '1',
      AI_PLAN_MODE: 'forfait',
      AI_ALLOW_PAID: 'false',
      SMART_FETCH_READER_FALLBACK: process.env.SMART_FETCH_READER_FALLBACK || '1',
    },
  });
  return { ok: res.status === 0, exitCode: res.status, tail: `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-600) };
}

function applyPhases(neededPhases) {
  const results = [];
  const map = {
    'button-flow-harvest': ['tools/ci/button-flow-harvest.js', APPLY ? ['--apply-fixes'] : []],
    'flow-fleet-enrich': ['tools/ci/flow-fleet-enrich.js', APPLY ? ['--apply'] : []],
    settings: ['tools/ci/enrich-driver-settings-intelligent.js', APPLY ? ['--apply'] : []],
    'case-variants': ['tools/ci/ensure-case-variants.js', APPLY ? ['--apply'] : []],
    'infer-enrich': ['tools/ci/infer-enrich-from-incomplete.js', APPLY ? ['--apply'] : []],
    'curtain-couples': ['tools/ci/apply-curtain-couples.js', APPLY ? ['--apply'] : []],
    'harden-unknown': ['tools/ci/harden-unknown-zigbee.js', APPLY ? ['--apply'] : []],
    'harden-wifi-local': ['tools/ci/harden-wifi-local.js', []],
  };
  for (const phase of neededPhases) {
    const entry = map[phase];
    if (!entry) continue;
    results.push({ phase, ...runSoft(entry[0], entry[1]) });
  }
  return results;
}

const cfg = loadCfg();
const byClass = scanFleet(cfg);

const summary = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? 'apply' : 'dry-run',
  classFilter: CLASS_FILTER,
  neverInventProductId: true,
  classes: {},
  totals: { drivers: 0, withGaps: 0, mfrEntries: 0, flowTriggers: 0 },
  applyResults: [],
};

const phasesNeeded = new Set();
for (const [classId, drivers] of Object.entries(byClass)) {
  const withGaps = drivers.filter((d) => d.gaps.length > 0);
  summary.classes[classId] = {
    count: drivers.length,
    withGaps: withGaps.length,
    mfrEntries: drivers.reduce((s, d) => s + d.mfrCount, 0),
    flowTriggers: drivers.reduce((s, d) => s + d.flowTriggers, 0),
    gapSamples: withGaps.slice(0, 8).map((d) => ({ id: d.driverId, gaps: d.gaps })),
  };
  summary.totals.drivers += drivers.length;
  summary.totals.withGaps += withGaps.length;
  summary.totals.mfrEntries += summary.classes[classId].mfrEntries;
  summary.totals.flowTriggers += summary.classes[classId].flowTriggers;
  for (const p of cfg.enrichPhasesByClass?.[classId] || []) phasesNeeded.add(p);
}

if (APPLY || process.argv.includes('--run-phases')) {
  summary.applyResults = applyPhases([...phasesNeeded]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(OUT_DIR, 'by-class.json'), `${JSON.stringify(byClass, null, 2)}\n`);

const md = [
  `# Driver-class fleet enrich — ${DATE}`,
  '',
  `Mode: **${summary.mode}**`,
  '',
  `| Class | Drivers | Gaps | MFRs | Flow triggers |`,
  `|-------|--------:|-----:|-----:|--------------:|`,
  ...Object.entries(summary.classes)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, c]) => `| ${id} | ${c.count} | ${c.withGaps} | ${c.mfrEntries} | ${c.flowTriggers} |`),
  '',
  `**Totals:** ${summary.totals.drivers} drivers · ${summary.totals.mfrEntries} MFR entries · ${summary.totals.withGaps} with soft gaps`,
  '',
  'Doctrine: never invent productId · never degrade coverage · free scrape + forfait AI only.',
  '',
];
fs.writeFileSync(path.join(OUT_DIR, 'CLASS_ENRICH.md'), md.join('\n'));

console.log(JSON.stringify({
  ok: true,
  totals: summary.totals,
  classes: Object.fromEntries(Object.entries(summary.classes).map(([k, v]) => [k, v.count])),
  out: OUT_DIR,
}, null, 2));
process.exit(0);
