#!/usr/bin/env node
'use strict';

/**
 * P26.2 — Button Cartography
 *
 * Maps every driver's button configuration:
 * - buttonCount (1, 2, 3, 4, 6, etc.)
 * - endpoint support (1, 1+2, 1+2+3+4)
 * - virtual + physical button detection
 * - flow card registration
 *
 * Output: .github/state/button-cartography.json
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const DRIVERS_DIR = 'C:/Users/Dell/Documents/homey/master/drivers';

const BUTTON_DRIVERS = [
  'button_wireless_1', 'button_wireless_2', 'button_wireless_3', 'button_wireless_4',
  'button_wireless_6', 'button_wireless_usb', 'button_smart', 'button_wireless_smart',
  'smart_knob_rotary', 'switch_wall_touch_1', 'switch_wall_touch_2', 'switch_wall_touch_3',
  'switch_wall_touch_4', 'scene_controller', 'wireless_switch_1', 'wireless_switch_2',
  'wireless_switch_3', 'wireless_switch_4',
];

const cartography = {
  meta: {
    generatedAt: new Date().toISOString(),
    totalDrivers: 0,
  },
  drivers: [],
};

for (const driverId of BUTTON_DRIVERS) {
  const driverPath = path.join(DRIVERS_DIR, driverId);
  if (!fs.existsSync(driverPath)) continue;
  const composePath = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;

  let compose;
  try { compose = JSON.parse(fs.readFileSync(composePath, 'utf8')); }
  catch { continue; }

  const caps = compose.capabilities || [];
  const buttonCaps = caps.filter(c => c.startsWith('button.')).sort();
  const zigbee = compose.zigbee || {};
  // Normalize endpoints: it can be an array, an object like {1: {...}}, or null
  let endpoints = zigbee.endpoints || [];
  if (!Array.isArray(endpoints)) {
    if (typeof endpoints === 'object' && endpoints !== null) {
      endpoints = Object.keys(endpoints).map(k => ({ id: parseInt(k) || k }));
    } else {
      endpoints = [];
    }
  }

  // Detect virtual + physical button capability
  const hasVirtual = caps.includes('button.1') || caps.includes('button.2');
  const buttonCount = Math.max(...buttonCaps.map(c => parseInt(c.split('.')[1] || 0)), 0);

  // Read flow cards
  const flowPath = path.join(driverPath, 'driver.flow.compose.json');
  let flowCards = { triggers: [], conditions: [], actions: [] };
  if (fs.existsSync(flowPath)) {
    try {
      const flowCompose = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      for (const section of ['triggers', 'conditions', 'actions']) {
        flowCards[section] = (flowCompose[section] || []).map(fc => fc.id);
      }
    } catch {}
  }

  cartography.drivers.push({
    driverId,
    name: compose.name?.en || driverId,
    class: compose.class,
    buttonCapabilities: buttonCaps,
    buttonCount,
    hasVirtualButton: hasVirtual,
    physicalButtonSupport: buttonCount > 0,
    zigbeeEndpoints: endpoints,
    manufacturerNames: zigbee.manufacturerName || [],
    productIds: zigbee.productId || [],
    flowCardTriggers: flowCards.triggers,
    flowCardConditions: flowCards.conditions,
    flowCardActions: flowCards.actions,
    issues: detectIssues(driverId, buttonCount, buttonCaps, endpoints, flowCards),
  });
}

cartography.meta.totalDrivers = cartography.drivers.length;

function detectIssues(driverId, buttonCount, buttonCaps, endpoints, flowCards) {
  const issues = [];
  const endpointsArr = Array.isArray(endpoints) ? endpoints : [];

  // Issue 1: buttonCount=1 but device has more endpoints
  const endpointIds = endpointsArr.map(e => (typeof e === 'object' && e !== null) ? e.id : e).filter(Boolean);
  if (buttonCount === 1 && endpointIds.length > 1) {
    issues.push({
      type: 'multi_endpoint_not_handled',
      severity: 'high',
      description: `Driver has buttonCount=1 but zigbee endpoints ${endpointIds.join(', ')} suggest multiple buttons`,
      affectedUsers: ['#334', '#410', '#412'],
    });
  }

  // Issue 2: buttonCount=N but flow cards only have N
  if (buttonCount > 0 && flowCards.triggers.length < buttonCount) {
    issues.push({
      type: 'missing_flow_cards',
      severity: 'medium',
      description: `Has ${buttonCount} buttons but only ${flowCards.triggers.length} flow card triggers`,
    });
  }

  // Issue 3: No virtual button capability but TS0041 etc.
  if (driverId.includes('button_wireless_smart') && !buttonCaps.some(c => c.startsWith('button.'))) {
    issues.push({
      type: 'no_button_capability',
      severity: 'critical',
      description: 'Driver has no button.X capability',
    });
  }

  return issues;
}

fs.writeFileSync(path.join(STATE_DIR, 'button-cartography.json'), JSON.stringify(cartography, null, 2));

console.log('=== Button Cartography ===');
console.log(`Total drivers: ${cartography.meta.totalDrivers}`);

let withIssues = 0;
for (const d of cartography.drivers) {
  if (d.issues.length > 0) withIssues++;
  const status = d.issues.length > 0 ? '⚠️' : '✓';
  console.log(`\n${status} ${d.driverId} (${d.class})`);
  console.log(`  Buttons: ${d.buttonCount} (${d.buttonCapabilities.join(', ')})`);
  console.log(`  Virtual: ${d.hasVirtualButton ? 'yes' : 'no'}`);
  console.log(`  Endpoints: ${d.zigbeeEndpoints.length} (${JSON.stringify(d.zigbeeEndpoints.map(e => (typeof e === 'object' && e !== null) ? e.id : e))})`);
  console.log(`  Flow triggers: ${d.flowCardTriggers.length}`);
  for (const issue of d.issues) {
    console.log(`  ⚠️ ${issue.severity.toUpperCase()}: ${issue.description}`);
  }
}

console.log(`\n${withIssues}/${cartography.drivers.length} drivers with issues`);
console.log(`Output: ${path.join(STATE_DIR, 'button-cartography.json')}`);
