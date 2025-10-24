#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 === AUDIT COMPLET SDK3 HOMEY === 🔍\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

const report = {
  timestamp: new Date().toISOString(),
  issues: {
    flowCards: [],
    capabilities: [],
    setCapabilityValue: [],
    manufacturerIds: [],
    iasZone: [],
    eventListeners: [],
    images: [],
    endpoints: []
  },
  stats: {
    totalDrivers: 0,
    totalIssues: 0,
    criticalIssues: 0,
    warningIssues: 0
  }
};

// 1. AUDIT FLOW CARDS
console.log('📋 1) AUDIT FLOW CARDS INVALIDES\n');

let appJson = {};
try {
  appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
} catch (err) {
  console.log('❌ Impossible de lire app.json:', err.message);
}

const appFlowIds = new Set();
if (appJson.flow) {
  ['triggers', 'conditions', 'actions'].forEach(type => {
    if (appJson.flow[type]) {
      appJson.flow[type].forEach(card => {
        if (card.id) appFlowIds.add(card.id);
      });
    }
  });
}

console.log(`   ✓ ${appFlowIds.size} flow cards trouvées dans app.json\n`);

// Chercher références dans drivers
function scanFlowCardReferences(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.')) {
      scanFlowCardReferences(fullPath, prefix + file + '/');
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Chercher getActionCard, getTriggerCard, getConditionCard
      const patterns = [
        /getActionCard\(['"]([^'"]+)['"]/g,
        /getTriggerCard\(['"]([^'"]+)['"]/g,
        /getConditionCard\(['"]([^'"]+)['"]/g,
        /registerRunListener.*['"]([^'"]+)['"]/g
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const cardId = match[1];
          if (cardId && cardId.length > 3 && !appFlowIds.has(cardId)) {
            report.issues.flowCards.push({
              severity: 'CRITICAL',
              file: prefix + file,
              cardId: cardId,
              message: `Flow card '${cardId}' référencée mais absente de app.json`
            });
            console.log(`   ❌ CRITICAL: ${prefix}${file}`);
            console.log(`      Card ID: ${cardId} (ABSENT de app.json)\n`);
          }
        }
      });
    }
  });
}

scanFlowCardReferences(DRIVERS_DIR);
if (fs.existsSync(LIB_DIR)) {
  scanFlowCardReferences(LIB_DIR);
}

// 2. AUDIT CAPABILITIES
console.log('\n📦 2) AUDIT CAPABILITIES MANQUANTES\n');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory() && !d.startsWith('.');
});

report.stats.totalDrivers = drivers.length;

drivers.forEach(driver => {
  const driverPath = path.join(DRIVERS_DIR, driver);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      if (!compose.capabilities || compose.capabilities.length === 0) {
        report.issues.capabilities.push({
          severity: 'WARNING',
          driver: driver,
          message: 'Aucune capability déclarée dans driver.compose.json'
        });
        console.log(`   ⚠️  WARNING: ${driver} - Pas de capabilities`);
      }
    } catch (err) {
      report.issues.capabilities.push({
        severity: 'ERROR',
        driver: driver,
        message: `Erreur parsing driver.compose.json: ${err.message}`
      });
    }
  }
});

// 3. AUDIT setCapabilityValue
console.log('\n\n🔧 3) AUDIT setCapabilityValue (TYPES)\n');

function scanSetCapabilityValue(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.')) {
      scanSetCapabilityValue(fullPath, prefix + file + '/');
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, idx) => {
        if (line.includes('setCapabilityValue')) {
          // Chercher patterns suspects: setCapabilityValue('measure_*', '...')
          const measureMatch = line.match(/setCapabilityValue\s*\(\s*['"]measure_[^'"]+['"]\s*,\s*['"][^'"]*['"]/);
          if (measureMatch) {
            report.issues.setCapabilityValue.push({
              severity: 'CRITICAL',
              file: prefix + file,
              line: idx + 1,
              code: line.trim(),
              message: 'Possible string passée à measure_* capability (devrait être number)'
            });
            console.log(`   ❌ CRITICAL: ${prefix}${file}:${idx + 1}`);
            console.log(`      ${line.trim()}\n`);
          }
          
          // Chercher absence de try/catch ou vérification de type
          const hasTypeCheck = content.includes('parseFloat') || 
                               content.includes('parseInt') || 
                               content.includes('Number(') ||
                               content.includes('typeof');
          
          if (!hasTypeCheck && line.match(/setCapabilityValue.*measure_/)) {
            report.issues.setCapabilityValue.push({
              severity: 'WARNING',
              file: prefix + file,
              line: idx + 1,
              message: 'setCapabilityValue sans vérification de type explicite'
            });
          }
        }
      });
    }
  });
}

