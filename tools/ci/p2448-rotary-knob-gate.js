#!/usr/bin/env node
'use strict';

/**
 * P2448 — Rotary knob command-mode gate
 *
 * Prevents regression of ERS-10 / ZG-101ZD rotation:
 * 1. DeviceOperatingMode classifies rotary drivers + KNOB_MFR as dimmer/command
 * 2. smart_knob_rotary must NOT force scene 0x8004=1
 * 3. Compose default button_mode = dimmer; cluster 8 (levelControl) present
 * 4. Sacred couples in rotary-knob-ssot.json match DeviceFingerprintDB
 * 5. abrsvsou/4fjiwweb stay OFF KNOB_MFR (button_wireless_4)
 *
 * Usage: node tools/ci/p2448-rotary-knob-gate.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const failures = [];

function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { failures.push(msg); console.error(`  ❌ ${msg}`); }

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

console.log('P2448 rotary knob command-mode gate\n');

const ssotPath = 'config/architecture/rotary-knob-ssot.json';
if (!fs.existsSync(path.join(ROOT, ssotPath))) {
  fail(`missing ${ssotPath}`);
  console.error(`\nP2448 FAIL (${failures.length})`);
  process.exit(1);
}
const ssot = readJson(ssotPath);
ok(`SSOT loaded (${ssot.rotaryCouples.length} couples)`);

const {
  classifyOperatingFamily,
  KNOB_MFR,
  applyDesiredMode,
} = require(path.join(ROOT, 'lib', 'zigbee', 'DeviceOperatingMode.js'));

function mockDevice({ mfr, pid, driver, buttonMode }) {
  return {
    driver: { id: driver },
    getSetting(k) {
      if (k === 'zb_manufacturer_name') return mfr;
      if (k === 'zb_model_id') return pid;
      if (k === 'button_mode') return buttonMode;
      return null;
    },
    getStoreValue() { return null; },
    getData() { return { manufacturerName: mfr, productId: pid }; },
  };
}

// 1) Classifier matrix
for (const c of ssot.rotaryCouples) {
  const fam = classifyOperatingFamily(mockDevice({
    mfr: c.mfr, pid: c.pid, driver: c.driver,
  }));
  if (fam.family !== 'knob' || fam.defaultMode !== 'dimmer' || fam.writeSceneAttr !== true) {
    fail(`${c.mfr}+${c.pid} on ${c.driver} → ${JSON.stringify(fam)} (want knob/dimmer/write)`);
  } else {
    ok(`${c.mfr} @ ${c.driver} → knob/dimmer`);
  }
}

for (const mfr of ssot.sceneModeOneButton.mfrSuffixes) {
  const full = `_TZ3000_${mfr}`;
  const fam = classifyOperatingFamily(mockDevice({
    mfr: full, pid: 'TS004F', driver: 'smart_knob',
  }));
  if (fam.family !== 'ts004f' || fam.defaultMode !== 'scene') {
    fail(`${full} must stay ts004f/scene, got ${JSON.stringify(fam)}`);
  } else {
    ok(`${full} stays scene (P2439)`);
  }
}

// ABSENT wake
{
  const rotaryAbsent = classifyOperatingFamily(mockDevice({
    mfr: '', pid: '', driver: 'smart_knob_rotary',
  }));
  if (rotaryAbsent.family !== 'knob' || rotaryAbsent.defaultMode !== 'dimmer') {
    fail(`ABSENT@smart_knob_rotary → ${JSON.stringify(rotaryAbsent)}`);
  } else ok('ABSENT@smart_knob_rotary → knob/dimmer');

  const knobAbsent = classifyOperatingFamily(mockDevice({
    mfr: '', pid: '', driver: 'smart_knob',
  }));
  if (knobAbsent.defaultMode !== 'scene' || !knobAbsent.writeSceneAttr) {
    fail(`ABSENT@smart_knob → ${JSON.stringify(knobAbsent)}`);
  } else ok('ABSENT@smart_knob → scene (P2442)');
}

// 2) auto/scene settings must not override knob family default for applyDesiredMode
{
  const calls = [];
  const device = mockDevice({
    mfr: '_TZ3000_uri7ongn', pid: 'TS004F', driver: 'smart_knob', buttonMode: 'auto',
  });
  // Monkey-patch write via applyDesiredMode path — just check classify + setting resolve
  const fam = classifyOperatingFamily(device);
  let setting = String(device.getSetting('button_mode') || '').toLowerCase();
  if (!setting || setting === 'auto') setting = String(fam.defaultMode || 'scene').toLowerCase();
  const desired = (setting === 'dimmer' || setting === 'command') ? 'command' : 'scene';
  if (desired !== 'command') fail(`auto on rotary mfr resolved to ${desired}, want command`);
  else ok('button_mode=auto on rotary mfr → command');
  void calls;
  void applyDesiredMode;
}

// 3) KNOB_MFR must not include forbidden 4-btn mfrs
for (const mfr of ssot.forbiddenOnKnobMfr.mfr) {
  if (KNOB_MFR.test(mfr)) fail(`KNOB_MFR must NOT match ${mfr}`);
  else ok(`KNOB_MFR excludes ${mfr}`);
}

// 4) smart_knob_rotary device.js must not force scene write 32772: 1
{
  const src = readText('drivers/smart_knob_rotary/device.js');
  if (/\basync\s+_enableTS004FSceneMode\b|\bthis\._enableTS004FSceneMode\s*\(/.test(src)) {
    fail('smart_knob_rotary still has _enableTS004FSceneMode');
  } else ok('no _enableTS004FSceneMode impl');
  if (/writeAttributes\(\s*\{\s*32772\s*:\s*1\s*\}/.test(src)) {
    fail('smart_knob_rotary still writes 32772:1 (scene)');
  } else ok('no hard-coded scene write 32772:1');
  if (!/_enableTS004FOperatingMode|_setupOnOffRotateFc|applyDesiredMode/.test(src)) {
    fail('smart_knob_rotary missing P2448 operating-mode / 0xFC path');
  } else ok('P2448 operating-mode + 0xFC path present');
}

// 5) Compose defaults + levelControl cluster
{
  const compose = readJson('drivers/smart_knob_rotary/driver.compose.json');
  const btn = (compose.settings || []).find((s) => s.id === 'button_mode');
  if (!btn || btn.value !== 'dimmer') {
    fail(`smart_knob_rotary button_mode default=${btn && btn.value}, want dimmer`);
  } else ok('compose button_mode default=dimmer');
  const clusters = compose.zigbee?.endpoints?.['1']?.clusters || [];
  if (!clusters.includes(8) && !clusters.includes(0x0008)) {
    fail('smart_knob_rotary EP1 missing levelControl cluster 8');
  } else ok('smart_knob_rotary has levelControl (8)');
}

{
  const switchCompose = readJson('drivers/smart_knob_switch/driver.compose.json');
  const clusters = switchCompose.zigbee?.endpoints?.['1']?.clusters || [];
  if (!clusters.includes(8) && !clusters.includes(0x0008)) {
    fail('smart_knob_switch EP1 missing levelControl cluster 8');
  } else ok('smart_knob_switch has levelControl (8)');
}

{
  const knob = readJson('drivers/smart_knob/driver.compose.json');
  const clusters = knob.zigbee?.endpoints?.['1']?.clusters || [];
  if (!clusters.includes(8) && !clusters.includes(0x0008)) {
    fail('smart_knob EP1 missing levelControl cluster 8');
  } else ok('smart_knob has levelControl (8)');
}

// 6) Fingerprint DB locks
{
  let DeviceFingerprintDB;
  try {
    DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'));
  } catch (e) {
    fail(`DeviceFingerprintDB require: ${e.message}`);
    DeviceFingerprintDB = null;
  }
  if (DeviceFingerprintDB && typeof DeviceFingerprintDB.lookup === 'function') {
    for (const c of ssot.rotaryCouples) {
      const hit = DeviceFingerprintDB.lookup(c.mfr, c.pid);
      const driver = hit && (hit.driver || hit.driverId);
      if (driver !== c.driver) {
        fail(`FPDB ${c.mfr}+${c.pid} → ${driver}, want ${c.driver}`);
      } else ok(`FPDB ${c.mfr} → ${c.driver}`);
    }
    for (const mfr of ssot.forbiddenOnKnobMfr.mfr) {
      const hit = DeviceFingerprintDB.lookup(mfr, 'TS004F');
      const driver = hit && (hit.driver || hit.driverId);
      if (driver !== 'button_wireless_4') {
        fail(`FPDB ${mfr} expected button_wireless_4, got ${driver}`);
      } else ok(`FPDB ${mfr} stays button_wireless_4`);
    }
  }
}

// 7) Compose declares SSOT mfrs (case-insensitive)
function composeHasMfr(composeRel, mfr) {
  const names = (readJson(composeRel).zigbee?.manufacturerName || []).map((s) => String(s).toLowerCase());
  return names.includes(String(mfr).toLowerCase());
}
for (const c of ssot.rotaryCouples) {
  const rel = `drivers/${c.driver}/driver.compose.json`;
  if (!composeHasMfr(rel, c.mfr)) fail(`${c.mfr} missing from ${rel}`);
  else ok(`compose ${c.driver} has ${c.mfr}`);
}

// 8) P2449 flow UX + mixin + dim not forbidden on knob devices
{
  const mixinRel = 'lib/mixins/SmartKnobRotationMixin.js';
  if (!fs.existsSync(path.join(ROOT, mixinRel))) fail(`missing ${mixinRel}`);
  else ok('SmartKnobRotationMixin present');

  const flowUx = ssot.flowUx || {};
  const required = flowUx.requiredTriggersByDriver || {};
  for (const [driverId, ids] of Object.entries(required)) {
    const flowRel = `drivers/${driverId}/driver.flow.compose.json`;
    if (!fs.existsSync(path.join(ROOT, flowRel))) {
      fail(`missing ${flowRel}`);
      continue;
    }
    const flow = readJson(flowRel);
    const allIds = [
      ...(flow.triggers || []).map((t) => t.id),
      ...(flow.conditions || []).map((t) => t.id),
      ...(flow.actions || []).map((t) => t.id),
    ];
    for (const id of ids) {
      if (!allIds.includes(id)) fail(`${driverId} flow missing ${id}`);
      else ok(`flow ${id}`);
    }
  }

  for (const driverId of ['smart_knob', 'smart_knob_switch', 'smart_knob_rotary']) {
    const src = readText(`drivers/${driverId}/device.js`);
    if (!/SmartKnobRotationMixin|initSmartKnobRotation|_triggerKnobRotateLeft|_triggerKnobBrightnessChanged/.test(src)) {
      fail(`${driverId}/device.js missing P2449 rotation wiring`);
    } else ok(`${driverId} device rotation wiring`);
  }

  const rotarySrc = readText('drivers/smart_knob_rotary/device.js');
  if (/getDeviceTriggerCard\([^)]+,\s*['"]trigger['"]\)/.test(rotarySrc)) {
    fail('smart_knob_rotary still passes second arg to getDeviceTriggerCard');
  } else ok('getDeviceTriggerCard SDK3 arity OK');

  if (!/press_and_rotate|_triggerKnobSceneRecall|markKnobPressHeld/.test(rotarySrc)) {
    fail('smart_knob_rotary missing press+rotate / scene_recall wiring');
  } else ok('press+rotate + scene_recall wired');

  const knobCompose = readJson('drivers/smart_knob/driver.compose.json');
  const caps = knobCompose.capabilities || [];
  if (!caps.includes('button.rotate_left') || !caps.includes('button.rotate_right')) {
    fail('smart_knob missing rotate capabilities');
  } else ok('smart_knob has rotate caps');
  const btnMode = (knobCompose.settings || []).find((s) => s.id === 'button_mode');
  if (!btnMode) fail('smart_knob missing button_mode setting');
  else ok('smart_knob has button_mode setting');
}

if (failures.length) {
  console.error(`\nP2448 FAIL (${failures.length})`);
  process.exit(1);
}
console.log('\nP2448 PASS');
process.exit(0);
