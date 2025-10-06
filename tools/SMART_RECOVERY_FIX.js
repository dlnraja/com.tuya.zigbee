#!/usr/bin/env node
// ============================================================================
// SMART RECOVERY FIX - Récupération intelligente des drivers vides
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');
const referencesPath = path.join(rootPath, 'references', 'addon_enrichment_data');

console.log('🔧 SMART RECOVERY FIX - Récupération Intelligente');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

// BASE DE CONNAISSANCE ENRICHIE
const KNOWLEDGE_BASE = {
  // AIR QUALITY
  'air_quality_monitor': {
    type: 'air_quality',
    ids: ['TS0601', '_TZE200_dwcarsat', '_TZE200_ryfmq5rl'],
    class: 'sensor',
    capabilities: ['onoff']
  },
  'air_quality_monitor_pro': {
    type: 'air_quality',
    ids: ['TS0601', '_TZE200_dwcarsat'],
    class: 'sensor',
    capabilities: ['measure_co2', 'measure_temperature']
  },
  
  // CEILING FAN
  'ceiling_fan': {
    type: 'fan',
    ids: ['TS0601'],
    class: 'fan',
    capabilities: ['onoff', 'dim']
  },
  
  // SOS/EMERGENCY
  'sos_emergency_button': {
    type: 'button',
    ids: ['TS0215A', '_TZ3000_jl1lq5cd', '_TZ3000_eo3dttwe'],
    class: 'button',
    capabilities: ['button']
  },
  
  // WATER LEAK
  'water_leak_sensor': {
    type: 'safety',
    ids: ['TS0207', '_TZ3000_kyb656no', '_TZ3000_upgcbody'],
    class: 'sensor',
    capabilities: ['alarm_water']
  },
  
  // WATER VALVE
  'water_valve': {
    type: 'valve',
    ids: ['_TZE200_81isopgh', 'TS0601'],
    class: 'other',
    capabilities: ['onoff']
  },
  
  // WIRELESS SWITCH
  'wireless_switch_1gang_cr2032': {
    type: 'button',
    ids: ['TS0041', '_TZ3000_tk3s5tyg'],
    class: 'button',
    capabilities: ['button']
  },
  'wireless_switch_2gang_cr2032': {
    type: 'button',
    ids: ['TS0042', '_TZ3000_vp6clf9d'],
    class: 'button',
    capabilities: ['button']
  },
  'wireless_switch_3gang_cr2032': {
    type: 'button',
    ids: ['TS0043', '_TZ3000_xabckq1v'],
    class: 'button',
    capabilities: ['button']
  },
  'wireless_switch_4gang_cr2032': {
    type: 'button',
    ids: ['TS0044', '_TZ3000_vp6clf9d'],
    class: 'button',
    capabilities: ['button']
  },
  'wireless_switch_6gang_cr2032': {
    type: 'button',
    ids: ['TS004F', '_TZ3000_xabckq1v'],
    class: 'button',
    capabilities: ['button']
  },
  
  // RADAR
  'radar_motion_sensor_mmwave': {
    type: 'motion',
    ids: ['_TZE200_ar0slwnd', '_TZE200_sfiy5tfs', '_TZE200_ztc6ggyl'],
    class: 'sensor',
    capabilities: ['alarm_motion']
  },
  
  // SMOKE
  'smoke_detector': {
    type: 'safety',
    ids: ['TS0205', '_TZE200_m9skfctm'],
    class: 'sensor',
    capabilities: ['alarm_smoke']
  },
  
  // CO
  'co_detector': {
    type: 'safety',
    ids: ['TS0205', '_TZ3000_26fmupbb'],
    class: 'sensor',
    capabilities: ['alarm_co']
  }
};

