#!/usr/bin/env node
// AUTO FIX FROM ANALYSIS - Corrections basées sur analyse multi-critères

const fs = require('fs');
const path = require('path');

const drivers = 'c:\\Users\\HP\\Desktop\\tuya_repair\\drivers';
const reportFile = 'c:\\Users\\HP\\Desktop\\tuya_repair\\MULTI_ANALYSIS_REPORT.json';

console.log('🔧 AUTO FIX FROM ANALYSIS\n');

if (!fs.existsSync(reportFile)) {
  console.log('❌ Run: node tools/MULTI_CRITERIA_ANALYSIS.js first\n');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));

let fixed = 0;
let skipped = 0;

Object.entries(report.drivers).forEach(([driverName, analysis]) => {
  const file = path.join(drivers, driverName, 'driver.compose.json');
  if (!fs.existsSync(file)) return;
  
  try {
    let compose = JSON.parse(fs.readFileSync(file, 'utf8'));
    let modified = false;
    
    // Analyser toutes les perspectives pour ce driver
    Object.entries(analysis.perspectives).forEach(([perspectiveKey, perspective]) => {
      if (perspective.issues.length === 0) return;
      
      perspective.issues.forEach(issue => {
        const severity = issue.severity;
        const message = issue.message;
        
        // FIXES AUTOMATIQUES
        
        // 1. Capability manquante (alarm_motion)
        if (message.includes('alarm_motion')) {
          if (!compose.capabilities.includes('alarm_motion')) {
            compose.capabilities.push('alarm_motion');
            modified = true;
            console.log(`  ✅ ${driverName}: Added alarm_motion`);
          }
        }
        
        // 2. Capability measure_temperature manquante
        if (message.includes('measure_temperature')) {
          const hasTempCap = compose.capabilities.some(c => 
            c === 'measure_temperature' || (typeof c === 'object' && c.id === 'measure_temperature')
          );
          if (!hasTempCap) {
            compose.capabilities.push('measure_temperature');
            modified = true;
            console.log(`  ✅ ${driverName}: Added measure_temperature`);
          }
        }
        
        // 3. Capability measure_humidity manquante
        if (message.includes('measure_humidity')) {
          const hasHumidCap = compose.capabilities.some(c => 
            c === 'measure_humidity' || (typeof c === 'object' && c.id === 'measure_humidity')
          );
          if (!hasHumidCap) {
            compose.capabilities.push('measure_humidity');
            modified = true;
            console.log(`  ✅ ${driverName}: Added measure_humidity`);
          }
        }
        
        // 4. Energy.batteries manquant (critique SDK3)
        if (message.includes('energy.batteries manquant')) {
          const batteries = 
            driverName.includes('cr2032') ? ['CR2032'] :
            driverName.includes('cr2450') ? ['CR2450'] :
            driverName.includes('lock') || driverName.includes('valve') ? ['AA', 'AA'] :
            driverName.includes('advanced') || driverName.includes('pro') ? ['INTERNAL'] :
            ['AAA', 'AAA'];
          
          compose.energy = { batteries };
          modified = true;
          console.log(`  ✅ ${driverName}: Added energy.batteries [${batteries}]`);
        }
        
        // 5. Energy présent mais pas de battery capability
        if (message.includes('energy présent mais pas de battery')) {
          delete compose.energy;
          modified = true;
          console.log(`  ✅ ${driverName}: Removed energy (no battery capability)`);
        }
        
        // 6. Duplication battery capabilities (SDK3)
        if (message.includes('measure_battery + alarm_battery ensemble')) {
          // Garder seulement measure_battery (plus précis)
          compose.capabilities = compose.capabilities.filter(c => c !== 'alarm_battery');
          modified = true;
          console.log(`  ✅ ${driverName}: Removed alarm_battery (keeping measure_battery)`);
        }
      });
    });
    
    if (modified) {
      fs.writeFileSync(file, JSON.stringify(compose, null, 2));
      fixed++;
    } else {
      skipped++;
    }
    
  } catch (e) {
    console.log(`  ❌ ${driverName}: ${e.message}`);
  }
});

console.log(`\n📊 RÉSULTAT:`);
console.log(`  Fixés: ${fixed}`);
console.log(`  Skipped: ${skipped}\n`);
