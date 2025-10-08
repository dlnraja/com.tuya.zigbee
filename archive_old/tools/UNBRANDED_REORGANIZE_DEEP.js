#!/usr/bin/env node
// ============================================================================
// UNBRANDED REORGANIZE DEEP - Réorganisation + Enrichissement Intelligent
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');

console.log('🔄 UNBRANDED REORGANIZE DEEP - Vision Complète');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

// BASE DE DONNÉES COMPLÈTE PAR FONCTION
const UNBRANDED_DATABASE = {
  // SWITCHES - Par nombre de gangs et alimentation
  'switch_1gang_ac': {
    ids: ['TS0001', '_TZ3000_qzjcsmar'],
    class: 'socket',
    powerType: 'AC',
    gangCount: 1,
    endpoints: { '1': { clusters: [0, 3, 4, 5, 6] } }
  },
  'switch_2gang_ac': {
    ids: ['TS0011', '_TZ3000_ji4araar'],
    class: 'socket',
    powerType: 'AC',
    gangCount: 2,
    endpoints: { '1': { clusters: [0, 3, 4, 5, 6] }, '2': { clusters: [0, 3, 4, 5, 6] } }
  },
  'switch_3gang_ac': {
    ids: ['TS0012', '_TZ3000_uim07oem'],
    class: 'socket',
    powerType: 'AC',
    gangCount: 3,
    endpoints: { 
      '1': { clusters: [0, 3, 4, 5, 6] }, 
      '2': { clusters: [0, 3, 4, 5, 6] },
      '3': { clusters: [0, 3, 4, 5, 6] }
    }
  },
  'switch_4gang_ac': {
    ids: ['TS0013', '_TZ3000_fvh3pjaz'],
    class: 'socket',
    powerType: 'AC',
    gangCount: 4,
    endpoints: { 
      '1': { clusters: [0, 3, 4, 5, 6] }, 
      '2': { clusters: [0, 3, 4, 5, 6] },
      '3': { clusters: [0, 3, 4, 5, 6] },
      '4': { clusters: [0, 3, 4, 5, 6] }
    }
  },
  
  // SWITCHES BATTERY
  'switch_1gang_battery': {
    ids: ['TS0001', '_TZ3000_qzjcsmar'],
    class: 'socket',
    powerType: 'Battery',
    gangCount: 1,
    batteries: ['CR2032', 'AA']
  },
  'switch_2gang_battery': {
    ids: ['TS0011', '_TZ3000_ji4araar'],
    class: 'socket',
    powerType: 'Battery',
    gangCount: 2,
    batteries: ['CR2032', 'AA']
  },
  
  // BUTTONS (WIRELESS SWITCHES) - Par nombre de boutons
  'button_1gang_battery': {
    ids: ['TS0041', '_TZ3000_tk3s5tyg'],
    class: 'button',
    powerType: 'Battery',
    gangCount: 1,
    batteries: ['CR2032']
  },
  'button_2gang_battery': {
    ids: ['TS0042', '_TZ3000_vp6clf9d'],
    class: 'button',
    powerType: 'Battery',
    gangCount: 2,
    batteries: ['CR2032']
  },
  'button_3gang_battery': {
    ids: ['TS0043', '_TZ3000_xabckq1v'],
    class: 'button',
    powerType: 'Battery',
    gangCount: 3,
    batteries: ['CR2032']
  },
  'button_4gang_battery': {
    ids: ['TS0044', '_TZ3000_vp6clf9d'],
    class: 'button',
    powerType: 'Battery',
    gangCount: 4,
    batteries: ['CR2032']
  },
  'button_6gang_battery': {
    ids: ['TS004F', '_TZ3000_xabckq1v'],
    class: 'button',
    powerType: 'Battery',
    gangCount: 6,
    batteries: ['CR2032']
  },
  
  // DIMMERS
  'dimmer_1gang_ac': {
    ids: ['TS0001', '_TZ3000_qzjcsmar'],
    class: 'socket',
    powerType: 'AC',
    gangCount: 1,
    capabilities: ['onoff', 'dim']
  },
  'dimmer_2gang_ac': {
    ids: ['TS0011'],
    class: 'socket',
    powerType: 'AC',
    gangCount: 2,
    capabilities: ['onoff', 'dim']
  },
  'dimmer_3gang_ac': {
    ids: ['TS0012'],
    class: 'socket',
    powerType: 'AC',
    gangCount: 3,
    capabilities: ['onoff', 'dim']
  },
  
  // MOTION SENSORS - Par type
  'motion_sensor_pir_battery': {
    ids: ['TS0202', '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb'],
    class: 'sensor',
    powerType: 'Battery',
    sensorType: 'PIR',
    batteries: ['CR2032', 'AA']
  },
  'motion_sensor_radar_ac': {
    ids: ['_TZE200_ar0slwnd', '_TZE200_sfiy5tfs'],
    class: 'sensor',
    powerType: 'AC',
    sensorType: 'Radar'
  },
  'motion_sensor_mmwave_ac': {
    ids: ['_TZE200_ztc6ggyl', '_TZE200_3towulqd'],
    class: 'sensor',
    powerType: 'AC',
    sensorType: 'mmWave'
  },
  
  // CONTACT SENSORS
  'contact_sensor_battery': {
    ids: ['TS0203', '_TZ3000_26fmupbb', '_TZ3000_n2egfsli'],
    class: 'sensor',
    powerType: 'Battery',
    batteries: ['CR2032']
  },
  
  // PLUGS - Par fonction
  'plug_basic_ac': {
    ids: ['TS011F', '_TZ3000_g5xawfcq'],
    class: 'socket',
    powerType: 'AC',
    capabilities: ['onoff']
  },
  'plug_energy_monitoring_ac': {
    ids: ['TS011F', '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw'],
    class: 'socket',
    powerType: 'AC',
    capabilities: ['onoff', 'measure_power', 'meter_power']
  },
  
  // CLIMATE SENSORS
  'climate_sensor_temp_humidity_battery': {
    ids: ['TS0201', '_TZ3000_fllyghyj'],
    class: 'sensor',
    powerType: 'Battery',
    batteries: ['CR2032', 'AA'],
    capabilities: ['measure_temperature', 'measure_humidity']
  },
  'climate_sensor_advanced_battery': {
    ids: ['TS0601', '_TZE200_cwbvmsar', '_TZE200_bjawzodf'],
    class: 'sensor',
    powerType: 'Battery',
    batteries: ['CR2032', 'AA']
  },
  
  // LIGHTING
  'light_bulb_rgb': {
    ids: ['TS0505', 'TS0505B', '_TZ3000_odygigth'],
    class: 'light',
    powerType: 'AC',
    lightType: 'RGB'
  },
  'light_bulb_white': {
    ids: ['TS0502', 'TS0502B', '_TZ3000_dbou1ap4'],
    class: 'light',
    powerType: 'AC',
    lightType: 'White'
  },
  'light_strip_rgb': {
    ids: ['TS0505', 'TS0505B'],
    class: 'light',
    powerType: 'AC',
    lightType: 'RGB_Strip'
  },
  
  // SAFETY SENSORS
  'smoke_detector_battery': {
    ids: ['TS0205', '_TZE200_m9skfctm'],
    class: 'sensor',
    powerType: 'Battery',
    batteries: ['CR2032', 'AA']
  },
  'co_detector_battery': {
    ids: ['TS0205', '_TZ3000_26fmupbb'],
    class: 'sensor',
    powerType: 'Battery',
    batteries: ['CR2032', 'AA']
  },
  'gas_detector_ac': {
    ids: ['TS0205', '_TZE200_m9skfctm'],
    class: 'sensor',
    powerType: 'AC'
  },
  'water_leak_sensor_battery': {
    ids: ['TS0207', '_TZ3000_kyb656no'],
    class: 'sensor',
    powerType: 'Battery',
    batteries: ['CR2032']
  },
  
  // CURTAINS/BLINDS
  'curtain_motor_ac': {
    ids: ['TS130F', '_TZE200_fctwhugx', '_TZE200_cowvfni3'],
    class: 'windowcoverings',
    powerType: 'AC'
  },
  'blind_motor_battery': {
    ids: ['TS130F', '_TZE200_zpzndjez'],
    class: 'windowcoverings',
    powerType: 'Battery',
    batteries: ['AA']
  },
  
  // VALVES
  'water_valve_ac': {
    ids: ['_TZE200_81isopgh', 'TS0601'],
    class: 'other',
    powerType: 'AC'
  },
  'gas_valve_ac': {
    ids: ['_TZE200_81isopgh'],
    class: 'other',
    powerType: 'AC'
  },
  
  // SPECIAL
  'sos_button_battery': {
    ids: ['TS0215A', '_TZ3000_jl1lq5cd', '_TZ3000_eo3dttwe'],
    class: 'button',
    powerType: 'Battery',
    batteries: ['CR2032']
  },
  'siren_ac': {
    ids: ['TS0601', '_TZE200_t1blo2bj'],
    class: 'sensor',
    powerType: 'AC'
  },
  'siren_battery': {
    ids: ['TS0601'],
    class: 'sensor',
    powerType: 'Battery',
    batteries: ['AA']
  }
};

