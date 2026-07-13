#!/usr/bin/env node
/**
 * P31.4 — Add scene_recall flow card to all button drivers missing it.
 * Also fix mojibake (Ǹ → é) in titles.
 *
 * P27.1 added scene_recall ONLY to button_wireless_smart + smart_knob_rotary.
 * P31 extends to all 7 button drivers.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const driversDir = path.join(root, 'drivers');

const BUTTON_DRIVERS = [
  { dir: 'button_wireless_1',     buttons: 1, mfrs: ['TS0041', 'TS004F', 'TS0601', 'WXKG01LM', 'WXKG11LM'] },
  { dir: 'button_wireless_2',     buttons: 2, mfrs: ['TS0042', 'TS004F'] },
  { dir: 'button_wireless_3',     buttons: 3, mfrs: ['TS0043', 'TS004F'] },
  { dir: 'button_wireless_4',     buttons: 4, mfrs: ['TS0044', 'TS004F', 'TS0601'] },
  { dir: 'button_wireless_smart', buttons: 4, mfrs: [] },  // already has it
  { dir: 'button_wireless_usb',   buttons: 1, mfrs: [] },  // simple USB
  { dir: 'smart_knob_rotary',     buttons: 1, mfrs: [] },  // already has it
];

function fixMojibake(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/appuyǸ/g, 'appuyé')
    .replace(/cliquǸ/g, 'cliqué')
    .replace(/pressǸ/g, 'pressé')
    .replace(/relǽchǸ/g, 'relâché')
    .replace(/apr��s/g, 'après')
    .replace(/apr�s/g, 'après')
    .replace(/HygromǸ/g, 'Hygromé')
    .replace(/tempǸrature/g, 'température')
    .replace(/HumiditǸ/g, 'Humidité')
    .replace(/Ǹ/g, 'é')  // catch-all
    .replace(/�/g, '');
}

function hasSceneRecall(flowCompose) {
  if (!flowCompose || !Array.isArray(flowCompose.triggers)) return false;
  return flowCompose.triggers.some(t =>
    t.id && t.id.includes('scene_recall')
  );
}

function buildSceneRecallTriggers(driverName, buttonCount) {
  const triggers = [];
  for (let i = 1; i <= buttonCount; i++) {
    triggers.push({
      id: `${driverName}_button_${i}gang_button_scene_recall`,
      title: {
        en: `Button ${i} scene recalled`,
        fr: `Bouton ${i} scène rappelée`,
        nl: `Knop ${i} scène opgeroepen`,
        de: `Taste ${i} Szene aufgerufen`,
      },
      hint: {
        en: `When button ${i} recalls a Zigbee scene (cluster 0x05 — scene mode, P31)`,
        fr: `Lorsque le bouton ${i} rappelle une scène Zigbee (cluster 0x05 — mode scène, P31)`,
        nl: `Wanneer knop ${i} een Zigbee-scène oproept (cluster 0x05 — scènemodus, P31)`,
        de: `Wenn Taste ${i} eine Zigbee-Szene aufruft (Cluster 0x05 — Szenenmodus, P31)`,
      },
      tokens: [
        { name: 'scene_id', type: 'number', title: { en: 'Scene ID', fr: 'ID Scène', nl: 'Scène-ID', de: 'Szenen-ID' }, example: i },
      ],
      args: [],
      titleFormatted: {
        en: `Button ${i} scene [[scene_id]] recalled`,
        fr: `Bouton ${i} scène [[scene_id]] rappelée`,
        nl: `Knop ${i} scène [[scene_id]] opgeroepen`,
        de: `Taste ${i} Szene [[scene_id]] aufgerufen`,
      },
    });
  }
  return triggers;
}

function addSceneRecall(driverInfo) {
  const driverPath = path.join(driversDir, driverInfo.dir);
  const flowFile = path.join(driverPath, 'driver.flow.compose.json');
  if (!fs.existsSync(flowFile)) {
    console.log(`  ⚠️ ${driverInfo.dir}: no flow file`);
    return false;
  }

  let flow;
  try {
    flow = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
  } catch (e) {
    console.log(`  ❌ ${driverInfo.dir}: invalid JSON: ${e.message}`);
    return false;
  }

  if (hasSceneRecall(flow)) {
    console.log(`  ✓ ${driverInfo.dir}: already has scene_recall (skipped)`);
    return false;
  }

  // Add scene_recall triggers
  const newTriggers = buildSceneRecallTriggers(driverInfo.dir, driverInfo.buttons);
  flow.triggers = flow.triggers || [];
  flow.triggers.push(...newTriggers);

  // Fix mojibake in all titles
  const fix = (obj) => {
    if (!obj) return;
    for (const k of Object.keys(obj)) {
      if (typeof obj[k] === 'string') obj[k] = fixMojibake(obj[k]);
      else if (typeof obj[k] === 'object') fix(obj[k]);
    }
  };
  fix(flow);

  fs.writeFileSync(flowFile, JSON.stringify(flow, null, 2) + '\n', 'utf8');
  console.log(`  ✅ ${driverInfo.dir}: added ${newTriggers.length} scene_recall triggers + fixed mojibake`);
  return true;
}

function main() {
  console.log('🔘 P31.4 — Adding scene_recall flow cards to button drivers...');
  let added = 0;
  for (const d of BUTTON_DRIVERS) {
    if (addSceneRecall(d)) added++;
  }
  console.log(`\n📊 Summary: ${added} drivers updated`);
}

main();