scanSetCapabilityValue(DRIVERS_DIR);
if (fs.existsSync(LIB_DIR)) {
  scanSetCapabilityValue(LIB_DIR);
}

// 4. AUDIT MANUFACTURER IDS DUPLICATES
console.log('\n\n🏭 4) AUDIT MANUFACTURER IDs DUPLICATES\n');

const manufacturerMap = new Map();

drivers.forEach(driver => {
  const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      if (compose.zigbee && compose.zigbee.manufacturerName) {
        const manufacturers = Array.isArray(compose.zigbee.manufacturerName) 
          ? compose.zigbee.manufacturerName 
          : [compose.zigbee.manufacturerName];
        
        const productIds = compose.zigbee.productId 
          ? (Array.isArray(compose.zigbee.productId) ? compose.zigbee.productId : [compose.zigbee.productId])
          : [];
        
        manufacturers.forEach(mfg => {
          productIds.forEach(pid => {
            const key = `${mfg}::${pid}`;
            if (!manufacturerMap.has(key)) {
              manufacturerMap.set(key, []);
            }
            manufacturerMap.get(key).push(driver);
          });
        });
      }
    } catch (err) {
      // Ignore
    }
  }
});

manufacturerMap.forEach((driverList, key) => {
  if (driverList.length > 1) {
    const [mfg, pid] = key.split('::');
    report.issues.manufacturerIds.push({
      severity: 'CRITICAL',
      manufacturerName: mfg,
      productId: pid,
      drivers: driverList,
      message: `${driverList.length} drivers partagent le même manufacturer/product ID`
    });
    console.log(`   ❌ CRITICAL: ${mfg} / ${pid}`);
    console.log(`      Drivers: ${driverList.join(', ')}\n`);
  }
});

// 5. AUDIT IAS ZONE CONVERSIONS
console.log('\n\n🔒 5) AUDIT IAS ZONE CONVERSIONS\n');

function scanIASZone(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.')) {
      scanIASZone(fullPath, prefix + file + '/');
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, idx) => {
        // Chercher usage de replace sans conversion String
        if (line.includes('.replace(') && 
            (line.includes('ieee') || line.includes('IEEE') || line.includes('addr'))) {
          
          // Vérifier si String() est présent avant
          const hasStringConversion = line.includes('String(') || line.includes('.toString()');
          
          if (!hasStringConversion) {
            report.issues.iasZone.push({
              severity: 'CRITICAL',
              file: prefix + file,
              line: idx + 1,
              code: line.trim(),
              message: 'Usage de .replace() sur IEEE addr sans conversion String explicite'
            });
            console.log(`   ❌ CRITICAL: ${prefix}${file}:${idx + 1}`);
            console.log(`      ${line.trim()}\n`);
          }
        }
      });
    }
  });
}

scanIASZone(DRIVERS_DIR);
if (fs.existsSync(LIB_DIR)) {
  scanIASZone(LIB_DIR);
}

// 6. AUDIT EVENT LISTENERS MULTIPLES
console.log('\n\n👂 6) AUDIT EVENT LISTENERS MULTIPLES\n');

function scanEventListeners(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.')) {
      scanEventListeners(fullPath, prefix + file + '/');
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Chercher .on('report') ou .on('message') sans removeListener avant
      const hasOnReport = content.includes(".on('report'") || content.includes('.on("report"');
      const hasOnMessage = content.includes(".on('message'") || content.includes('.on("message"');
      const hasRemoveListener = content.includes('removeListener') || content.includes('off(');
      
      if ((hasOnReport || hasOnMessage) && !hasRemoveListener) {
        report.issues.eventListeners.push({
          severity: 'WARNING',
          file: prefix + file,
          message: 'Event listener attaché sans removeListener - risque de listeners multiples'
        });
        console.log(`   ⚠️  WARNING: ${prefix}${file}`);
        console.log(`      Event listener sans cleanup\n`);
      }
    }
  });
}

