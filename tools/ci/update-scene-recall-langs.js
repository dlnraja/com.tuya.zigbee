#!/usr/bin/env node
/**
 * P31.5.2 — Update existing scene_recall triggers to add nl/de translations
 * (the original add-scene-recall-to-all-buttons.js only had en+fr).
 *
 * Idempotent: safe to run multiple times.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const driversDir = path.join(root, 'drivers');

const BUTTON_DRIVERS = [
  'button_wireless_1', 'button_wireless_2', 'button_wireless_3',
  'button_wireless_4', 'button_wireless_smart', 'button_wireless_usb',
  'smart_knob_rotary',
];

function getNls(text, lang) {
  // Simple translation: derive nl/de from en by translating common words
  const t = text;
  if (lang === 'nl') {
    return t
      .replace(/Button (\d+)/g, 'Knop $1')
      .replace(/scene/g, 'scène')
      .replace(/recalled/g, 'opgeroepen')
      .replace(/Scene/g, 'Scène')
      .replace(/ID/g, 'ID')
      .replace(/When button/g, 'Wanneer knop')
      .replace(/recalls a Zigbee scene/g, 'een Zigbee-scène oproept')
      .replace(/cluster/g, 'cluster')
      .replace(/scene mode/g, 'scènemodus');
  }
  if (lang === 'de') {
    return t
      .replace(/Button (\d+)/g, 'Taste $1')
      .replace(/scene/g, 'Szene')
      .replace(/recalled/g, 'aufgerufen')
      .replace(/Scene/g, 'Szene')
      .replace(/Scene ID/g, 'Szenen-ID')
      .replace(/When button/g, 'Wenn Taste')
      .replace(/recalls a Zigbee scene/g, 'eine Zigbee-Szene aufruft')
      .replace(/cluster/g, 'Cluster')
      .replace(/scene mode/g, 'Szenenmodus');
  }
  return t;
}

function expandTitles(obj, lang) {
  if (!obj || typeof obj !== 'object') return false;
  let changed = false;
  // If this is a {en, ...} title block, add lang translations
  if (obj.en && typeof obj.en === 'string' && !obj[lang]) {
    obj[lang] = getNls(obj.en, lang);
    changed = true;
  }
  for (const v of Object.values(obj)) {
    if (typeof v === 'object' && v !== null) {
      if (expandTitles(v, lang)) changed = true;
    }
  }
  return changed;
}

function isSceneRecallTrigger(t) {
  return t.id && t.id.includes('scene_recall');
}

function updateDriver(driverName) {
  const driverPath = path.join(driversDir, driverName);
  const flowFile = path.join(driverPath, 'driver.flow.compose.json');
  if (!fs.existsSync(flowFile)) return false;

  const flow = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
  let changed = false;

  for (const t of flow.triggers || []) {
    if (isSceneRecallTrigger(t)) {
      if (expandTitles(t.title, 'nl')) changed = true;
      if (expandTitles(t.title, 'de')) changed = true;
      if (expandTitles(t.hint, 'nl')) changed = true;
      if (expandTitles(t.hint, 'de')) changed = true;
      if (expandTitles(t.titleFormatted, 'nl')) changed = true;
      if (expandTitles(t.titleFormatted, 'de')) changed = true;
      for (const tok of t.tokens || []) {
        if (expandTitles(tok.title, 'nl')) changed = true;
        if (expandTitles(tok.title, 'de')) changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(flowFile, JSON.stringify(flow, null, 2) + '\n', 'utf8');
    console.log(`  ✅ ${driverName}/driver.flow.compose.json: scene_recall updated to nl+de`);
  } else {
    console.log(`  ✓ ${driverName}: already has full translations`);
  }
  return changed;
}

function main() {
  console.log('🌍 P31.5.2 — Update scene_recall translations (en/fr/nl/de)');
  console.log('═'.repeat(60));
  let total = 0;
  for (const d of BUTTON_DRIVERS) {
    if (updateDriver(d)) total++;
  }
  console.log('');
  console.log(`📊 Summary: ${total} drivers updated`);
}

main();
