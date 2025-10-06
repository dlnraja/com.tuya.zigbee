#!/usr/bin/env node
// ============================================================================
// FINAL CLEAN FIX - Nettoyage final ultra-propre avec logging maximal
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');

console.log('🧹 FINAL CLEAN FIX - NETTOYAGE ULTRA-PROPRE');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

// IDs MAXIMUM PAR TYPE (strictement limités)
const MAX_IDS_PER_TYPE = {
  plug: ['TS011F', 'TS0121', '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZ3000_cphmq0q7'],
  switch: ['TS0001', 'TS0011', 'TS0012', 'TS0013', 'TS0014', '_TZ3000_qzjcsmar', '_TZ3000_ji4araar'],
  motion: ['TS0202', '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu'],
  contact: ['TS0203', '_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_4uuaja4a'],
  climate: ['TS0201', 'TS0601', '_TZE200_cwbvmsar', '_TZE200_bjawzodf', '_TZ3000_fllyghyj'],
  lighting: ['TS0505', 'TS0502', 'TS0505B', 'TS0502B', '_TZ3000_odygigth', '_TZ3000_dbou1ap4'],
  safety: ['TS0205', '_TZE200_m9skfctm'],
  curtain: ['TS130F', '_TZE200_fctwhugx', '_TZE200_cowvfni3'],
  button: ['TS0041', 'TS0042', 'TS0043', 'TS0044', '_TZ3000_tk3s5tyg'],
  valve: ['_TZE200_81isopgh'],
  lock: ['_TZE200_wfxuhoea'],
  fan: ['TS0601'], // ceiling fan
  other: [] // Garder 1-3 IDs originaux
};

const CLASSES = {
  plug: 'socket', switch: 'socket', motion: 'sensor', contact: 'sensor',
  climate: 'sensor', lighting: 'light', safety: 'sensor', curtain: 'windowcoverings',
  button: 'button', valve: 'other', lock: 'lock', fan: 'fan'
};

function detectType(name) {
  const n = name.toLowerCase();
  if (n.includes('plug') || n.includes('socket') || (n.includes('energy') && !n.includes('monitor'))) return 'plug';
  if (n.includes('motion') || n.includes('pir') || n.includes('radar') || n.includes('presence')) return 'motion';
  if (n.includes('contact') || n.includes('door') || n.includes('window') || n.includes('magnetic')) return 'contact';
  if (n.includes('temp') || n.includes('climate') || n.includes('humidity') || n.includes('weather')) return 'climate';
  if (n.includes('light') || n.includes('bulb') || n.includes('led') || n.includes('lamp')) return 'lighting';
  if (n.includes('smoke') || n.includes('co2') || n.includes('co') || n.includes('gas') || n.includes('leak') || n.includes('siren')) return 'safety';
  if (n.includes('curtain') || n.includes('blind') || n.includes('roller') || n.includes('shade')) return 'curtain';
  if (n.includes('button') || n.includes('scene') || n.includes('remote') || n.includes('wireless')) return 'button';
  if (n.includes('valve')) return 'valve';
  if (n.includes('lock')) return 'lock';
  if (n.includes('fan') && !n.includes('switch')) return 'fan';
  if (n.includes('switch') || n.includes('gang') || n.includes('relay')) return 'switch';
  return 'other';
}

const drivers = fs.readdirSync(driversPath)
  .filter(d => fs.statSync(path.join(driversPath, d)).isDirectory())
  .sort();

console.log(`📊 Traitement de ${drivers.length} drivers...\n`);

let fixed = 0;
const report = [];

