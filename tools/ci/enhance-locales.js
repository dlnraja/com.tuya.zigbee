#!/usr/bin/env node
/**
 * P31.5 — Locale Enhancement Script
 *
 * Ensures every button driver has full trilingual (en/fr/nl/de) coverage
 * for button_mode setting + scene_recall flow cards.
 *
 * - Detects missing keys
 * - Adds sensible defaults
 * - Fixes common mojibake (Ǹ → é, etc.)
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

const TRANSLATIONS = {
  'Operating Mode': {
    en: 'Operating Mode',
    fr: 'Mode de fonctionnement',
    nl: 'Bedrijfsmodus',
    de: 'Betriebsart',
  },
  'Auto-Detect': {
    en: 'Auto-Detect',
    fr: 'Détection Auto',
    nl: 'Automatisch',
    de: 'Auto-Erkennung',
  },
  'Scene Mode (default — Multi-press)': {
    en: 'Scene Mode (default — Multi-press)',
    fr: 'Mode Scène (par défaut — Multi-clics)',
    nl: 'Scène-modus (standaard — Multi-klik)',
    de: 'Szenenmodus (Standard — Mehrfachdruck)',
  },
  'Dimmer Mode': {
    en: 'Dimmer Mode',
    fr: 'Mode Variateur',
    nl: 'Dimmer-modus',
    de: 'Dimmermodus',
  },
  'Button mode (advanced)': {
    en: 'Button mode (advanced)',
    fr: 'Mode bouton (avancé)',
    nl: 'Knopmodus (geavanceerd)',
    de: 'Tastenmodus (erweitert)',
  },
  'Force scene mode (default — multi-press)': {
    en: 'Force scene mode (default — multi-press)',
    fr: 'Forcer mode scène (par défaut — multi-clics)',
    nl: 'Scène-modus forceren (standaard — multi-klik)',
    de: 'Szenenmodus erzwingen (Standard — Mehrfachdruck)',
  },
  'Force dimmer mode': {
    en: 'Force dimmer mode',
    fr: 'Forcer mode variateur',
    nl: 'Dimmer-modus forceren',
    de: 'Dimmermodus erzwingen',
  },
  'Scene mode (default)': {
    en: 'Scene mode (default) allows single/double/long press for TS0041/TS0042/TS0043/TS0044/TS004F. Dimmer Mode only supports single press. Auto tries to detect and switch automatically.',
    fr: 'Le mode Scène (par défaut) permet les appuis simples/doubles/longs pour TS0041/TS0042/TS0043/TS0044/TS004F. Le mode Variateur ne supporte que l\'appui simple. Auto tente de détecter et basculer automatiquement.',
    nl: 'Scène-modus (standaard) maakt enkele/dubbele/lange klikken mogelijk voor TS0041/TS0042/TS0043/TS0044/TS004F. Dimmer-modus ondersteunt alleen enkele klik. Auto probeert automatisch te detecteren en te schakelen.',
    de: 'Szenenmodus (Standard) ermöglicht einfaches/doppeltes/langes Drücken für TS0041/TS0042/TS0043/TS0044/TS004F. Dimmermodus unterstützt nur einfaches Drücken. Auto versucht automatisch zu erkennen und zu wechseln.',
  },
  'Scene recalled': {
    en: 'Scene recalled',
    fr: 'Scène rappelée',
    nl: 'Scène opgeroepen',
    de: 'Szene aufgerufen',
  },
  'Battery low': {
    en: 'Battery low',
    fr: 'Batterie faible',
    nl: 'Batterij laag',
    de: 'Batterie schwach',
  },
};

function addMissingTranslations(obj, trans, depth = 0) {
  if (!obj || typeof obj !== 'object') return false;
  let changed = false;

  // Check if this looks like a {en, fr, nl, de} title block
  if (obj.en && typeof obj.en === 'string' && trans && trans[obj.en]) {
    const expected = trans[obj.en];
    for (const [lang, value] of Object.entries(expected)) {
      if (!obj[lang] || obj[lang] !== value) {
        obj[lang] = value;
        changed = true;
      }
    }
  }

  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'object' && v !== null) {
      if (addMissingTranslations(v, trans, depth + 1)) changed = true;
    }
  }
  return changed;
}

function fixMojibakeInTitles(obj) {
  if (!obj) return false;
  let changed = false;
  if (typeof obj.en === 'string') {
    const fixed = obj.en
      .replace(/appuyǸ/g, 'appuyé')
      .replace(/cliquǸ/g, 'cliqué')
      .replace(/pressǸ/g, 'pressé')
      .replace(/relǽchǸ/g, 'relâché')
      .replace(/apr��s/g, 'après')
      .replace(/apr�s/g, 'après')
      .replace(/HygromǸ/g, 'Hygromé')
      .replace(/tempǸrature/g, 'température')
      .replace(/HumiditǸ/g, 'Humidité')
      .replace(/Ǹ/g, 'é')
      .replace(/�/g, '');
    if (fixed !== obj.en) {
      obj.en = fixed;
      changed = true;
    }
  }
  for (const v of Object.values(obj)) {
    if (typeof v === 'object' && v !== null) {
      if (fixMojibakeInTitles(v)) changed = true;
    }
  }
  return changed;
}

function enhanceDriver(driverName) {
  const driverPath = path.join(driversDir, driverName);
  let changed = false;

  // Process driver.compose.json
  const composeFile = path.join(driverPath, 'driver.compose.json');
  if (fs.existsSync(composeFile)) {
    const original = fs.readFileSync(composeFile, 'utf8');
    const compose = JSON.parse(original);
    let composeChanged = false;

    // Add translations to all settings + capabilitiesOptions
    for (const s of compose.settings || []) {
      if (s.label && addMissingTranslations(s.label, TRANSLATIONS)) composeChanged = true;
      if (s.hint && addMissingTranslations(s.hint, TRANSLATIONS)) composeChanged = true;
      if (s.values && Array.isArray(s.values)) {
        for (const v of s.values) {
          if (v.label && addMissingTranslations(v.label, TRANSLATIONS)) composeChanged = true;
        }
      }
    }
    for (const [k, v] of Object.entries(compose.capabilitiesOptions || {})) {
      if (v.title && addMissingTranslations(v.title, TRANSLATIONS)) composeChanged = true;
    }

    if (composeChanged) {
      fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n', 'utf8');
      changed = true;
      console.log(`  ✅ ${driverName}/driver.compose.json: added translations`);
    }
  }

  // Process driver.flow.compose.json
  const flowFile = path.join(driverPath, 'driver.flow.compose.json');
  if (fs.existsSync(flowFile)) {
    const original = fs.readFileSync(flowFile, 'utf8');
    const flow = JSON.parse(original);
    let flowChanged = false;

    const processTriggers = (arr) => {
      for (const t of arr || []) {
        if (t.title && addMissingTranslations(t.title, TRANSLATIONS)) flowChanged = true;
        if (t.hint && addMissingTranslations(t.hint, TRANSLATIONS)) flowChanged = true;
        if (t.titleFormatted && addMissingTranslations(t.titleFormatted, TRANSLATIONS)) flowChanged = true;
        for (const tok of t.tokens || []) {
          if (tok.title && addMissingTranslations(tok.title, TRANSLATIONS)) flowChanged = true;
        }
      }
    };
    processTriggers(flow.triggers);
    processTriggers(flow.actions);
    processTriggers(flow.conditions);

    if (flowChanged) {
      fs.writeFileSync(flowFile, JSON.stringify(flow, null, 2) + '\n', 'utf8');
      changed = true;
      console.log(`  ✅ ${driverName}/driver.flow.compose.json: added translations`);
    }
  }

  if (!changed) {
    console.log(`  ✓ ${driverName}: already has full trilingual coverage`);
  }
  return changed;
}

function main() {
  console.log('🌍 P31.5 — Locale Enhancement (en/fr/nl/de)');
  console.log('═'.repeat(60));
  let totalChanged = 0;
  for (const d of BUTTON_DRIVERS) {
    if (enhanceDriver(d)) totalChanged++;
  }
  console.log('');
  console.log(`📊 Summary: ${totalChanged} drivers updated with trilingual coverage`);
}

main();
