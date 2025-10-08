#!/usr/bin/env node
// ============================================================================
// ULTRA VERBOSE CHECK - Vérification complète avec logging maximal
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');

console.log('🔍 ULTRA VERBOSE CHECK - LOGGING MAXIMAL');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`Root path: ${rootPath}`);
console.log(`Drivers path: ${driversPath}`);
console.log('='.repeat(80));

// ============================================================================
// 1. CHECK STRUCTURE ROOT
// ============================================================================
console.log('\n📁 CHECK 1: STRUCTURE ROOT\n');

const essentialFiles = [
  '.gitignore', '.homeychangelog.json', '.homeyignore',
  '.prettierignore', '.prettierrc', 'README.md',
  'app.json', 'package.json', 'package-lock.json'
];

console.log('Vérification fichiers essentiels:');
essentialFiles.forEach(file => {
  const filePath = path.join(rootPath, file);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${file}`);
  
  if (exists) {
    const stat = fs.statSync(filePath);
    console.log(`     Size: ${stat.size} bytes`);
    console.log(`     Modified: ${stat.mtime.toISOString()}`);
  }
});

// ============================================================================
// 2. CHECK APP.JSON
// ============================================================================
console.log('\n📦 CHECK 2: APP.JSON DÉTAILS\n');

const appJsonPath = path.join(rootPath, 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  console.log(`Version: ${appJson.version}`);
  console.log(`ID: ${appJson.id}`);
  console.log(`SDK: ${appJson.sdk}`);
  console.log(`Compatibility: ${appJson.compatibility}`);
  console.log(`Name (EN): ${appJson.name?.en}`);
  console.log(`Category: ${appJson.category}`);
  
  if (appJson.drivers) {
    console.log(`\nDrivers dans app.json: ${appJson.drivers.length}`);
    console.log('Premier driver:');
    console.log(`  ID: ${appJson.drivers[0]?.id}`);
    console.log(`  Name: ${JSON.stringify(appJson.drivers[0]?.name)}`);
    console.log(`  Class: ${appJson.drivers[0]?.class}`);
  }
} else {
  console.log('❌ app.json NOT FOUND!');
}

// ============================================================================
// 3. CHECK TOUS LES DRIVERS
// ============================================================================
console.log('\n🚗 CHECK 3: ANALYSE COMPLÈTE DRIVERS\n');

const drivers = fs.readdirSync(driversPath)
  .filter(d => fs.statSync(path.join(driversPath, d)).isDirectory())
  .sort();

console.log(`Total drivers trouvés: ${drivers.length}\n`);

const driverStats = {
  total: drivers.length,
  withCompose: 0,
  withDevice: 0,
  withPair: 0,
  withAssets: 0,
  byClass: {},
  byType: {},
  idCounts: []
};

drivers.forEach((driverName, index) => {
  console.log(`\n[${index + 1}/${drivers.length}] 📦 ${driverName}`);
  console.log('-'.repeat(80));
  
  const driverDir = path.join(driversPath, driverName);
  
  // Check files
  const composeFile = path.join(driverDir, 'driver.compose.json');
  const deviceFile = path.join(driverDir, 'device.js');
  const pairDir = path.join(driverDir, 'pair');
  const assetsDir = path.join(driverDir, 'assets');
  
  console.log(`  📂 Fichiers:`);
  console.log(`     driver.compose.json: ${fs.existsSync(composeFile) ? '✅' : '❌'}`);
  console.log(`     device.js: ${fs.existsSync(deviceFile) ? '✅' : '❌'}`);
  console.log(`     pair/: ${fs.existsSync(pairDir) ? '✅' : '❌'}`);
  console.log(`     assets/: ${fs.existsSync(assetsDir) ? '✅' : '❌'}`);
  
  if (fs.existsSync(composeFile)) {
    driverStats.withCompose++;
    
    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      
      console.log(`  📋 Détails driver.compose.json:`);
      console.log(`     name: ${JSON.stringify(compose.name)}`);
      console.log(`     class: ${compose.class}`);
      
      // Stats class
      driverStats.byClass[compose.class] = (driverStats.byClass[compose.class] || 0) + 1;
      
      // Capabilities
      if (compose.capabilities) {
        console.log(`     capabilities: [${compose.capabilities.length}] ${compose.capabilities.slice(0, 3).join(', ')}${compose.capabilities.length > 3 ? '...' : ''}`);
      }
      
      // Manufacturer IDs
      if (compose.zigbee?.manufacturerName) {
        const ids = Array.isArray(compose.zigbee.manufacturerName) 
          ? compose.zigbee.manufacturerName 
          : [compose.zigbee.manufacturerName];
        
        console.log(`     manufacturerName: [${ids.length} IDs]`);
        console.log(`       Premier: ${ids[0]}`);
        if (ids.length > 1) console.log(`       Dernier: ${ids[ids.length - 1]}`);
        
        driverStats.idCounts.push({ driver: driverName, count: ids.length });
        
        // Vérifier cohérence
        const hasTS = ids.some(id => id.startsWith('TS'));
        const hasTZ = ids.some(id => id.startsWith('_TZ'));
        console.log(`       Types: ${hasTS ? 'TS' : ''} ${hasTZ ? '_TZ*' : ''}`);
      }
      
      // Product IDs
      if (compose.zigbee?.productId) {
        const pids = Array.isArray(compose.zigbee.productId) 
          ? compose.zigbee.productId 
          : [compose.zigbee.productId];
        console.log(`     productId: [${pids.length}] ${pids.join(', ')}`);
      }
      
      // Endpoints
      if (compose.zigbee?.endpoints) {
        const endpointKeys = Object.keys(compose.zigbee.endpoints);
        console.log(`     endpoints: [${endpointKeys.length}] ${endpointKeys.join(', ')}`);
      }
      
      // Energy
      if (compose.energy) {
        console.log(`     energy: ${JSON.stringify(compose.energy).substring(0, 50)}...`);
      }
      
    } catch (e) {
      console.log(`  ❌ ERREUR lecture JSON: ${e.message}`);
    }
  }
  
  if (fs.existsSync(deviceFile)) {
    driverStats.withDevice++;
    const deviceContent = fs.readFileSync(deviceFile, 'utf8');
    const lines = deviceContent.split('\n').length;
    console.log(`  📄 device.js: ${lines} lignes`);
  }
  
  if (fs.existsSync(pairDir)) {
    driverStats.withPair++;
    const pairFiles = fs.readdirSync(pairDir);
    console.log(`  🔗 pair/: ${pairFiles.length} fichiers`);
  }
  
  if (fs.existsSync(assetsDir)) {
    driverStats.withAssets++;
    const assetFiles = fs.readdirSync(assetsDir);
    console.log(`  🖼️ assets/: ${assetFiles.length} fichiers`);
  }
  
  // Détection type
  const type = detectType(driverName);
  if (type) {
    console.log(`  🏷️ Type détecté: ${type}`);
    driverStats.byType[type] = (driverStats.byType[type] || 0) + 1;
  }
});

// ============================================================================
// 4. STATISTIQUES GLOBALES
// ============================================================================
console.log('\n\n📊 CHECK 4: STATISTIQUES GLOBALES\n');
console.log('='.repeat(80));

console.log(`\n📦 DRIVERS:`);
console.log(`  Total: ${driverStats.total}`);
console.log(`  Avec driver.compose.json: ${driverStats.withCompose}`);
console.log(`  Avec device.js: ${driverStats.withDevice}`);
console.log(`  Avec pair/: ${driverStats.withPair}`);
console.log(`  Avec assets/: ${driverStats.withAssets}`);

console.log(`\n🏷️ PAR CLASS:`);
Object.entries(driverStats.byClass)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cls, count]) => {
    console.log(`  ${cls}: ${count} drivers`);
  });

console.log(`\n📋 PAR TYPE:`);
Object.entries(driverStats.byType)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count} drivers`);
  });