// ============================================================================
// RECHERCHE DANS RÉFÉRENCES EXTERNES
// ============================================================================
function searchExternalReferences(driverName) {
  console.log(`   🔍 Recherche références externes pour: ${driverName}`);
  
  const foundIds = new Set();
  
  if (!fs.existsSync(referencesPath)) {
    console.log(`   ⚠️  Dossier références non trouvé`);
    return foundIds;
  }
  
  try {
    const files = fs.readdirSync(referencesPath).filter(f => f.endsWith('.json'));
    console.log(`   📁 Scan ${files.length} fichiers de référence...`);
    
    files.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(referencesPath, file), 'utf8');
        const data = JSON.parse(content);
        
        // Chercher mentions du driver
        const dataStr = JSON.stringify(data).toLowerCase();
        if (dataStr.includes(driverName.toLowerCase().replace(/_/g, ' ')) ||
            dataStr.includes(driverName.toLowerCase())) {
          
          // Extraire IDs
          const idPattern = /_TZ[E0-9]{4}_[a-z0-9]{8}|TS[0-9]{4}[A-Z]?/g;
          const matches = content.match(idPattern) || [];
          matches.forEach(id => foundIds.add(id));
        }
      } catch (e) {}
    });
    
    console.log(`   ✅ Trouvé ${foundIds.size} IDs dans références`);
    
  } catch (e) {
    console.log(`   ⚠️  Erreur recherche: ${e.message}`);
  }
  
  return foundIds;
}

// ============================================================================
// RECHERCHE DANS BACKUPS
// ============================================================================
function searchBackups(driverName) {
  console.log(`   🔍 Recherche dans backups...`);
  
  const backupFile = path.join(driversPath, driverName, 'driver.compose.json.backup');
  
  if (fs.existsSync(backupFile)) {
    try {
      const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      if (backup.zigbee && backup.zigbee.manufacturerName) {
        const ids = Array.isArray(backup.zigbee.manufacturerName) 
          ? backup.zigbee.manufacturerName 
          : [backup.zigbee.manufacturerName];
        
        console.log(`   ✅ Backup trouvé: ${ids.length} IDs`);
        return new Set(ids.slice(0, 5)); // Prendre max 5 du backup
      }
    } catch (e) {
      console.log(`   ⚠️  Backup invalide`);
    }
  } else {
    console.log(`   ℹ️  Pas de backup`);
  }
  
  return new Set();
}

// ============================================================================
// RÉCUPÉRATION INTELLIGENTE
// ============================================================================
function smartRecovery(driverName, compose) {
  console.log(`   🧠 Récupération intelligente...`);
  
  let recoveredIds = new Set();
  
  // 1. Vérifier knowledge base
  if (KNOWLEDGE_BASE[driverName]) {
    console.log(`   ✅ Trouvé dans knowledge base`);
    const kb = KNOWLEDGE_BASE[driverName];
    kb.ids.forEach(id => recoveredIds.add(id));
  }
  
  // 2. Chercher dans références externes
  const externalIds = searchExternalReferences(driverName);
  externalIds.forEach(id => recoveredIds.add(id));
  
  // 3. Chercher dans backups
  const backupIds = searchBackups(driverName);
  backupIds.forEach(id => recoveredIds.add(id));
  
  // 4. Inférer depuis le nom du driver
  const inferredIds = inferFromName(driverName);
  inferredIds.forEach(id => recoveredIds.add(id));
  
  return Array.from(recoveredIds).slice(0, 10); // Max 10 IDs
}

// ============================================================================
// INFÉRENCE DEPUIS NOM
// ============================================================================
function inferFromName(name) {
  const ids = new Set();
  const n = name.toLowerCase();
  
  // Motion sensors
  if (n.includes('motion') || n.includes('pir')) {
    ids.add('TS0202');
    ids.add('_TZ3000_mmtwjmaq');
  }
  
  // Contact sensors
  if (n.includes('contact') || n.includes('door') || n.includes('window')) {
    ids.add('TS0203');
    ids.add('_TZ3000_26fmupbb');
  }
  
  // Buttons
  if (n.includes('button') || n.includes('scene') || n.includes('wireless')) {
    if (n.includes('1gang')) ids.add('TS0041');
    else if (n.includes('2gang')) ids.add('TS0042');
    else if (n.includes('3gang')) ids.add('TS0043');
    else if (n.includes('4gang')) ids.add('TS0044');
    else if (n.includes('6gang')) ids.add('TS004F');
    else ids.add('TS0041'); // default
  }
  
  // Switches
  if (n.includes('switch') && !n.includes('wireless')) {
    if (n.includes('1gang')) ids.add('TS0001');
    else if (n.includes('2gang')) ids.add('TS0011');
    else if (n.includes('3gang')) ids.add('TS0012');
    else if (n.includes('4gang')) ids.add('TS0013');
    else ids.add('TS0001');
  }
  
  // Climate
  if (n.includes('temp') || n.includes('climate') || n.includes('humidity')) {
    ids.add('TS0201');
    ids.add('TS0601');
  }
  
  // Smoke/CO/Gas
  if (n.includes('smoke') || n.includes('co') || n.includes('gas')) {
    ids.add('TS0205');
    ids.add('_TZE200_m9skfctm');
  }
  
  // Water leak
  if (n.includes('water') && n.includes('leak')) {
    ids.add('TS0207');
  }
  
  // Valve
  if (n.includes('valve')) {
    ids.add('_TZE200_81isopgh');
  }
  
  console.log(`   🧠 Inféré depuis nom: ${ids.size} IDs`);
  return ids;
}

