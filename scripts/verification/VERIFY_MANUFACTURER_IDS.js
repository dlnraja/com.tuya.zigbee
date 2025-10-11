#!/usr/bin/env node

/**
 * ✅ VERIFY MANUFACTURER IDs
 * 
 * Vérifie la cohérence et complétude des manufacturer IDs
 * dans tous les drivers
 * 
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

/**
 * Patterns valides
 */
const VALID_PATTERNS = [
  /^_TZ\d{4}_[a-z0-9]{8}$/,   // _TZ3000_abcd1234
  /^_TZE\d{3}_[a-z0-9]{8}$/,  // _TZE200_abcd1234
  /^TS\d{4}[A-Z]?$/,           // TS0001, TS011F
  /^(MOES|BSEED|Lonsonho|Nedis|Woodupp|Tuya)$/i
];

/**
 * Vérifie la validité d'un manufacturer ID
 */
function isValidManufacturerId(id) {
  return VALID_PATTERNS.some(pattern => pattern.test(id));
}

/**
 * Vérifie un driver
 */
function verifyDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return { driver: driverName, error: 'No driver.compose.json' };
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    const manufacturerName = compose.zigbee?.manufacturerName || [];
    
    if (!Array.isArray(manufacturerName)) {
      return {
        driver: driverName,
        error: 'manufacturerName is not an array',
        value: manufacturerName
      };
    }
    
    if (manufacturerName.length === 0) {
      return {
        driver: driverName,
        warning: 'No manufacturer IDs',
        count: 0
      };
    }
    
    // Vérifier chaque ID
    const invalid = [];
    const duplicates = [];
    const seen = new Set();
    
    manufacturerName.forEach(id => {
      if (!isValidManufacturerId(id)) {
        invalid.push(id);
      }
      
      if (seen.has(id)) {
        duplicates.push(id);
      }
      seen.add(id);
    });
    
    const result = {
      driver: driverName,
      count: manufacturerName.length,
      unique: seen.size,
      valid: manufacturerName.length - invalid.length
    };
    
    if (invalid.length > 0) {
      result.invalid = invalid;
    }
    
    if (duplicates.length > 0) {
      result.duplicates = duplicates;
    }
    
    // Catégoriser les IDs
    const categories = {
      TZ3000: manufacturerName.filter(id => id.startsWith('_TZ3000_')).length,
      TZE200: manufacturerName.filter(id => id.startsWith('_TZE200_')).length,
      TZE204: manufacturerName.filter(id => id.startsWith('_TZE204_')).length,
      TZE284: manufacturerName.filter(id => id.startsWith('_TZE284_')).length,
      TS: manufacturerName.filter(id => id.startsWith('TS')).length,
      brands: manufacturerName.filter(id => 
        VALID_PATTERNS[3].test(id)
      ).length
    };
    
    result.categories = categories;
    
    return result;
    
  } catch (error) {
    return {
      driver: driverName,
      error: `Parse error: ${error.message}`
    };
  }
}

/**
 * Analyse globale
 */
function analyzeAll(results) {
  console.log('\n📊 ANALYSE GLOBALE\n');
  console.log('='.repeat(70) + '\n');
  
  const stats = {
    total: results.length,
    errors: results.filter(r => r.error).length,
    warnings: results.filter(r => r.warning).length,
    withInvalid: results.filter(r => r.invalid && r.invalid.length > 0).length,
    withDuplicates: results.filter(r => r.duplicates && r.duplicates.length > 0).length,
    totalIds: 0,
    uniqueIds: new Set(),
    categoriesTotal: {
      TZ3000: 0,
      TZE200: 0,
      TZE204: 0,
      TZE284: 0,
      TS: 0,
      brands: 0
    }
  };
  
  results.forEach(r => {
    if (r.count) {
      stats.totalIds += r.count;
    }
    
    if (r.categories) {
      Object.keys(stats.categoriesTotal).forEach(cat => {
        stats.categoriesTotal[cat] += r.categories[cat] || 0;
      });
    }
  });
  
  console.log(`📁 Drivers analysés: ${stats.total}`);
  console.log(`❌ Erreurs: ${stats.errors}`);
  console.log(`⚠️  Warnings: ${stats.warnings}`);
  console.log(`🚫 Avec IDs invalides: ${stats.withInvalid}`);
  console.log(`🔁 Avec duplicats: ${stats.withDuplicates}`);
  console.log(`🏭 Total manufacturer IDs: ${stats.totalIds}`);
  
  console.log('\n📊 RÉPARTITION PAR CATÉGORIE:\n');
  Object.entries(stats.categoriesTotal).forEach(([cat, count]) => {
    const percentage = ((count / stats.totalIds) * 100).toFixed(1);
    console.log(`${cat.padEnd(10)}: ${count.toString().padStart(4)} (${percentage}%)`);
  });
  
  return stats;
}

/**
 * Génère rapport détaillé
 */
function generateDetailedReport(results) {
  console.log('\n📝 RAPPORT DÉTAILLÉ\n');
  console.log('='.repeat(70) + '\n');
  
  // Erreurs
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.log('❌ ERREURS:\n');
    errors.forEach(r => {
      console.log(`  ${r.driver}: ${r.error}`);
    });
    console.log('');
  }
  
  // Warnings
  const warnings = results.filter(r => r.warning);
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach(r => {
      console.log(`  ${r.driver}: ${r.warning}`);
    });
    console.log('');
  }
  
  // IDs invalides
  const invalids = results.filter(r => r.invalid && r.invalid.length > 0);
  if (invalids.length > 0) {
    console.log('🚫 IDs INVALIDES:\n');
    invalids.forEach(r => {
      console.log(`  ${r.driver}:`);
      r.invalid.forEach(id => console.log(`    - ${id}`));
    });
    console.log('');
  }
  
  // Duplicats
  const duplicates = results.filter(r => r.duplicates && r.duplicates.length > 0);
  if (duplicates.length > 0) {
    console.log('🔁 DUPLICATS:\n');
    duplicates.forEach(r => {
      console.log(`  ${r.driver}:`);
      r.duplicates.forEach(id => console.log(`    - ${id}`));
    });
    console.log('');
  }
  
  // Top drivers (plus de manufacturer IDs)
  const topDrivers = results
    .filter(r => r.count)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  if (topDrivers.length > 0) {
    console.log('🏆 TOP 10 DRIVERS (plus de manufacturer IDs):\n');
    topDrivers.forEach((r, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${r.driver.padEnd(40)} : ${r.count} IDs`);
    });
    console.log('');
  }
}

async function main() {
  console.log('\n✅ VERIFY MANUFACTURER IDs\n');
  console.log('='.repeat(70) + '\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  
  console.log(`📁 ${drivers.length} drivers à vérifier\n`);
  
  const results = drivers.map(verifyDriver);
  
  // Analyser
  const stats = analyzeAll(results);
  
  // Rapport détaillé
  generateDetailedReport(results);
  
  // Sauvegarder
  const outputFile = path.join(ROOT, 'reports', 'manufacturer_ids_verification.json');
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify({ results, stats }, null, 2));
  console.log(`\n💾 Rapport sauvegardé: ${outputFile}`);
  
  // Status final
  if (stats.errors === 0 && stats.withInvalid === 0) {
    console.log('\n✅ VÉRIFICATION RÉUSSIE - Aucun problème détecté!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  VÉRIFICATION TERMINÉE - Problèmes détectés!\n');
    process.exit(1);
  }
}

main().catch(console.error);