// ============================================================================
// ANALYSE PROFONDE D'UN DRIVER
// ============================================================================
function deepAnalyzeDriver(driverName, compose) {
  console.log(`\n🔍 ANALYSE PROFONDE: ${driverName}`);
  console.log('-'.repeat(80));
  
  const analysis = {
    currentName: driverName,
    detectedType: null,
    powerType: 'Unknown',
    gangCount: 0,
    hasEndpoints: false,
    hasBatteries: false,
    capabilities: compose.capabilities || [],
    class: compose.class,
    recommendedName: null,
    shouldReorganize: false
  };
  
  // 1. Détecter type d'alimentation
  console.log('  📊 Type alimentation:');
  if (compose.energy && compose.energy.batteries) {
    analysis.powerType = 'Battery';
    analysis.hasBatteries = true;
    console.log(`     ✅ Battery (${compose.energy.batteries.join(', ')})`);
  } else if (driverName.toLowerCase().includes('battery') || 
             driverName.toLowerCase().includes('cr2032') ||
             driverName.toLowerCase().includes('aa')) {
    analysis.powerType = 'Battery';
    console.log('     ⚠️  Battery (inféré du nom)');
  } else if (driverName.toLowerCase().includes('ac') ||
             driverName.toLowerCase().includes('plug') ||
             (!driverName.toLowerCase().includes('battery') && 
              !driverName.toLowerCase().includes('wireless'))) {
    analysis.powerType = 'AC';
    console.log('     ✅ AC (inféré)');
  }
  
  // 2. Détecter nombre de gangs/boutons
  console.log('  🔢 Nombre de gangs/boutons:');
  const gangMatch = driverName.match(/(\d)gang/);
  if (gangMatch) {
    analysis.gangCount = parseInt(gangMatch[1]);
    console.log(`     ✅ ${analysis.gangCount} gang(s)`);
  } else if (compose.zigbee && compose.zigbee.endpoints) {
    analysis.gangCount = Object.keys(compose.zigbee.endpoints).length;
    analysis.hasEndpoints = true;
    console.log(`     ✅ ${analysis.gangCount} endpoint(s) détecté(s)`);
  }
  
  // 3. Détecter type de device
  console.log('  🏷️  Type de device:');
  const name = driverName.toLowerCase();
  
  if (name.includes('switch') && !name.includes('wireless')) {
    analysis.detectedType = 'switch';
    console.log('     ✅ Switch (interrupteur mural)');
  } else if (name.includes('wireless') || name.includes('button') || name.includes('scene') || name.includes('remote')) {
    analysis.detectedType = 'button';
    console.log('     ✅ Button (bouton sans fil)');
  } else if (name.includes('dimmer')) {
    analysis.detectedType = 'dimmer';
    console.log('     ✅ Dimmer (variateur)');
  } else if (name.includes('motion') || name.includes('pir') || name.includes('radar') || name.includes('presence')) {
    analysis.detectedType = 'motion';
    console.log('     ✅ Motion Sensor');
  } else if (name.includes('contact') || name.includes('door') || name.includes('window')) {
    analysis.detectedType = 'contact';
    console.log('     ✅ Contact Sensor');
  } else if (name.includes('plug') || name.includes('socket')) {
    analysis.detectedType = 'plug';
    console.log('     ✅ Plug (prise)');
  } else if (name.includes('light') || name.includes('bulb') || name.includes('led')) {
    analysis.detectedType = 'light';
    console.log('     ✅ Light (éclairage)');
  } else if (name.includes('curtain') || name.includes('blind') || name.includes('motor')) {
    analysis.detectedType = 'curtain';
    console.log('     ✅ Curtain/Blind');
  } else if (name.includes('smoke') || name.includes('co') || name.includes('gas') || name.includes('leak')) {
    analysis.detectedType = 'safety';
    console.log('     ✅ Safety Sensor');
  } else if (name.includes('temp') || name.includes('humidity') || name.includes('climate')) {
    analysis.detectedType = 'climate';
    console.log('     ✅ Climate Sensor');
  } else if (name.includes('valve')) {
    analysis.detectedType = 'valve';
    console.log('     ✅ Valve');
  } else if (name.includes('sos')) {
    analysis.detectedType = 'sos';
    console.log('     ✅ SOS Button');
  } else if (name.includes('siren')) {
    analysis.detectedType = 'siren';
    console.log('     ✅ Siren');
  }
  
  // 4. Recommander nom UNBRANDED
  console.log('  📝 Nom recommandé:');
  if (analysis.detectedType && analysis.gangCount > 0) {
    analysis.recommendedName = `${analysis.detectedType}_${analysis.gangCount}gang_${analysis.powerType.toLowerCase()}`;
    console.log(`     🎯 ${analysis.recommendedName}`);
    
    if (analysis.recommendedName !== driverName) {
      analysis.shouldReorganize = true;
      console.log(`     ⚠️  Réorganisation recommandée!`);
    }
  } else if (analysis.detectedType) {
    const suffix = analysis.powerType !== 'Unknown' ? `_${analysis.powerType.toLowerCase()}` : '';
    analysis.recommendedName = `${analysis.detectedType}${suffix}`;
    console.log(`     🎯 ${analysis.recommendedName}`);
    
    if (analysis.recommendedName !== driverName) {
      analysis.shouldReorganize = true;
      console.log(`     ⚠️  Réorganisation recommandée!`);
    }
  }
  
  return analysis;
}

