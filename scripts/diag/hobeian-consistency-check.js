#!/usr/bin/env node
'use strict';
// hobeian-consistency-check.js — Vérifie la cohérence HOBEIAN à travers tout le projet
// Détecte : prolifération manufacturerName, productId mal routé, app.json désynchronisé
// Utilisable en pre-commit + CI + diag

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let errors = 0;
let warnings = 0;

// ─── Devices HOBEIAN connus et leur driver cible CORRECT (P2430 fleet) ───
// Brand HOBEIAN → many (mfr,pid) couples is NORMAL — never prune by brand alone.
const HOBEIAN_DEVICE_MAP = {
  'ZG-101ZL': 'button_wireless_1',
  'ZG-101ZS': 'scene_switch_4',
  'ZG-101ZD': 'button_wireless_1',
  'ZG-102Z': 'contact_sensor',
  'ZG-102ZL': 'contact_sensor',
  'ZG-102ZM': 'vibration_sensor',
  'ZG-103Z': 'vibration_sensor',
  'ZG-103ZL': 'vibration_sensor',
  'ZG-106Z': 'illuminance_sensor',
  'ZG-204Z': 'presence_sensor_radar',
  'ZG-204ZM': 'presence_sensor_radar',
  'ZG-225Z': 'gas_sensor',
  'ZG-222Z': 'water_leak_sensor',
  'ZG-222ZA': 'water_leak_sensor',
  'ZG-223Z': 'rain_sensor',
  'ZG-226Z': 'water_leak_sensor',
  'ZG-227Z': 'climate_sensor',
  'ZG-227ZL': 'climate_sensor',
  'ZG-228Z': 'vibration_sensor',
  'ZG-229Z': 'siren',
  'ZG-301Z': 'switch_1gang',
  'ZG-301Z-2CH': 'switch_2gang',
  'ZG-302Z1': 'switch_1gang',
  'ZG-302Z2': 'switch_2gang',
  'ZG-302Z3': 'switch_3gang',
  'ZG-303Z': 'soil_sensor',
  'ZG-305Z': 'switch_2gang',
};

// Homey hybrid wrappers may list the same couple beside the canonical driver (P2250).
const HOBEIAN_ALLOWED_MULTI = {
  'ZG-102Z': ['contact_sensor', 'sensor_contact_zigbee'],
  'ZG-102ZL': ['contact_sensor', 'sensor_contact_zigbee'],
};

// Full fleet spans ~16 drivers — threshold must not false-alarm on legitimate brand multi-couple.
const HOBEIAN_DRIVER_WARN_THRESHOLD = 24;

function check() {
  const drivers = fs.readdirSync(DRIVERS_DIR);

  // 1. Vérifier que chaque productId HOBEIAN est dans le BON driver
  const productIdLocations = {}; // productId → [drivers]
  for (const drv of drivers) {
    const composePath = path.join(DRIVERS_DIR, drv, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const pids = c?.zigbee?.productId || [];
      const mfr = c?.zigbee?.manufacturerName || [];
      const hasHobeian = mfr.some(m => m.toLowerCase() === 'hobeian');

      for (const pid of pids) {
        if (pid.startsWith('ZG-') && hasHobeian) {
          if (!productIdLocations[pid]) productIdLocations[pid] = [];
          productIdLocations[pid].push(drv);
        }
      }
    } catch (_) {}
  }

  // 2. Vérifier la cohérence
  for (const [pid, drvs] of Object.entries(productIdLocations)) {
    const expected = HOBEIAN_DEVICE_MAP[pid];
    if (!expected) continue; // device inconnu, skip

    const allowed = new Set([expected, ...(HOBEIAN_ALLOWED_MULTI[pid] || [])]);
    const bad = drvs.filter((d) => !allowed.has(d));

    if (bad.length > 0) {
      console.error(`❌ ${pid} trouvé dans ${drvs.join(', ')} — canonical=${expected} allowed=[${[...allowed].join(', ')}]`);
      errors++;
    } else if (!drvs.includes(expected)) {
      console.error(`❌ ${pid} dans ${drvs.join(', ')} — devrait inclure ${expected}`);
      errors++;
    } else {
      console.log(`✅ ${pid} → ${expected}${drvs.length > 1 ? ` (+wrappers: ${drvs.filter((d) => d !== expected).join(',')})` : ''} (correct)`);
    }
  }

  // 3. Prolifération HOBEIAN manufacturerName
  const hobeianDrivers = [];
  for (const drv of drivers) {
    const composePath = path.join(DRIVERS_DIR, drv, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfr = c?.zigbee?.manufacturerName || [];
      if (mfr.some(m => m.toLowerCase() === 'hobeian')) {
        hobeianDrivers.push(drv);
      }
    } catch (_) {}
  }

  if (hobeianDrivers.length > HOBEIAN_DRIVER_WARN_THRESHOLD) {
    console.warn(`⚠️  HOBEIAN présent dans ${hobeianDrivers.length} drivers (prolifération — vérifier BOT_FORCED_DISCOVERY.json; seuil=${HOBEIAN_DRIVER_WARN_THRESHOLD})`);
    warnings++;
  } else {
    console.log(`✅ HOBEIAN dans ${hobeianDrivers.length} drivers (acceptable — multi-couple brand, seuil ${HOBEIAN_DRIVER_WARN_THRESHOLD})`);
  }

  // 4. BOT_FORCED_DISCOVERY
  const botPath = path.join(ROOT, 'lib/data/BOT_FORCED_DISCOVERY.json');
  if (fs.existsSync(botPath)) {
    try {
      const bot = JSON.parse(fs.readFileSync(botPath, 'utf8'));
      if (bot.HOBEIAN) {
        console.error(`❌ BOT_FORCED_DISCOVERY.json force HOBEIAN → ${JSON.stringify(bot.HOBEIAN)} (prolifération !)`);
        errors++;
      } else {
        console.log('✅ BOT_FORCED_DISCOVERY.json : HOBEIAN non forcé globalement');
      }
    } catch (_) {}
  }

  // Rapport
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  HOBEIAN Consistency Check`);
  console.log(`  Erreurs : ${errors}`);
  console.log(`  Warnings : ${warnings}`);
  console.log('═══════════════════════════════════════════════');

  if (errors > 0) process.exit(1);
  console.log('✅ Check passé.');
}

check();
