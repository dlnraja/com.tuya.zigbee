#!/usr/bin/env node
'use strict';

/**
 * P2395 — Legacy underscore switch drivers must declare physical_gang{N} cards
 * (parity with canonical switch_Ngang / wall_switch_*_1way).
 * MASTER_ONLY CI gate. Report-only by default; exit 1 on missing cards.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const SPECS = [
  { id: 'switch_1_gang', gangs: 1 },
  { id: 'switch_2_gang', gangs: 2 },
  { id: 'switch_3_gang', gangs: 3 },
  { id: 'switch_1_gang_metering', gangs: 1 },
  { id: 'switch_2_gang_metering', gangs: 2 },
  { id: 'switch_4_gang_metering', gangs: 4 },
  { id: 'wall_switch_1_gang', gangs: 1 },
  { id: 'wall_switch_2_gang', gangs: 2 },
  { id: 'wall_switch_3_gang', gangs: 3 },
  { id: 'wall_switch_4_gang', gangs: 4 },
  { id: 'wall_switch_1_gang_tuya', gangs: 1 },
  { id: 'wall_switch_4_gang_tuya', gangs: 4 },
  { id: 'wall_switch_5_gang_tuya', gangs: 5 },
  { id: 'wall_switch_6_gang_tuya', gangs: 6 },
  { id: 'switch_temp_sensor', gangs: 1 },
];

function loadFlow(driverId) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.flow.compose.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main() {
  const missing = [];
  for (const { id, gangs } of SPECS) {
    const flow = loadFlow(id);
    if (!flow) {
      missing.push({ id, reason: 'no_flow_compose' });
      continue;
    }
    const triggerIds = new Set((flow.triggers || []).map((t) => t.id));
    for (let g = 1; g <= gangs; g++) {
      const onId = `${id}_physical_gang${g}_on`;
      const offId = `${id}_physical_gang${g}_off`;
      if (!triggerIds.has(onId)) missing.push({ id, card: onId });
      if (!triggerIds.has(offId)) missing.push({ id, card: offId });
    }
  }

  // scene_switch_wall: per-button Ngang cards
  const scene = loadFlow('scene_switch_wall');
  if (scene) {
    const ids = new Set((scene.triggers || []).map((t) => t.id));
    for (let b = 1; b <= 2; b++) {
      const need = `scene_switch_wall_button_2gang_button_${b}_pressed`;
      if (!ids.has(need)) missing.push({ id: 'scene_switch_wall', card: need });
    }
  }

  if (missing.length) {
    console.error('[P2395] physical_gang parity FAIL:', missing.length);
    for (const m of missing.slice(0, 40)) console.error(' -', m);
    process.exit(1);
  }
  console.log('[P2395] physical_gang parity OK (%d drivers)', SPECS.length + 1);
  process.exit(0);
}

main();