// ============================================================================
// ENRICHISSEMENT INTELLIGENT
// ============================================================================
function intelligentEnrichment(driverName, compose, analysis) {
  console.log(`\n💡 ENRICHISSEMENT INTELLIGENT`);
  
  let changed = false;
  const changes = [];
  
  // Chercher dans base UNBRANDED
  let dbEntry = null;
  
  // Recherche exacte
  if (UNBRANDED_DATABASE[analysis.recommendedName || driverName]) {
    dbEntry = UNBRANDED_DATABASE[analysis.recommendedName || driverName];
    console.log(`   ✅ Trouvé dans base: ${analysis.recommendedName || driverName}`);
  }
  
  // Recherche similaire
  if (!dbEntry) {
    for (const [key, value] of Object.entries(UNBRANDED_DATABASE)) {
      if (key.includes(analysis.detectedType) && 
          key.includes(analysis.powerType.toLowerCase())) {
        if (analysis.gangCount > 0) {
          if (key.includes(`${analysis.gangCount}gang`)) {
            dbEntry = value;
            console.log(`   ✅ Trouvé similaire: ${key}`);
            break;
          }
        } else {
          dbEntry = value;
          console.log(`   ✅ Trouvé similaire: ${key}`);
          break;
        }
      }
    }
  }
  
  if (dbEntry) {
    // 1. Enrichir manufacturer IDs
    if (compose.zigbee && compose.zigbee.manufacturerName) {
      let currentIds = Array.isArray(compose.zigbee.manufacturerName) 
        ? compose.zigbee.manufacturerName 
        : [compose.zigbee.manufacturerName];
      
      const before = currentIds.length;
      const newIds = [...new Set([...dbEntry.ids, ...currentIds])].slice(0, 7);
      
      if (JSON.stringify(newIds.sort()) !== JSON.stringify(currentIds.sort())) {
        compose.zigbee.manufacturerName = newIds;
        changes.push(`IDs: ${before} → ${newIds.length}`);
        changed = true;
      }
    } else {
      if (!compose.zigbee) compose.zigbee = {};
      compose.zigbee.manufacturerName = dbEntry.ids;
      changes.push(`IDs ajoutés: ${dbEntry.ids.length}`);
      changed = true;
    }
    
    // 2. Corriger class
    if (dbEntry.class && compose.class !== dbEntry.class) {
      compose.class = dbEntry.class;
      changes.push(`class: ${dbEntry.class}`);
      changed = true;
    }
    
    // 3. Ajouter batteries si nécessaire
    if (dbEntry.batteries && analysis.powerType === 'Battery') {
      if (!compose.energy) compose.energy = {};
      if (!compose.energy.batteries || compose.energy.batteries.length === 0) {
        compose.energy.batteries = dbEntry.batteries;
        changes.push(`batteries: ${dbEntry.batteries.join(', ')}`);
        changed = true;
      }
    }
    
    // 4. Ajouter/corriger endpoints
    if (dbEntry.endpoints && analysis.gangCount > 1) {
      if (!compose.zigbee.endpoints) {
        compose.zigbee.endpoints = dbEntry.endpoints;
        changes.push(`endpoints: ${Object.keys(dbEntry.endpoints).length} ajoutés`);
        changed = true;
      }
    }
    
    // 5. Vérifier capabilities
    if (dbEntry.capabilities) {
      const missingCaps = dbEntry.capabilities.filter(cap => 
        !compose.capabilities || !compose.capabilities.includes(cap)
      );
      if (missingCaps.length > 0) {
        changes.push(`Capabilities manquantes: ${missingCaps.join(', ')}`);
      }
    }
  }
  
  if (changes.length > 0) {
    console.log(`   ✅ Changements: ${changes.join(', ')}`);
  } else {
    console.log(`   ℹ️  Aucun changement nécessaire`);
  }
  
  return { changed, changes };
}