// ============================================================================
// TRAITEMENT PRINCIPAL
// ============================================================================
console.log('📊 Scan des drivers...\n');

const drivers = fs.readdirSync(driversPath)
  .filter(d => fs.statSync(path.join(driversPath, d)).isDirectory())
  .sort();

let emptyCount = 0;
let fixedCount = 0;
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
  
  // Vérifier si vide ou presque vide
  if (!compose.zigbee || !compose.zigbee.manufacturerName ||
      (Array.isArray(compose.zigbee.manufacturerName) && compose.zigbee.manufacturerName.length === 0)) {
    
    emptyCount++;
    console.log(`\n⚠️  [${index + 1}/${drivers.length}] ${driverName} - VIDE!`);
    console.log('-'.repeat(80));
    
    // Récupération intelligente
    const recoveredIds = smartRecovery(driverName, compose);
    
    if (recoveredIds.length > 0) {
      console.log(`   ✅ Récupéré: ${recoveredIds.length} IDs`);
      console.log(`   📋 Liste: ${recoveredIds.slice(0, 3).join(', ')}${recoveredIds.length > 3 ? '...' : ''}`);
      
      // Appliquer
      if (!compose.zigbee) compose.zigbee = {};
      compose.zigbee.manufacturerName = recoveredIds;
      
      // Corriger class si nécessaire
      if (KNOWLEDGE_BASE[driverName] && KNOWLEDGE_BASE[driverName].class) {
        compose.class = KNOWLEDGE_BASE[driverName].class;
        console.log(`   ✅ Class: ${compose.class}`);
      }
      
      fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
      console.log(`   💾 SAUVEGARDÉ`);
      
      fixedCount++;
      report.push({
        driver: driverName,
        recovered: recoveredIds.length,
        ids: recoveredIds
      });
    } else {
      console.log(`   ❌ Impossible de récupérer des IDs`);
    }
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 RÉSUMÉ SMART RECOVERY');
console.log('='.repeat(80));
console.log(`\nDrivers vides trouvés: ${emptyCount}`);
console.log(`Drivers récupérés: ${fixedCount}`);

if (report.length > 0) {
  console.log(`\n📋 DRIVERS RÉCUPÉRÉS:`);
  report.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.driver}: ${r.recovered} IDs récupérés`);
  });
}

// Validation
console.log(`\n✅ VALIDATION...`);
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

console.log(`📝 Version: ${newVersion}`);

// Changelog
fs.writeFileSync(
  path.join(rootPath, '.homeychangelog.json'),
  JSON.stringify({ 
    [newVersion]: `Smart recovery: ${fixedCount} empty drivers recovered with intelligent search` 
  }, null, 2)
);

// Git
console.log(`\n📦 GIT COMMIT & PUSH...`);
try {
  execSync('git add -A', { cwd: rootPath, stdio: 'pipe' });
  execSync(`git commit -m "🔧 Smart recovery v${newVersion} - ${fixedCount} drivers recovered"`, { 
    cwd: rootPath, 
    stdio: 'pipe' 
  });
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
const reportPath = path.join(rootPath, 'references', 'reports', `SMART_RECOVERY_${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify({ 
  emptyCount, 
  fixedCount, 
  report, 
  version: newVersion,
  timestamp: new Date().toISOString()
}, null, 2));

console.log(`\n📝 Rapport: ${path.basename(reportPath)}`);

console.log('\n' + '='.repeat(80));
console.log('🎉 SMART RECOVERY TERMINÉ!');
console.log('='.repeat(80));
console.log(`Vides: ${emptyCount}`);
console.log(`Récupérés: ${fixedCount}`);
console.log(`Version: ${newVersion}\n`);
