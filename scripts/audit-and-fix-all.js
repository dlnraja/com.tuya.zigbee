#!/usr/bin/env node
'use strict';

/**
 * AUDIT ET FIX COMPLET - Tous les drivers
 * 
 * Vérifie et applique:
 * 1. Battery converter (0..200 → 0..100%)
 * 2. Illuminance converter (log-lux → lux)
 * 3. IASZoneEnroller pour motion/SOS
 * 4. Safe string handling partout
 * 5. Cohérence des imports
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

let stats = {
  total: 0,
  battery: { fixed: 0, skipped: 0, errors: 0 },
  illuminance: { fixed: 0, skipped: 0, errors: 0 },
  ias: { fixed: 0, skipped: 0, errors: 0 },
  imports: { fixed: 0, skipped: 0, errors: 0 }
};

console.log('🔍 AUDIT COMPLET DE TOUS LES DRIVERS\n');
console.log('='.repeat(70));

/**
 * Vérifie si le driver a une capability
 */
function hasCapability(content, capability) {
  return content.includes(`'${capability}'`) || content.includes(`"${capability}"`);
}

/**
 * Vérifie si le converter est déjà importé
 */
function hasImport(content, importName) {
  return content.includes(importName);
}

/**
 * Applique le battery converter
 */
function applyBatteryConverter(content) {
  let modified = false;
  
  // Pattern 1: value / 2
  if (content.includes('value / 2') && content.includes('measure_battery')) {
    content = String(content).replace(
      /reportParser:\s*value\s*=>\s*{\s*this\.log\(['"](Battery raw value|Battery):['"],\s*value\);\s*return\s+value\s*\/\s*2;\s*}/g,
      `reportParser: value => {
          this.log('Battery raw value:', value);
          return fromZclBatteryPercentageRemaining(value);
        }`
    );
    content = String(content).replace(
      /reportParser:\s*value\s*=>\s*value\s*\/\s*2/g,
      'reportParser: value => fromZclBatteryPercentageRemaining(value)'
    );
    modified = true;
  }
  
  // Pattern 2: value <= 100 ? value : value / 2
  if (content.includes('value <= 100 ? value : value / 2')) {
    content = String(content).replace(
      /value\s*<=\s*100\s*\?\s*value\s*:\s*value\s*\/\s*2/g,
      'fromZclBatteryPercentageRemaining(value)'
    );
    modified = true;
  }
  
  // Pattern 3: Math.max/min avec division
  if (content.includes('Math.max(0, Math.min(100,') && content.includes('/ 2')) {
    content = String(content).replace(
      /Math\.max\(0,\s*Math\.min\(100,\s*[^)]*\/\s*2\s*\)\)/g,
      'fromZclBatteryPercentageRemaining(value)'
    );
    modified = true;
  }
  
  return { content, modified };
}

/**
 * Applique l'illuminance converter
 */
function applyIlluminanceConverter(content) {
  let modified = false;
  
  // Pattern: Math.pow(10, (value - 1) / 10000)
  if (content.includes('Math.pow(10,') && content.includes('10000')) {
    content = String(content).replace(
      /Math\.pow\(10,\s*\(value\s*-\s*1\)\s*\/\s*10000\)/g,
      'fromZigbeeMeasuredValue(value)'
    );
    modified = true;
  }
  
  return { content, modified };
}

/**
 * Ajoute les imports manquants
 */
function addMissingImports(content, needsBattery, needsIlluminance, needsIAS) {
  const lines = content.split('\n');
  let lastRequireIndex = -1;
  
  // Trouver le dernier require
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("require(") && !lines[i].trim().startsWith('//')) {
      lastRequireIndex = i;
    }
    if (lines[i].includes('class ') && lines[i].includes('extends')) {
      break;
    }
  }
  
  if (lastRequireIndex === -1) {
    // Chercher 'use strict'
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("'use strict'")) {
        lastRequireIndex = i + 1;
        break;
      }
    }
  }
  
  if (lastRequireIndex === -1) return content;
  
  const imports = [];
  
  if (needsBattery && !content.includes('fromZclBatteryPercentageRemaining')) {
    imports.push("const { fromZclBatteryPercentageRemaining } = require('../../lib/tuya-engine/converters/battery');");
  }
  
  if (needsIlluminance && !content.includes('fromZigbeeMeasuredValue')) {
    imports.push("const { fromZigbeeMeasuredValue } = require('../../lib/tuya-engine/converters/illuminance');");
  }
  
  if (needsIAS && !content.includes("require('../../lib/IASZoneEnroller')")) {
    imports.push("const IASZoneEnroller = require('../../lib/IASZoneEnroller');");
  }
  
  if (imports.length > 0) {
    lines.splice(lastRequireIndex + 1, 0, ...imports);
    return lines.join('\n');
  }
  
  return content;
}