console.log(`\n🔢 TOP 10 DRIVERS PAR NOMBRE D'IDs:`);
driverStats.idCounts
  .sort((a, b) => b.count - a.count)
  .slice(0, 10)
  .forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.driver}: ${item.count} IDs`);
  });

// ============================================================================
// 5. VALIDATION HOMEY
// ============================================================================
console.log('\n\n✅ CHECK 5: VALIDATION HOMEY\n');
console.log('='.repeat(80));

try {
  console.log('Exécution: homey app validate --level=publish');
  const output = execSync('homey app validate --level=publish', {
    cwd: rootPath,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log(output);
  console.log('\n✅ VALIDATION: PASS');
  
} catch (e) {
  console.log('\n⚠️ VALIDATION: WARNINGS OU ERREURS');
  console.log(e.stdout || e.stderr || e.message);
}

// ============================================================================
// 6. GIT STATUS
// ============================================================================
console.log('\n\n📦 CHECK 6: GIT STATUS\n');
console.log('='.repeat(80));

try {
  const status = execSync('git status --short', {
    cwd: rootPath,
    encoding: 'utf8'
  });
  
  if (status.trim()) {
    console.log('Fichiers modifiés:');
    console.log(status);
  } else {
    console.log('✅ Working tree clean (aucun changement)');
  }
  
  const branch = execSync('git branch --show-current', {
    cwd: rootPath,
    encoding: 'utf8'
  }).trim();
  console.log(`\nBranche actuelle: ${branch}`);
  
  const lastCommit = execSync('git log -1 --oneline', {
    cwd: rootPath,
    encoding: 'utf8'
  }).trim();
  console.log(`Dernier commit: ${lastCommit}`);
  
} catch (e) {
  console.log('❌ Erreur Git:', e.message);
}

// ============================================================================
// 7. RAPPORT FINAL
// ============================================================================
console.log('\n\n📊 RAPPORT FINAL ULTRA VERBOSE\n');
console.log('='.repeat(80));

const finalReport = {
  timestamp: new Date().toISOString(),
  root: {
    essentialFiles: essentialFiles.filter(f => fs.existsSync(path.join(rootPath, f))).length,
    totalFiles: essentialFiles.length
  },
  drivers: driverStats,
  validation: 'See above',
  git: 'See above'
};

console.log(JSON.stringify(finalReport, null, 2));

// Sauvegarder rapport
const reportPath = path.join(rootPath, 'references', 'reports', 
  `ULTRA_VERBOSE_CHECK_${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));

