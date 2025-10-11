#!/usr/bin/env node

/**
 * 📂 VERIFY DRIVER STRUCTURE
 * Vérifie structure complète de chaque driver
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const REQUIRED_STRUCTURE = {
  files: ['driver.compose.json', 'device.js'],
  dirs: ['assets'],
  optional: ['pair', 'driver.js']
};

function verifyDriverStructure(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const result = {
    driver: driverName,
    missing: [],
    extra: [],
    valid: true
  };
  
  // Vérifier fichiers requis
  REQUIRED_STRUCTURE.files.forEach(file => {
    if (!fs.existsSync(path.join(driverPath, file))) {
      result.missing.push(file);
      result.valid = false;
    }
  });
  
  // Vérifier dossiers requis
  REQUIRED_STRUCTURE.dirs.forEach(dir => {
    if (!fs.existsSync(path.join(driverPath, dir))) {
      result.missing.push(dir + '/');
      result.valid = false;
    }
  });
  
  // Lister tous les fichiers
  const items = fs.readdirSync(driverPath);
  result.contents = {
    files: items.filter(i => fs.statSync(path.join(driverPath, i)).isFile()),
    dirs: items.filter(i => fs.statSync(path.join(driverPath, i)).isDirectory())
  };
  
  return result;
}

async function main() {
  console.log('\n📂 VERIFY DRIVER STRUCTURE\n');
  console.log('='.repeat(70) + '\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  
  console.log(`📁 ${drivers.length} drivers à vérifier\n`);
  
  const results = drivers.map(verifyDriverStructure);
  const invalid = results.filter(r => !r.valid);
  
  console.log(`✅ Structure valide: ${results.length - invalid.length}`);
  console.log(`❌ Structure invalide: ${invalid.length}`);
  
  if (invalid.length > 0) {
    console.log('\n❌ PROBLÈMES DE STRUCTURE:\n');
    invalid.forEach(r => {
      console.log(`${r.driver}:`);
      r.missing.forEach(m => console.log(`  ❌ Manquant: ${m}`));
    });
  }
  
  // Statistiques
  const stats = {
    withPair: results.filter(r => r.contents.dirs.includes('pair')).length,
    withDriverJs: results.filter(r => r.contents.files.includes('driver.js')).length,
    avgFiles: (results.reduce((acc, r) => acc + r.contents.files.length, 0) / results.length).toFixed(1)
  };
  
  console.log('\n📊 STATISTIQUES:\n');
  console.log(`📁 Avec pair/: ${stats.withPair}`);
  console.log(`📄 Avec driver.js: ${stats.withDriverJs}`);
  console.log(`📊 Fichiers moyen: ${stats.avgFiles}`);
  
  const outputFile = path.join(ROOT, 'reports', 'driver_structure.json');
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify({ results, stats }, null, 2));
  console.log(`\n💾 Rapport: ${outputFile}\n`);
  
  process.exit(invalid.length > 0 ? 1 : 0);
}

main().catch(console.error);
