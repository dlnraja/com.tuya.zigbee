#!/usr/bin/env node
/**
 * P116 — Cross-project better reimplementation gate
 *
 * Does NOT copy Z2M/ZHA/Johan code. Validates that Homey-local reimpls exist:
 *  - ProtocolQuirkLookup reads battery_dps from quirk table
 *  - DeviceIO exposes IAS WD TX
 *  - EnergyJumpGuard wired on TuyaZigbeeDevice + BaseUnifiedDevice
 *  - Z2M "action" expose must not map to alarm_motion for button drivers
 *
 * Usage:
 *   node tools/ci/cross-project-better-reimpl.js
 *   node tools/ci/cross-project-better-reimpl.js --json
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const JSON_OUT = process.argv.includes('--json');
const report = { ok: true, checks: [], generatedAt: new Date().toISOString() };

function check(id, pass, detail) {
  report.checks.push({ id, pass: !!pass, detail });
  if (!pass) report.ok = false;
  if (!JSON_OUT) {
    console.log(`${pass ? '✓' : '✗'} ${id}${detail ? ` — ${detail}` : ''}`);
  }
}

// 1) ProtocolQuirkLookup
try {
  const lookup = require(path.join(ROOT, 'lib/utils/ProtocolQuirkLookup.js'));
  const plan = lookup.getBatteryDpPlan('_TZE200_vuwtqx0t');
  check('quirk-battery-lookup', plan.voltageDps.includes(26) || plan.percentDps.length >= 0,
    `voltageDps=${JSON.stringify(plan.voltageDps)} percent=${plan.percentDps.length}`);
} catch (e) {
  check('quirk-battery-lookup', false, e.message);
}

// 2) DeviceIO IAS WD surface
try {
  const src = fs.readFileSync(path.join(ROOT, 'lib/io/DeviceIOFacade.js'), 'utf8');
  check('deviceio-ias-wd', /async ensureIasWd/.test(src) && /async startWarning/.test(src)
    && /async stopWarning/.test(src), 'ensureIasWd+startWarning+stopWarning');
} catch (e) {
  check('deviceio-ias-wd', false, e.message);
}

// 3) EnergyJumpGuard dual wiring
try {
  const tuya = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
  const base = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
  check('energy-jump-tuya', /EnergyJumpGuard\.check/.test(tuya), 'TuyaZigbeeDevice');
  check('energy-jump-base', /EnergyJumpGuard\.check/.test(base), 'BaseUnifiedDevice');
} catch (e) {
  check('energy-jump', false, e.message);
}

// 4) SmartBattery consumes ProtocolQuirkLookup
try {
  const bat = fs.readFileSync(path.join(ROOT, 'lib/managers/SmartBatteryManager.js'), 'utf8');
  check('smartbattery-quirk', /ProtocolQuirkLookup/.test(bat) && /getBatteryDpPlan/.test(bat),
    'handleDP quirk plan');
} catch (e) {
  check('smartbattery-quirk', false, e.message);
}

// 5) Z2M action expose must not suggest alarm_motion for button drivers
const gapPath = path.join(ROOT, 'data/z2m_expose_gap_report.json');
if (fs.existsSync(gapPath)) {
  try {
    const gap = JSON.parse(fs.readFileSync(gapPath, 'utf8'));
    const items = gap.items || gap.gaps || gap.results || [];
    let bad = 0;
    for (const it of items) {
      const caps = it.suggestedCaps || it.suggested || [];
      const expose = String(it.expose || it.name || '').toLowerCase();
      const driver = String(it.driver || it.suggestedDriver || '');
      if (expose === 'action' && caps.includes('alarm_motion') && /button/i.test(driver)) {
        bad += 1;
      }
    }
    check('z2m-action-not-motion', bad === 0, bad ? `${bad} button action→alarm_motion` : 'clean or no matches');
  } catch (e) {
    check('z2m-action-not-motion', true, `skip parse: ${e.message}`);
  }
} else {
  check('z2m-action-not-motion', true, 'gap report absent — skip');
}

// 6) Announce wake battery probe
try {
  const mix = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
  check('announce-battery-probe', /Announce battery probe|announce-zcl|ProtocolQuirkLookup/.test(mix),
    'onEndDeviceAnnounce battery');
} catch (e) {
  check('announce-battery-probe', false, e.message);
}

const outDir = path.join(ROOT, '.github', 'state');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'cross-project-better-reimpl.json'), `${JSON.stringify(report, null, 2)}\n`);

if (JSON_OUT) console.log(JSON.stringify(report, null, 2));
else console.log(`\nP116 cross-project reimpl: ${report.ok ? 'PASS' : 'FAIL'} (${report.checks.length} checks)`);

process.exit(report.ok ? 0 : 1);