console.log(`\n📝 Rapport sauvegardé: ${reportPath}`);

console.log('\n' + '='.repeat(80));
console.log('🎉 ULTRA VERBOSE CHECK TERMINÉ');
console.log('='.repeat(80));
console.log(`Durée: ${new Date().toISOString()}\n`);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function detectType(name) {
  const n = name.toLowerCase();
  if (n.includes('plug') || n.includes('socket') || n.includes('energy')) return 'plug';
  if (n.includes('motion') || n.includes('pir')) return 'motion';
  if (n.includes('contact') || n.includes('door') || n.includes('window')) return 'contact';
  if (n.includes('temp') || n.includes('climate') || n.includes('humidity')) return 'climate';
  if (n.includes('light') || n.includes('bulb') || n.includes('led')) return 'lighting';
  if (n.includes('smoke') || n.includes('co') || n.includes('gas') || n.includes('leak')) return 'safety';
  if (n.includes('curtain') || n.includes('blind') || n.includes('motor')) return 'curtain';
  if (n.includes('button') || n.includes('scene') || n.includes('remote') || n.includes('wireless')) return 'button';
  if (n.includes('valve')) return 'valve';
  if (n.includes('lock')) return 'lock';
  if (n.includes('switch') || n.includes('gang') || n.includes('relay')) return 'switch';
  return null;
}
