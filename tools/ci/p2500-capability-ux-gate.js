#!/usr/bin/env node
'use strict';

/**
 * P2500 — Homey Capability UX Contre quoi gate
 * Never getable:false / preventInsights on sensor readables in compose.
 */
const fs = require('fs');
const path = require('path');
const {
  mustNeverGetableFalse,
  isButtonMaintenanceCap,
} = require('../../lib/utils/HomeyCapabilityUx');

const ROOT = path.join(__dirname, '..', '..');

function fail(msg) {
  console.error(`P2500 FAIL: ${msg}`);
  process.exitCode = 1;
}

function main() {
  const ssotPath = 'config/architecture/homey-capability-ux-ssot.json';
  const humanPath = 'docs/architecture/HOMEY_CAPABILITY_UX_SSOT.md';
  if (!fs.existsSync(path.join(ROOT, ssotPath))) fail(`missing ${ssotPath}`);
  if (!fs.existsSync(path.join(ROOT, humanPath))) fail(`missing ${humanPath}`);

  const ssot = JSON.parse(fs.readFileSync(path.join(ROOT, ssotPath), 'utf8'));
  if (!ssot.athomRules?.getableFalseForbiddenPrefixes?.includes('measure_')) {
    fail('SSOT must forbid getable:false on measure_*');
  }
  if (ssot.deviceCapabilitiesLessons?.genericCapabilityChanged?.deviceFilter
    !== 'none — all app devices (not capabilities=onoff)') {
    fail('SSOT must lock generic trigger deviceFilter = all devices');
  }
  if (!ssot.runtime?.helper?.includes('HomeyCapabilityUx')) {
    fail('SSOT must point at HomeyCapabilityUx helper');
  }

  const human = fs.readFileSync(path.join(ROOT, humanPath), 'utf8');
  if (!/getable|P2499|43287/i.test(human)) {
    fail('human doc must reference getable / P2499 / T43287');
  }

  const helper = fs.readFileSync(path.join(ROOT, 'lib/utils/HomeyCapabilityUx.js'), 'utf8');
  if (!helper.includes('healSensorCapabilityGetable')) fail('helper missing healSensorCapabilityGetable');
  if (!mustNeverGetableFalse('measure_battery')) fail('mustNeverGetableFalse(measure_battery)');
  if (mustNeverGetableFalse('button.1')) fail('button.1 must NOT be treated as sensor readable');
  if (!isButtonMaintenanceCap('button.2')) fail('button.2 should be maintenance cap');

  // Fleet compose audit
  const bad = [];
  const driversDir = path.join(ROOT, 'drivers');
  for (const id of fs.readdirSync(driversDir)) {
    const composePath = path.join(driversDir, id, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (_e) {
      continue;
    }
    const opts = j.capabilitiesOptions || {};
    for (const [cap, o] of Object.entries(opts)) {
      if (!o || typeof o !== 'object') continue;
      if (o.getable === false && mustNeverGetableFalse(cap)) {
        bad.push(`${id}:${cap}:getable`);
      }
      if (o.preventInsights === true
        && /^(measure_battery|measure_temperature|measure_humidity|meter_power|measure_power)$/.test(cap)) {
        bad.push(`${id}:${cap}:preventInsights`);
      }
    }
  }
  if (bad.length) {
    fail(`sensor getable/preventInsights violations: ${bad.slice(0, 20).join(', ')}`);
  }

  // Generic flow card must not filter capabilities=onoff only
  const flowPath = path.join(ROOT, '.homeycompose/flow/triggers/capability_value_changed_generic.json');
  if (!fs.existsSync(flowPath)) fail('missing capability_value_changed_generic.json');
  const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
  const deviceArg = (flow.args || []).find((a) => a.name === 'device' || a.type === 'device');
  if (deviceArg?.filter && /capabilities=onoff/i.test(deviceArg.filter)) {
    fail('capability_value_changed_generic must not filter capabilities=onoff (blocks sensors)');
  }

  // Runtime wire (fleet onNodeInit — not only button override path)
  const base = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
  if (!base.includes('healSensorCapabilityGetable')) {
    fail('TuyaZigbeeDevice must wire healSensorCapabilityGetable');
  }

  console.log('P2500 OK — capability UX SSOT + fleet getable + generic flow filter');
}

main();
