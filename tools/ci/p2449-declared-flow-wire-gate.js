#!/usr/bin/env node
'use strict';

/**
 * P2449 — Declared flow cards must be wirable (fleet) — optimized
 *
 * Uses ripgrep when available; otherwise scoped hotspot scan (not full tree walk).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const failures = [];
function ok(m) { console.log(`  ✅ ${m}`); }
function fail(m) { failures.push(m); console.error(`  ❌ ${m}`); }

const HOTSPOTS = [
  'drivers/smart_knob',
  'drivers/smart_knob_rotary',
  'drivers/smart_knob_switch',
  'drivers/button_wireless_1',
  'drivers/button_wireless_2',
  'drivers/button_wireless_3',
  'drivers/button_wireless_4',
  'drivers/button_wireless_smart',
  'drivers/wall_dimmer_tuya',
  'drivers/bulb_white',
  'lib/devices',
  'lib/mixins',
  'lib/flow',
  'lib/tuya',
  'lib/FlowCardHelper.js',
];

const BAD_ARITY = /getDeviceTriggerCard\s*\([^)]+,\s*['"]trigger['"]\s*\)/;

function walkJsScoped(relDirs, out = []) {
  for (const rel of relDirs) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const st = fs.statSync(abs);
    if (st.isFile()) {
      if (abs.endsWith('.js')) out.push(abs);
      continue;
    }
    for (const name of fs.readdirSync(abs)) {
      const p = path.join(abs, name);
      const s = fs.statSync(p);
      if (s.isDirectory()) {
        if (name === 'node_modules' || name === 'assets') continue;
        walkJsScoped([path.relative(ROOT, p)], out);
      } else if (name.endsWith('.js')) out.push(p);
    }
  }
  return out;
}

function scanBadArity() {
  // Prefer ripgrep (fast); fall back to scoped hotspot walk
  const rg = spawnSync(
    process.platform === 'win32' ? 'rg.exe' : 'rg',
    [
      '-n', '--glob', '*.js',
      String.raw`getDeviceTriggerCard\s*\([^)]+,\s*['"]trigger['"]\s*\)`,
      'drivers', 'lib',
    ],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true }
  );
  if (rg.status === 0 && rg.stdout) {
    const lines = rg.stdout.trim().split(/\r?\n/).filter(Boolean);
    for (const line of lines) fail(`two-arg getDeviceTriggerCard: ${line}`);
    return lines.length;
  }
  if (rg.status === 1 && !rg.stdout) {
    // rg found no matches
    return 0;
  }
  // rg missing or error → scoped walk
  let bad = 0;
  for (const file of walkJsScoped(HOTSPOTS)) {
    const src = fs.readFileSync(file, 'utf8');
    if (BAD_ARITY.test(src)) {
      fail(`two-arg getDeviceTriggerCard in ${path.relative(ROOT, file)}`);
      bad += 1;
    }
  }
  return bad;
}

console.log('P2449 declared flow wiring gate\n');

{
  const bad = scanBadArity();
  if (!bad) ok('no getDeviceTriggerCard(id, \'trigger\') misuse');
}

{
  const required = [
    'lib/flow/DeclaredFlowCardAutoWire.js',
    'lib/mixins/SmartKnobRotationMixin.js',
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(ROOT, rel))) fail(`missing ${rel}`);
    else ok(rel);
  }
  const loader = fs.readFileSync(path.join(ROOT, 'lib/flow/UniversalFlowCardLoader.js'), 'utf8');
  if (!/autoWireDeclaredFlowCards/.test(loader)) fail('UniversalFlowCardLoader missing autoWire hook');
  else ok('UniversalFlowCardLoader autoWire hook');

  const helper = fs.readFileSync(path.join(ROOT, 'lib/FlowCardHelper.js'), 'utf8');
  if (!/scene_recall/.test(helper)) fail('FlowCardHelper missing scene_recall registration');
  else ok('FlowCardHelper registers scene_recall');

  const button = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
  if (!/gang_button_scene_recall/.test(button)) {
    fail('ButtonDevice missing driver-scoped scene_recall try');
  } else ok('ButtonDevice driver-scoped scene_recall');

  const tuya = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
  if (!/emitBrightnessChanged/.test(tuya)) fail('TuyaZigbeeDevice missing brightness_changed emit');
  else ok('TuyaZigbeeDevice brightness_changed emit');

  const actuator = fs.readFileSync(path.join(ROOT, 'lib/flow/ActuatorFlowHelper.js'), 'utf8');
  if (!/registerBrightnessFlowCards/.test(actuator)) fail('ActuatorFlowHelper missing registerBrightnessFlowCards');
  else ok('ActuatorFlowHelper.registerBrightnessFlowCards');

  const autoWire = fs.readFileSync(path.join(ROOT, 'lib/flow/DeclaredFlowCardAutoWire.js'), 'utf8');
  if (!/__p2449BrightnessChangedIds/.test(autoWire)) {
    fail('DeclaredFlowCardAutoWire missing brightness id cache');
  } else ok('DeclaredFlowCardAutoWire brightness cache');
}

{
  const buttons = [
    'button_wireless_1',
    'button_wireless_2',
    'button_wireless_3',
    'button_wireless_4',
    'smart_knob',
  ];
  for (const id of buttons) {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers', id, 'driver.flow.compose.json'), 'utf8'
    ));
    const ids = (flow.triggers || []).map((t) => t.id);
    if (!ids.some((x) => /scene_recall/.test(x))) fail(`${id} missing scene_recall trigger`);
    else ok(`${id} has scene_recall`);
  }
}

{
  const ssot = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'config/architecture/rotary-knob-ssot.json'), 'utf8'
  ));
  const required = ssot.flowUx?.requiredTriggersByDriver || {};
  for (const [driverId, ids] of Object.entries(required)) {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, `drivers/${driverId}/driver.flow.compose.json`), 'utf8'
    ));
    const all = new Set([
      ...(flow.triggers || []).map((t) => t.id),
      ...(flow.conditions || []).map((t) => t.id),
      ...(flow.actions || []).map((t) => t.id),
    ]);
    for (const card of ids) {
      if (!all.has(card)) fail(`${driverId} missing ${card}`);
    }
  }
  ok('rotary SSOT flow UX cards present');
}

if (failures.length) {
  console.error(`\nP2449 FAIL (${failures.length})`);
  process.exit(1);
}
console.log('\nP2449 PASS');
process.exit(0);