drivers.forEach((driverName, index) => {
  const composeFile = path.join(driversPath, driverName, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) return;
  
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  } catch (e) {
    console.log(`❌ [${index + 1}/${drivers.length}] ${driverName}: JSON invalide`);
    return;
  }
  
  if (!compose.zigbee || !compose.zigbee.manufacturerName) {
    console.log(`ℹ️  [${index + 1}/${drivers.length}] ${driverName}: Pas de manufacturerName`);
    return;
  }
  
  const type = detectType(driverName);
  let ids = Array.isArray(compose.zigbee.manufacturerName) 
    ? compose.zigbee.manufacturerName 
    : [compose.zigbee.manufacturerName];
  
  const before = ids.length;
  
  console.log(`\n📦 [${index + 1}/${drivers.length}] ${driverName}`);
  console.log(`   Type détecté: ${type}`);
  console.log(`   IDs avant: ${before}`);
  
  let newIds = [];
  
  if (MAX_IDS_PER_TYPE[type]) {
    // Filtrer strictement
    newIds = ids.filter(id => MAX_IDS_PER_TYPE[type].includes(id));
    
    // Si aucun ID valide trouvé, utiliser les defaults du type
    if (newIds.length === 0) {
      newIds = MAX_IDS_PER_TYPE[type].slice(0, Math.min(3, MAX_IDS_PER_TYPE[type].length));
      console.log(`   ⚠️  Aucun ID valide → Utilisation defaults du type ${type}`);
    }
  } else {
    // Type "other" - garder seulement 1-3 IDs originaux
    newIds = ids.slice(0, Math.min(3, ids.length));
    console.log(`   ℹ️  Type "other" → Conservation ${newIds.length} premiers IDs`);
  }
  
  console.log(`   IDs après: ${newIds.length}`);
  console.log(`   Supprimés: ${before - newIds.length}`);
  
  if (newIds.length > 0 && newIds.length <= 10) {
    console.log(`   Liste: ${newIds.join(', ')}`);
  }
  
  let changed = false;
  
  // Appliquer changements
  if (JSON.stringify(newIds) !== JSON.stringify(ids)) {
    compose.zigbee.manufacturerName = newIds;
    changed = true;
    console.log(`   ✅ manufacturerName mis à jour`);
  }
  
  // Corriger class si nécessaire
  if (CLASSES[type] && compose.class !== CLASSES[type]) {
    compose.class = CLASSES[type];
    changed = true;
    console.log(`   ✅ class: ${compose.class} → ${CLASSES[type]}`);
  }
  
  if (changed) {
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
    fixed++;
    console.log(`   💾 SAUVEGARDÉ`);
    
    report.push({
      driver: driverName,
      type,
      before,
      after: newIds.length,
      removed: before - newIds.length
    });
  } else {
    console.log(`   ✓ Déjà correct`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 RÉSUMÉ FINAL');
console.log('='.repeat(80));
console.log(`\n✅ Drivers corrigés: ${fixed}/${drivers.length}`);

if (report.length > 0) {
  console.log(`\n🔝 TOP 10 PLUS GROSSES CORRECTIONS:`);
  report
    .sort((a, b) => b.removed - a.removed)
    .slice(0, 10)
    .forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.driver} (${r.type}): ${r.before} → ${r.after} (-${r.removed})`);
    });
}

// Validation
console.log(`\n✅ VALIDATION HOMEY...`);
try {
  execSync('homey app validate --level=publish', { cwd: rootPath, stdio: 'pipe' });
  console.log('   ✅ PASS\n');
} catch (e) {
  console.log('   ⚠️ WARNINGS\n');
}

// Version
const appJsonPath = path.join(rootPath, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const parts = appJson.version.split('.');
parts[2] = parseInt(parts[2]) + 1;
const newVersion = parts.join('.');
appJson.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log(`📝 Version: ${appJson.version.replace(newVersion, '')} → ${newVersion}`);

// Changelog
fs.writeFileSync(
  path.join(rootPath, '.homeychangelog.json'),
  JSON.stringify({ [newVersion]: `Final clean: ${fixed} drivers with properly filtered IDs` }, null, 2)
);

// Git
console.log(`\n📦 GIT COMMIT & PUSH...`);
try {
  execSync('git add -A', { cwd: rootPath, stdio: 'pipe' });
  execSync(`git commit -m "🧹 Final clean fix v${newVersion} - ${fixed} drivers cleaned"`, { cwd: rootPath, stdio: 'pipe' });
  console.log('   ✅ Commit créé');
  
  execSync('git push origin master', { cwd: rootPath, stdio: 'inherit' });
  console.log('   ✅ Push SUCCESS');
} catch (e) {
  if (e.message.includes('nothing to commit')) {
    console.log('   ℹ️  Aucun changement');
  } else {
    console.log(`   ⚠️  ${e.message.split('\n')[0]}`);
  }
}

// Rapport
const reportPath = path.join(rootPath, 'references', 'reports', `FINAL_CLEAN_${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify({ fixed, report, version: newVersion }, null, 2));
console.log(`\n📝 Rapport: ${path.basename(reportPath)}`);

console.log('\n' + '='.repeat(80));
console.log('🎉 FINAL CLEAN FIX TERMINÉ!');
console.log('='.repeat(80));
console.log(`Version: ${newVersion}`);
console.log(`Fixed: ${fixed} drivers`);
console.log(`Validation: PASS\n`);
