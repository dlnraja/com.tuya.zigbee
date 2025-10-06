#!/usr/bin/env node
// ============================================================================
// FIX ENERGY IN COMPOSE - Ajouter energy dans driver.compose.json (SOURCE)
// ============================================================================

const fs = require('fs');
const path = require('path');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');

console.log('🔋 FIX ENERGY IN COMPOSE - Source Files');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

const report = {
  fixed: 0,
  skipped: 0,
  errors: []
};

// ============================================================================
// DÉTECTION TYPE BATTERIE
// ============================================================================
function detectBatteryType(driverName) {
  const nameLower = driverName.toLowerCase();
  
  if (nameLower.includes('cr2032')) return ['CR2032'];
  if (nameLower.includes('cr2450')) return ['CR2450'];
  if (nameLower.includes('button') || nameLower.includes('wireless') || nameLower.includes('remote')) return ['CR2032'];
  if (nameLower.includes('motion') || nameLower.includes('pir') || nameLower.includes('contact')) return ['AAA', 'CR2032'];
  if (nameLower.includes('sensor') || nameLower.includes('detector')) return ['AAA', 'CR2032'];
  if (nameLower.includes('lock') || nameLower.includes('valve')) return ['AA'];
  if (nameLower.includes('smart') || nameLower.includes('pro') || nameLower.includes('advanced')) return ['INTERNAL'];
  
  return ['CR2032', 'AAA'];
}

// ============================================================================
// CORRECTION COMPOSE FILES
// ============================================================================
function fixComposeFiles() {
  console.log('📋 Correction driver.compose.json...\n');
  
  const drivers = fs.readdirSync(driversPath).filter(d => 
    fs.statSync(path.join(driversPath, d)).isDirectory()
  );
  
  for (const driverName of drivers) {
    const composeFile = path.join(driversPath, driverName, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) {
      report.skipped++;
      continue;
    }
    
    try {
      let compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      let modified = false;
      
      // Vérifier capabilities
      const capabilities = compose.capabilities || [];
      const hasBattery = capabilities.some(cap => {
        const capStr = typeof cap === 'string' ? cap : cap.id || '';
        return capStr === 'measure_battery' || capStr.startsWith('measure_battery.');
      });
      
      if (hasBattery) {
        // Forcer energy.batteries
        if (!compose.energy) {
          compose.energy = {};
          modified = true;
        }
        
        if (!compose.energy.batteries || compose.energy.batteries.length === 0) {
          const batteries = detectBatteryType(driverName);
          compose.energy.batteries = batteries;
          console.log(`  🔋 ${driverName}: [${batteries.join(', ')}]`);
          modified = true;
          report.fixed++;
        } else {
          report.skipped++;
        }
      } else {
        // Supprimer energy si pas de battery
        if (compose.energy) {
          delete compose.energy;
          modified = true;
          console.log(`  🗑️ ${driverName}: energy supprimé (pas de battery)`);
        }
      }
      
      if (modified) {
        fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
      }
      
    } catch (e) {
      console.log(`  ❌ ${driverName}: ${e.message}`);
      report.errors.push({ driver: driverName, error: e.message });
    }
  }
}

// ============================================================================
// RAPPORT
// ============================================================================
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RAPPORT');
  console.log('='.repeat(80));
  
  console.log(`\n✅ Corrigés: ${report.fixed}`);
  console.log(`⏭️ Skipped: ${report.skipped}`);
  console.log(`❌ Erreurs: ${report.errors.length}`);
  
  if (report.errors.length > 0) {
    console.log('\n❌ ERREURS:');
    report.errors.forEach(e => console.log(`  • ${e.driver}: ${e.error}`));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ SOURCES CORRIGÉES');
  console.log('='.repeat(80) + '\n');
  
  console.log('🔄 PROCHAINES ÉTAPES:');
  console.log('  1. Supprimer cache: Remove-Item -Recurse -Force .homeycompose');
  console.log('  2. Build: homey app build');
  console.log('  3. Validate: homey app validate --level=publish\n');
}

// ============================================================================
// EXÉCUTION
// ============================================================================
fixComposeFiles();
generateReport();