scanEventListeners(DRIVERS_DIR);
if (fs.existsSync(LIB_DIR)) {
  scanEventListeners(LIB_DIR);
}

// 7. AUDIT IMAGES PERSONNALISÉES
console.log('\n\n🖼️  7) AUDIT IMAGES DRIVERS PERSONNALISÉES\n');

drivers.forEach(driver => {
  const assetsPath = path.join(DRIVERS_DIR, driver, 'assets', 'images');
  
  if (fs.existsSync(assetsPath)) {
    const images = fs.readdirSync(assetsPath).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    
    if (images.length === 0) {
      report.issues.images.push({
        severity: 'WARNING',
        driver: driver,
        message: 'Dossier assets/images existe mais vide'
      });
    } else {
      // Vérifier présence des 3 tailles requises
      const hasSmall = images.some(i => i.includes('small'));
      const hasLarge = images.some(i => i.includes('large'));
      const hasXlarge = images.some(i => i.includes('xlarge'));
      
      if (!hasSmall || !hasLarge || !hasXlarge) {
        report.issues.images.push({
          severity: 'WARNING',
          driver: driver,
          images: images,
          message: `Images incomplètes (requis: small, large, xlarge). Trouvé: ${images.join(', ')}`
        });
        console.log(`   ⚠️  WARNING: ${driver}`);
        console.log(`      Images: ${images.join(', ')}\n`);
      }
    }
  } else {
    report.issues.images.push({
      severity: 'WARNING',
      driver: driver,
      message: 'Pas de dossier assets/images'
    });
  }
});

// 8. STATISTIQUES FINALES
console.log('\n\n📊 === STATISTIQUES FINALES ===\n');

Object.keys(report.issues).forEach(category => {
  const issues = report.issues[category];
  const critical = issues.filter(i => i.severity === 'CRITICAL').length;
  const warnings = issues.filter(i => i.severity === 'WARNING').length;
  
  report.stats.totalIssues += issues.length;
  report.stats.criticalIssues += critical;
  report.stats.warningIssues += warnings;
  
  console.log(`${category.toUpperCase()}:`);
  console.log(`   Total: ${issues.length}`);
  if (critical > 0) console.log(`   ❌ Critical: ${critical}`);
  if (warnings > 0) console.log(`   ⚠️  Warnings: ${warnings}`);
  console.log();
});

console.log(`TOTAL DRIVERS: ${report.stats.totalDrivers}`);
console.log(`TOTAL ISSUES: ${report.stats.totalIssues}`);
console.log(`   ❌ CRITICAL: ${report.stats.criticalIssues}`);
console.log(`   ⚠️  WARNING: ${report.stats.warningIssues}`);

// Sauvegarder rapport JSON
const reportPath = path.join(ROOT, 'AUDIT_SDK3_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`\n💾 Rapport complet sauvegardé: AUDIT_SDK3_REPORT.json`);

console.log('\n\n🎯 === ACTIONS RECOMMANDÉES ===\n');

if (report.stats.criticalIssues > 0) {
  console.log('❌ PRIORITÉ CRITIQUE:');
  console.log('   1. Corriger flow cards invalides (plantages au boot)');
  console.log('   2. Corriger conversions IAS Zone (sensors ne fonctionnent pas)');
  console.log('   3. Corriger types setCapabilityValue (données incorrectes)');
  console.log('   4. Dédupliquer manufacturer IDs (mauvais driver détecté)\n');
}

if (report.stats.warningIssues > 0) {
  console.log('⚠️  PRIORITÉ MOYENNE:');
  console.log('   1. Ajouter removeListener pour éviter memory leaks');
  console.log('   2. Compléter images drivers (UX)');
  console.log('   3. Déclarer capabilities manquantes\n');
}

console.log('💡 PROCHAINES ÉTAPES:');
console.log('   1. Examiner AUDIT_SDK3_REPORT.json');
console.log('   2. Lancer script de correction automatique');
console.log('   3. Tester avec homey app validate --level publish');
console.log('   4. Re-pair devices affectés\n');

process.exit(report.stats.criticalIssues > 0 ? 1 : 0);
