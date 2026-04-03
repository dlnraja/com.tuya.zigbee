#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION AUTOMATIQUE - TOUS LES WARNINGS setCapabilityValue\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

let stats = {
  filesScanned: 0,
  filesModified: 0,
  linesFixed: 0,
  backupsCreated: 0
};

// Capabilities qui nécessitent des valeurs numériques
const NUMERIC_CAPABILITIES = [
  'measure_temperature',
  'measure_humidity',
  'measure_pressure',
  'measure_co2',
  'measure_pm25',
  'measure_power',
  'measure_voltage',
  'measure_current',
  'measure_battery',
  'measure_luminance',
  'measure_noise',
  'measure_rain',
  'measure_wind_strength',
  'measure_wind_angle',
  'measure_gust_strength',
  'measure_gust_angle',
  'measure_ultraviolet',
  'meter_power',
  'meter_water',
  'meter_gas',
  'dim',
  'light_temperature',
  'light_hue',
  'light_saturation',
  'target_temperature',
  'volume_set'
];

/**
 * Corriger setCapabilityValue dans un fichier
 */
function fixSetCapabilityValue(filePath) {
  stats.filesScanned++;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let newContent = content;

    // Patterns à détecter et corriger
    NUMERIC_CAPABILITIES.forEach(capability => {
      // Pattern 1: setCapabilityValue('measure_*', variable)
      // Sans parseFloat/parseInt/Number
      const regex1 = new RegExp(
        `((?:this\\.|await\\s+this\\.|await\\s+)?setCapabilityValue\\s*\\(\\s*['"\`]${capability}['"\`]\\s*,\\s*)([a-zA-Z0-9_.\\[\\]]+)(\\s*[,\\)])`,
        'g'
      );

      const matches = [...content.matchAll(regex1)];
      matches.forEach(match => {
        const [fullMatch, prefix, value, suffix] = match;

        // Vérifier si déjà converti
        if (value.includes('parseFloat') ||
          value.includes('parseInt') ||
          value.includes('Number(') ||
          value === 'null' ||
          value === 'undefined' ||
          value.match(/^[0-9.]+$/)) {
          return; // Déjà OK
        }

        // Appliquer correction: ajouter parseFloat()
        const fixed = `${prefix}parseFloat(${value})${suffix}`;
        newContent = newContent.replace(fullMatch, fixed);
        modified = true;
        stats.linesFixed++;
      });

      // Pattern 2: setCapabilityValue('measure_*', expression.property)
      const regex2 = new RegExp(
        `((?:this\\.|await\\s+this\\.|await\\s+)?setCapabilityValue\\s*\\(\\s*['"\`]${capability}['"\`]\\s*,\\s*)([a-zA-Z0-9_.\\[\\]]+\\.[a-zA-Z0-9_.\\[\\]]+)(\\s*[,\\)])`,
        'g'
      );

      const matches2 = [...content.matchAll(regex2)];
      matches2.forEach(match => {
        const [fullMatch, prefix, value, suffix] = match;

        // Vérifier si déjà converti
        if (value.includes('parseFloat') ||
          value.includes('parseInt') ||
          value.includes('Number(')) {
          return;
        }

        const fixed = `${prefix}parseFloat(${value})${suffix}`;
        newContent = newContent.replace(fullMatch, fixed);
        modified = true;
        stats.linesFixed++;
      });
    });

    // Sauvegarder si modifié
    if (modified && newContent !== content) {
      // Backup
      const backupPath = `${filePath}.backup-warnings-${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      stats.backupsCreated++;

      // Sauvegarder
      fs.writeFileSync(filePath, newContent, 'utf8');
      stats.filesModified++;

      const relativePath = path.relative(ROOT, filePath);
      console.log(`   ✅ ${relativePath}`);
    }

  } catch (e) {
    console.error(`   ❌ Erreur ${path.relative(ROOT, filePath)}:`, e.message);
  }
}

/**
 * Scanner récursivement
 */
function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const items = fs.readdirSync(dir);

  items.forEach(item => {
    if (item.startsWith('.')) return;

    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (item.endsWith('.js') && !item.includes('.backup')) {
      fixSetCapabilityValue(fullPath);
    }
  });
}

// EXÉCUTION
console.log('🔍 Scanning drivers/...\n');
scanDirectory(DRIVERS_DIR);

console.log('\n🔍 Scanning lib/...\n');
scanDirectory(LIB_DIR);

// RAPPORT FINAL
console.log('\n\n📊 RAPPORT CORRECTIONS:\n');
console.log(`   Fichiers scannés: ${stats.filesScanned}`);
console.log(`   Fichiers modifiés: ${stats.filesModified}`);
console.log(`   Lignes corrigées: ${stats.linesFixed}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

if (stats.filesModified > 0) {
  console.log('✅ CORRECTIONS APPLIQUÉES\n');
  console.log('🎯 PROCHAINES ÉTAPES:');
  console.log('   1. Relancer audit: node scripts/audit_complete_advanced.js');
  console.log('   2. Vérifier warnings restants');
  console.log('   3. Valider: homey app validate --level publish');
  console.log('   4. Build: homey app build\n');
} else {
  console.log('✅ AUCUNE CORRECTION NÉCESSAIRE\n');
}

process.exit(0);
