#!/usr/bin/env node
/**
 * p87-driver-flow-audit.js
 * =========================================================================
 * Aggregated audit:
 *   - For each driver, read driver.compose.json + driver.flow.compose.json
 *   - Detect:
 *     * Capabilities referenced in flow but missing from driver.compose.json
 *     * Buttons without flow trigger listener
 *     * Energy capabilities (meter_power, measure_voltage, etc.) without safeValue
 *     * Flow triggers that use unregistered button ID
 *
 * Outputs to .github/state/p87-driver-flow-audit.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, '.github', 'state', 'p87-driver-flow-audit.json');

const drivers = cp.execSync(
  `powershell -NoProfile -Command "Get-ChildItem -Path '${path.join(ROOT, 'drivers')}' -Directory | Select-Object -ExpandProperty FullName"`,
  { encoding: 'utf8' }
).split(/\r?\n/).filter(Boolean).map(p => p.replace(/\\/g, '/'));

console.error(`Auditing ${drivers.length} driver dirs`);

const FLOW_BUTTON_RE = /button\.(\d+)/g;
const ENERGY_CAPS = ['meter_power', 'measure_voltage', 'measure_current', 'measure_power', 'energy'];
const results = { drivers: [], summary: { total: 0, withFlow: 0, buttonWithoutTrigger: 0, energyWithoutSafeValue: 0, missingCap: 0 } };

for (const d of drivers) {
  const dName = d.split('/').pop();
  const composePath = path.join(d, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const flowPath = path.join(d, 'driver.flow.compose.json');
  const flow = fs.existsSync(flowPath) ? JSON.parse(fs.readFileSync(flowPath, 'utf8')) : null;
  const caps = compose.capabilities || [];
  const buttonsInDriver = [...caps.join(' ').matchAll(FLOW_BUTTON_RE)].map(m => parseInt(m[1]));
  const maxBtnInDriver = buttonsInDriver.length ? Math.max(...buttonsInDriver) : 0;

  // Flow triggers (button.X)
  const triggers = flow && flow.triggers ? flow.triggers : [];
  const triggerButtons = new Set();
  for (const t of triggers) {
    const m = (t.id || t.args?.[0] || '').match(/button[._]?(\d+)/i);
    if (m) triggerButtons.add(parseInt(m[1]));
  }

  // Flow actions referenced
  const actions = flow && flow.actions ? flow.actions : [];
  const actionCaps = new Set();
  for (const a of actions) {
    const m = (a.id || a.args?.[0] || '').match(/^(\w+)/);
    if (m) actionCaps.add(m[1]);
  }

  // Missing capability in driver but referenced in flow action
  const missingCaps = [...actionCaps].filter(c => c.includes('.') && !caps.includes(c));

  // Buttons in driver that have no trigger
  const buttonsWithoutTrigger = buttonsInDriver.filter(b => !triggerButtons.has(b));

  // Energy caps without safeValue comment in device.js
  const deviceJs = path.join(d, 'device.js');
  let energyCode = '';
  if (fs.existsSync(deviceJs)) {
    energyCode = fs.readFileSync(deviceJs, 'utf8');
  }
  const energyCaps = caps.filter(c => ENERGY_CAPS.includes(c) || c.startsWith('meter_'));
  const energyWithoutSafe = energyCaps.filter(c => {
    const safeVal = new RegExp(`safeSetCapabilityValue\\s*\\(\\s*['"]${c}['"]`).test(energyCode);
    return !safeVal;
  });

  results.drivers.push({
    driver: dName,
    caps: caps.length,
    hasFlow: !!flow,
    buttonsInDriver: buttonsInDriver.length,
    maxButton: maxBtnInDriver,
    buttonsWithoutTrigger,
    energyWithoutSafe,
    missingCaps
  });
  results.summary.total++;
  if (flow) results.summary.withFlow++;
  if (buttonsWithoutTrigger.length) results.summary.buttonWithoutTrigger++;
  if (energyWithoutSafe.length) results.summary.energyWithoutSafeValue++;
  if (missingCaps.length) results.summary.missingCap++;
}

fs.writeFileSync(OUT, JSON.stringify(results, null, 2));

// Top offenders
const topBtn = results.drivers.filter(d => d.buttonsWithoutTrigger.length).sort((a,b)=>b.buttonsWithoutTrigger.length - a.buttonsWithoutTrigger.length).slice(0, 10);
const topEnergy = results.drivers.filter(d => d.energyWithoutSafe.length).sort((a,b)=>b.energyWithoutSafe.length - a.energyWithoutSafe.length).slice(0, 10);
const topMissing = results.drivers.filter(d => d.missingCaps.length).sort((a,b)=>b.missingCaps.length - a.missingCaps.length).slice(0, 10);
console.log(JSON.stringify({
  totalDrivers: results.summary.total,
  withFlow: results.summary.withFlow,
  buttonIssues: results.summary.buttonWithoutTrigger,
  energyIssues: results.summary.energyWithoutSafeValue,
  missingCapIssues: results.summary.missingCap,
  topBtn: topBtn.map(d => ({ driver: d.driver, missing: d.buttonsWithoutTrigger })),
  topEnergy: topEnergy.map(d => ({ driver: d.driver, missing: d.energyWithoutSafe })),
  topMissing: topMissing.map(d => ({ driver: d.driver, missing: d.missingCaps }))
}, null, 2));
