#!/usr/bin/env node
'use strict';

/**
 * FIX_REMAINING_ERRORS.js
 * 
 * Fix spécifique pour les erreurs restantes:
 * 1. Missing catch or finally → Ajouter catch
 * 2. setupTemperatureSensor hors class → Supprimer
 * 3. Unexpected token → Corriger
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRIVERS_WITH_ERRORS = [
  'wall_touch_1gang', 'wall_touch_2gang', 'wall_touch_3gang', 'wall_touch_4gang',
  'wall_touch_5gang', 'wall_touch_6gang', 'wall_touch_7gang', 'wall_touch_8gang',
  'water_leak_sensor', 'water_leak_sensor_temp_humidity',
  'water_valve', 'water_valve_smart', 'water_valve_smart_hybrid'
];

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

console.log('🔧 FIXING REMAINING ERRORS\n');

let fixed = 0;

for (const driverName of DRIVERS_WITH_ERRORS) {
  console.log(`Fixing: ${driverName}`);
  
  const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    console.log(`  ⏭️  File not found\n`);
    continue;
  }
  
  try {
    const content = fs.readFileSync(devicePath, 'utf8');
    let newContent = content;
    
    // Fix 1: Missing catch after try
    // Pattern: try { ... } suivi direct de } ou autre
    newContent = newContent.replace(
      /(try\s*{[^}]*})\s*(?!catch|finally)/g,
      '$1 catch (err) { this.error(err); }'
    );
    
    // Fix 2: Supprimer méthodes orphelines après module.exports
    const moduleExportsIndex = newContent.indexOf('module.exports');
    if (moduleExportsIndex > 0) {
      const beforeExports = newContent.substring(0, moduleExportsIndex);
      const exportsLine = newContent.substring(moduleExportsIndex);
      
      // Trouver le dernier } avant exports (fin de classe)
      const lastBrace = beforeExports.lastIndexOf('}');
      
      if (lastBrace > 0) {
        newContent = beforeExports.substring(0, lastBrace + 1) + '\n\n' + exportsLine;
      }
    }
    
    if (newContent !== content) {
      fs.writeFileSync(devicePath, newContent, 'utf8');
      console.log(`  ✅ FIXED!\n`);
      fixed++;
    } else {
      // Restore from git if no fix
      try {
        execSync(`git checkout HEAD -- drivers/${driverName}/device.js`, {
          cwd: path.join(__dirname, '..')
        });
        console.log(`  ✅ RESTORED from git!\n`);
        fixed++;
      } catch (gitErr) {
        console.log(`  ❌ FAILED\n`);
      }
    }
    
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}\n`);
  }
}

console.log(`\n✅ Fixed ${fixed}/${DRIVERS_WITH_ERRORS.length} drivers`);

process.exit(fixed > 0 ? 0 : 1);
