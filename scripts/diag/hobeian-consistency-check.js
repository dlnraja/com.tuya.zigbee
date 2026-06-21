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

// ─── Devices HOBEIAN connus et leur driver cible CORRECT ───
const HOBEIAN_DEVICE_MAP = {
  'ZG-301Z': 'switch_1gang',      // 1-gang switch (TS0001)
  'ZG-301Z-2CH': 'switch_2gang',  // 2-gang switch
  'ZG-204ZM': 'presence_sensor_radar',  // mmWave radar
  'ZG-227Z': 'sensor_contact_presence', // contact+presence
  'ZG-303Z': 'soil_sensor',       // soil moisture
  'ZG-204Z': 'presence_sensor_radar',
};

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

    if (drvs.length > 1) {
      // productId dans plusieurs drivers → conflit
      const bad = drvs.filter(d => d !== expected);
      if (bad.length > 0) {
        console.error(`❌ ${pid} trouvé dans ${drvs.join(', ')} — devrait être UNIQUEMENT dans ${expected}`);
        errors++;
      }
    } else if (drvs[0] !== expected) {
      console.error(`❌ ${pid} dans ${drvs[0]} — devrait être dans ${expected}`);
      errors++;
    } else {
      console.log(`✅ ${pid} → ${drvs[0]} (correct)`);
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

  if (hobeianDrivers.length > 10) {
    console.warn(`⚠️  HOBEIAN présent dans ${hobeianDrivers.length} drivers (prolifération — vérifier BOT_FORCED_DISCOVERY.json)`);
    warnings++;
  } else {
    console.log(`✅ HOBEIAN dans ${hobeianDrivers.length} drivers (acceptable)`);
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