// ============================================================================
// TRAITEMENT PRINCIPAL
// ============================================================================
console.log('📊 SCAN PROFOND DE TOUS LES DRIVERS\n');

const drivers = fs.readdirSync(driversPath)
  .filter(d => fs.statSync(path.join(driversPath, d)).isDirectory())
  .sort();

console.log(`Total: ${drivers.length} drivers\n`);

const report = {
  analyzed: 0,
  enriched: 0,
  toReorganize: [],
  changes: []
};

drivers.forEach((driverName, index) => {
  const composeFile = path.join(driversPath, driverName, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) return;
  
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  } catch (e) {
    console.log(`\n❌ [${index + 1}/${drivers.length}] ${driverName}: JSON invalide`);
    return;
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${index + 1}/${drivers.length}] 📦 ${driverName}`);
  
  // Analyse profonde
  const analysis = deepAnalyzeDriver(driverName, compose);
  report.analyzed++;
  
  // Enrichissement intelligent
  const enrichment = intelligentEnrichment(driverName, compose, analysis);
  
  if (enrichment.changed) {
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
    console.log(`   💾 SAUVEGARDÉ`);
    report.enriched++;
    report.changes.push({
      driver: driverName,
      changes: enrichment.changes
    });
  }
  
  if (analysis.shouldReorganize) {
    report.toReorganize.push({
      current: driverName,
      recommended: analysis.recommendedName,
      type: analysis.detectedType,
      power: analysis.powerType,
      gangs: analysis.gangCount
    });
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 RÉSUMÉ FINAL');
console.log('='.repeat(80));

console.log(`\n✅ Analysés: ${report.analyzed}`);
console.log(`✅ Enrichis: ${report.enriched}`);
console.log(`⚠️  À réorganiser: ${report.toReorganize.length}`);

if (report.toReorganize.length > 0) {
  console.log(`\n📋 RÉORGANISATIONS RECOMMANDÉES (vision UNBRANDED):`);
  report.toReorganize.slice(0, 20).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.current}`);
    console.log(`      → ${item.recommended}`);
    console.log(`      (Type: ${item.type}, Power: ${item.power}, Gangs: ${item.gangs || 'N/A'})`);
  });
  
  if (report.toReorganize.length > 20) {
    console.log(`   ... et ${report.toReorganize.length - 20} autres`);
  }
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
    [newVersion]: `UNBRANDED reorganization: ${report.enriched} enriched, ${report.toReorganize.length} to reorganize` 
  }, null, 2)
);

// Git
console.log(`\n📦 GIT COMMIT & PUSH...`);
try {
  execSync('git add -A', { cwd: rootPath, stdio: 'pipe' });
  execSync(`git commit -m "🔄 UNBRANDED deep reorganize v${newVersion} - ${report.enriched} enriched"`, { 
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
const reportPath = path.join(rootPath, 'references', 'reports', `UNBRANDED_DEEP_${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n📝 Rapport: ${path.basename(reportPath)}`);

console.log('\n' + '='.repeat(80));
console.log('🎉 UNBRANDED REORGANIZE DEEP TERMINÉ!');
console.log('='.repeat(80));
console.log(`Analysés: ${report.analyzed}`);
console.log(`Enrichis: ${report.enriched}`);
console.log(`Version: ${newVersion}\n`);
