#!/usr/bin/env node
/**
 * prune-phantom-capabilities.js — P181
 *
 * Removes compose metadata that can never correspond to runtime behaviour:
 *
 *   1. `alarm_generic` on drivers where neither device.js nor its base class
 *      ever writes it and no flow card reads it. The tile is permanently null.
 *   2. `energy.batteries` on drivers that declare no battery capability, which
 *      shows a battery section in the Homey UI for a mains-powered device.
 *
 * The alarm_generic list is explicit rather than derived: each entry was
 * triaged individually against its datapoint map and flow cards, because the
 * fix for a dead alarm is sometimes to wire it instead of to drop it.
 *
 * Usage:
 *   node tools/ci/prune-phantom-capabilities.js            # dry-run
 *   node tools/ci/prune-phantom-capabilities.js --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APPLY = process.argv.includes('--apply');

// Triaged as spurious: no alarm datapoint, no IAS zone, no flow card reference.
// Sirens are deliberately absent — theirs is wired to the sounding state.
const DROP_ALARM_GENERIC = [
  'air_purifier_curtain',
  'air_purifier_siren',
  'curtain_motor_shutter',
  'curtain_motor_tilt',
  'device_din_rail_meter',
  'gateway_zigbee_bridge',
  'module_mini_switch',
  'shutter_roller_controller',
  // An RCBO does have a trip state, but no fault datapoint is documented for
  // _TZE284_6ocnqlhn. A capability that always reads "no alarm" is worse than
  // no capability, so it comes back only once the datapoint is confirmed.
  'smart_rcbo',
  'switch_wireless',
];

const changes = [];

function loadCompose(driver) {
  const file = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  if (!fs.existsSync(file)) return null;
  return { file, json: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

function save(file, json) {
  if (!APPLY) return;
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

function pruneAlarmGeneric() {
  for (const driver of DROP_ALARM_GENERIC) {
    const loaded = loadCompose(driver);
    if (!loaded) {
      changes.push({ driver, rule: 'alarm_generic', action: 'skip', detail: 'compose missing' });
      continue;
    }
    const { file, json } = loaded;
    const caps = json.capabilities || [];
    if (!caps.includes('alarm_generic')) {
      changes.push({ driver, rule: 'alarm_generic', action: 'noop', detail: 'already absent' });
      continue;
    }

    json.capabilities = caps.filter((c) => c !== 'alarm_generic');
    if (json.capabilitiesOptions && json.capabilitiesOptions.alarm_generic) {
      delete json.capabilitiesOptions.alarm_generic;
      if (!Object.keys(json.capabilitiesOptions).length) delete json.capabilitiesOptions;
    }
    save(file, json);
    changes.push({ driver, rule: 'alarm_generic', action: 'removed', detail: 'never driven, no flow card' });
  }
}

/**
 * `energy.batteries` without a battery capability has two opposite causes: a
 * mains device carrying leftover metadata, or a real battery device whose
 * capability was dropped from the manifest. Only the first may be pruned, so a
 * driver that actually reads a battery is reported instead of edited.
 */
function readsBattery(driver) {
  const devicePath = path.join(DRIVERS_DIR, driver, 'device.js');
  if (!fs.existsSync(devicePath)) return false;
  const src = fs.readFileSync(devicePath, 'utf8');
  const mainsPowered = /mainsPowered|removeCapability\(\s*['"]measure_battery/.test(src);
  if (mainsPowered) return false;
  return /capability:\s*['"]measure_battery['"]/.test(src)
    || /plugCapabilities[\s\S]{0,400}?['"]measure_battery['"]/.test(src);
}

function pruneGhostBatteries() {
  for (const entry of fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const loaded = loadCompose(entry.name);
    if (!loaded) continue;
    const { file, json } = loaded;

    const batteries = json.energy && json.energy.batteries;
    if (!Array.isArray(batteries) || !batteries.length) continue;

    const caps = json.capabilities || [];
    const hasBatteryCap = caps.some((c) => String(c).startsWith('measure_battery') || String(c).startsWith('alarm_battery'));
    if (hasBatteryCap) continue;

    if (readsBattery(entry.name)) {
      changes.push({
        driver: entry.name,
        rule: 'energy.batteries',
        action: 'review',
        detail: `device.js reads a battery datapoint — add measure_battery instead of dropping [${batteries.join(', ')}]`,
      });
      continue;
    }

    delete json.energy.batteries;
    if (!Object.keys(json.energy).length) delete json.energy;
    save(file, json);
    changes.push({
      driver: entry.name,
      rule: 'energy.batteries',
      action: 'removed',
      detail: `[${batteries.join(', ')}] with no battery capability`,
    });
  }
}

/**
 * app.json is generated from the compose files, but regenerating it needs the
 * Homey CLI. Mirroring the same edits keeps the manifest that actually ships in
 * step with the sources until the next full build. Written compactly on a
 * single line, which is how the generator emits it.
 */
function syncAppJson() {
  const file = path.join(ROOT, 'app.json');
  if (!fs.existsSync(file)) return;
  const app = JSON.parse(fs.readFileSync(file));
  const byId = new Map((app.drivers || []).map((d) => [d.id, d]));
  let touched = 0;

  // Reconcile against the composes rather than against this run's edits, so a
  // re-run still repairs a manifest left stale by an earlier pass.
  for (const [id, driver] of byId) {
    const loaded = loadCompose(id);
    if (!loaded) continue;
    const compose = loaded.json;

    if (Array.isArray(compose.capabilities) && Array.isArray(driver.capabilities)) {
      const desired = compose.capabilities;
      if (JSON.stringify(desired) !== JSON.stringify(driver.capabilities)) {
        driver.capabilities = [...desired];
        changes.push({ driver: id, rule: 'app.json', action: 'synced', detail: `capabilities -> ${desired.join(', ')}` });
        touched++;
      }
    }

    for (const cap of Object.keys(driver.capabilitiesOptions || {})) {
      if (!compose.capabilitiesOptions || !compose.capabilitiesOptions[cap]) {
        delete driver.capabilitiesOptions[cap];
        touched++;
      }
    }
    if (driver.capabilitiesOptions && !Object.keys(driver.capabilitiesOptions).length) delete driver.capabilitiesOptions;

    const composeBatteries = compose.energy && compose.energy.batteries;
    if (driver.energy && driver.energy.batteries && !composeBatteries) {
      delete driver.energy.batteries;
      if (!Object.keys(driver.energy).length) delete driver.energy;
      changes.push({ driver: id, rule: 'app.json', action: 'synced', detail: 'dropped energy.batteries' });
      touched++;
    }
  }

  if (touched && APPLY) fs.writeFileSync(file, JSON.stringify(app));
  changes.push({ driver: '(app.json)', rule: 'sync', action: touched ? 'synced' : 'noop', detail: `${touched} driver entrie(s)` });
}

pruneAlarmGeneric();
pruneGhostBatteries();
syncAppJson();

const removed = changes.filter((c) => c.action === 'removed');
console.log(`[prune-phantom-capabilities] mode=${APPLY ? 'apply' : 'dry-run'} removed=${removed.length} total=${changes.length}`);
for (const c of changes) {
  console.log(`  ${c.action.padEnd(7)} ${c.rule.padEnd(16)} ${c.driver} — ${c.detail}`);
}
if (!APPLY && removed.length) console.log('[prune-phantom-capabilities] re-run with --apply to write');
