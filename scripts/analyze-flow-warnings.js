#!/usr/bin/env node
'use strict';

/**
 * ANALYZE FLOW WARNINGS
 *
 * Investigate "Run listener was already registered" warnings
 * Found in diagnostic 9e43355e
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

console.log('🔍 ANALYZING FLOW CARD WARNINGS\n');
console.log('='.repeat(70));

// Flow cards avec warnings
const warningCards = [
  'any_safety_alarm_active',
  'is_armed',
  'anyone_home',
  'room_occupied',
  'air_quality_good',
  'climate_optimal',
  'all_entries_secured',
  'is_consuming_power',
  'natural_light_sufficient'
];

console.log(`\n📋 Flow cards avec warnings: ${warningCards.length}\n`);
warningCards.forEach(card => console.log(`   - ${card}`));

// Chercher où ces flow cards sont registered
console.log('\n🔍 Searching for registration points...\n');

const searchPatterns = [
  'registerRunListener',
  'FlowCardCondition',
  warningCards.join('|')
];

const searchDirs = [
  path.join(ROOT, 'app.js'),
  path.join(ROOT, 'lib'),
  path.join(ROOT, 'drivers')
];

let foundIn = {
  appJs: [],
  lib: [],
  drivers: []
};

// Chercher dans app.js
if (fs.existsSync(path.join(ROOT, 'app.js'))) {
  const appContent = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

  warningCards.forEach(card => {
    if (appContent.includes(card)) {
      foundIn.appJs.push(card);
    }
  });
}

// Chercher dans lib/
const libDir = path.join(ROOT, 'lib');
if (fs.existsSync(libDir)) {
  const libFiles = fs.readdirSync(libDir);

  for (const file of libFiles) {
    if (!file.endsWith('.js')) continue;

    const filePath = path.join(libDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    warningCards.forEach(card => {
      if (content.includes(card)) {
        foundIn.lib.push({ file, card });
      }
    });
  }
}

// Chercher dans drivers/
const driversDir = path.join(ROOT, 'drivers');
if (fs.existsSync(driversDir)) {
  const drivers = fs.readdirSync(driversDir);

  for (const driver of drivers.slice(0, 10)) { // Sample
    const driverJs = path.join(driversDir, driver, 'driver.js');

    if (!fs.existsSync(driverJs)) continue;

    const content = fs.readFileSync(driverJs, 'utf8');

    warningCards.forEach(card => {
      if (content.includes(card)) {
        foundIn.drivers.push({ driver, card });
      }
    });
  }
}

// Afficher résultats
console.log('RÉSULTATS:\n');

console.log(`app.js: ${foundIn.appJs.length} cards`);
if (foundIn.appJs.length > 0) {
  foundIn.appJs.forEach(card => console.log(`   - ${card}`));
}

console.log(`\nlib/: ${foundIn.lib.length} occurrences`);
if (foundIn.lib.length > 0) {
  foundIn.lib.slice(0, 5).forEach(item => console.log(`   - ${item.file}: ${item.card}`));
}

console.log(`\ndrivers/: ${foundIn.drivers.length} occurrences`);
if (foundIn.drivers.length > 0) {
  foundIn.drivers.slice(0, 5).forEach(item => console.log(`   - ${item.driver}: ${item.card}`));
}

console.log('\n' + '='.repeat(70));
console.log('\n💡 ANALYSE:\n');

if (foundIn.appJs.length > 0 && foundIn.drivers.length > 0) {
  console.log('⚠️  PROBLÈME IDENTIFIÉ:');
  console.log('   Flow cards registered dans app.js ET drivers/');
  console.log('   Cela cause les warnings "already registered"');
  console.log('');
  console.log('✅ SOLUTION:');
  console.log('   1. Garder registration dans app.js UNIQUEMENT');
  console.log('   2. OU garder registration dans drivers UNIQUEMENT');
  console.log('   3. Ajouter guard: if (!this._runListenerRegistered)');
} else if (foundIn.drivers.length > warningCards.length) {
  console.log('⚠️  POSSIBLE PROBLÈME:');
  console.log('   Même flow card registered dans multiple drivers');
  console.log('   Vérifier si c\'est intentionnel');
} else {
  console.log('✅ Pas de duplication évidente détectée');
  console.log('   Warnings peut être causé par app reload/restart');
}

console.log('\n' + '='.repeat(70));