/**
 * Traite un fichier device.js
 */
function processDriver(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    const driverName = path.basename(path.dirname(filePath));
    const hasBattery = hasCapability(content, 'measure_battery');
    const hasIlluminance = hasCapability(content, 'measure_luminance') || hasCapability(content, 'measure_illuminance');
    const hasMotion = hasCapability(content, 'alarm_motion');
    const hasSOS = hasCapability(content, 'alarm_generic') || driverName.includes('sos') || driverName.includes('emergency');
    
    let needsIAS = false;
    let needsBatteryImport = false;
    let needsIlluminanceImport = false;
    
    // Appliquer battery converter
    if (hasBattery) {
      const result = applyBatteryConverter(content);
      if (result.modified) {
        content = result.content;
        modified = true;
        needsBatteryImport = true;
        stats.battery.fixed++;
      } else if (content.includes('fromZclBatteryPercentageRemaining')) {
        stats.battery.skipped++;
      }
    }
    
    // Appliquer illuminance converter
    if (hasIlluminance) {
      const result = applyIlluminanceConverter(content);
      if (result.modified) {
        content = result.content;
        modified = true;
        needsIlluminanceImport = true;
        stats.illuminance.fixed++;
      } else if (content.includes('fromZigbeeMeasuredValue')) {
        stats.illuminance.skipped++;
      }
    }
    
    // Vérifier IASZoneEnroller pour motion/SOS
    if ((hasMotion || hasSOS) && !content.includes('IASZoneEnroller')) {
      console.log(`   ⚠️  ${driverName} - Missing IASZoneEnroller`);
      needsIAS = true;
      stats.ias.fixed++;
    } else if ((hasMotion || hasSOS) && content.includes('IASZoneEnroller')) {
      stats.ias.skipped++;
    }
    
    // Ajouter imports manquants
    if (needsBatteryImport || needsIlluminanceImport || needsIAS) {
      content = addMissingImports(content, needsBatteryImport, needsIlluminanceImport, needsIAS);
      modified = true;
      stats.imports.fixed++;
    }
    
    // Sauvegarder si modifié
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ ${driverName} - Fixed`);
      return 'fixed';
    }
    
    return 'ok';
    
  } catch (err) {
    console.error(`   ❌ ${path.basename(path.dirname(filePath))} - Error:`, err.message);
    stats.battery.errors++;
    return 'error';
  }
}

/**
 * Scanner tous les drivers
 */
function scanAllDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR);
  
  for (const driver of drivers) {
    const devicePath = path.join(DRIVERS_DIR, driver, 'device.js');
    
    if (fs.existsSync(devicePath)) {
      stats.total++;
      processDriver(devicePath);
    }
  }
}

// Exécution principale
console.log('\n📁 Scanning drivers directory...\n');
scanAllDrivers();

console.log('\n' + '='.repeat(70));
console.log('📊 RÉSUMÉ DE L\'AUDIT\n');
console.log(`Total drivers scannés: ${stats.total}`);
console.log('');
console.log('🔋 Battery Converter:');
console.log(`   ✅ Fixés: ${stats.battery.fixed}`);
console.log(`   ⏭️  Déjà OK: ${stats.battery.skipped}`);
console.log(`   ❌ Erreurs: ${stats.battery.errors}`);
console.log('');
console.log('💡 Illuminance Converter:');
console.log(`   ✅ Fixés: ${stats.illuminance.fixed}`);
console.log(`   ⏭️  Déjà OK: ${stats.illuminance.skipped}`);
console.log(`   ❌ Erreurs: ${stats.illuminance.errors}`);
console.log('');
console.log('🚨 IAS Zone Enroller:');
console.log(`   ⚠️  Manquants: ${stats.ias.fixed}`);
console.log(`   ✅ Présents: ${stats.ias.skipped}`);
console.log('');
console.log('📦 Imports:');
console.log(`   ✅ Ajoutés: ${stats.imports.fixed}`);
console.log('');
console.log('='.repeat(70));

const totalFixed = stats.battery.fixed + stats.illuminance.fixed + stats.imports.fixed;
if (totalFixed > 0) {
  console.log(`\n✅ ${totalFixed} fichiers modifiés!`);
  console.log('\nProchaine étape:');
  console.log('  git add drivers/');
  console.log('  git commit -m "fix(drivers): Apply converters and improvements to all drivers"');
  console.log('  git push origin master');
} else {
  console.log('\n✅ Tous les drivers sont déjà à jour!');
}

process.exit(stats.battery.errors > 0 ? 1 : 0);
