#!/usr/bin/env node

/**
 * FIX_ALL_DRIVERS_ISSUES.js
 * Analyse et corrige TOUS les problèmes des drivers
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   🔧 ANALYSE ET CORRECTION COMPLÈTE DES DRIVERS       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const issues = {
  missingEndpoints: [],
  wrongClusterFormat: [],
  missingBatteries: [],
  invalidCapabilities: [],
  missingImages: [],
  wrongDriverClass: [],
  duplicateManufacturers: [],
  missingBindings: [],
  wrongSettings: []
};

let totalFixed = 0;
let totalIssues = 0;

// Clusters mapping
const CLUSTER_MAP = {
  'basic': 0,
  'powerConfiguration': 1,
  'identify': 3,
  'groups': 4,
  'scenes': 5,
  'onOff': 6,
  'levelControl': 8,
  'windowCovering': 258,
  'colorControl': 768,
  'illuminanceMeasurement': 1024,
  'temperatureMeasurement': 1026,
  'relativeHumidity': 1029,
  'occupancySensing': 1030,
  'iasZone': 1280,
  'iasWd': 1281,
  'ssIasZone': 1282,
  'manuSpecificTuya': 61184,
  'manuSpecificTuyaSwitch': 57344,
  'metering': 1794,
  'electricalMeasurement': 2820
};

// Valider et corriger un driver
function validateAndFixDriver(driverPath, driverName) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return { fixed: false, reason: 'No driver.compose.json' };
  }
  
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch (error) {
    return { fixed: false, reason: 'Invalid JSON' };
  }
  
  let modified = false;
  const driverIssues = [];
  
  // 1. Vérifier endpoints
  if (compose.zigbee && !compose.zigbee.endpoints) {
    driverIssues.push('Missing endpoints');
    issues.missingEndpoints.push(driverName);
    
    // Ajouter endpoints basiques
    compose.zigbee.endpoints = {
      "1": {
        "clusters": [0, 3]
      }
    };
    modified = true;
  }
  
  // 2. Vérifier format des clusters
  if (compose.zigbee && compose.zigbee.endpoints) {
    Object.keys(compose.zigbee.endpoints).forEach(ep => {
      const endpoint = compose.zigbee.endpoints[ep];
      if (endpoint.clusters) {
        const hasStringClusters = endpoint.clusters.some(c => typeof c === 'string');
        if (hasStringClusters) {
          driverIssues.push('Wrong cluster format (string)');
          issues.wrongClusterFormat.push(driverName);
          
          // Convertir en numérique
          endpoint.clusters = endpoint.clusters.map(c => {
            if (typeof c === 'string') {
              return CLUSTER_MAP[c] || 0;
            }
            return c;
          });
          modified = true;
        }
      }
    });
  }
  
  // 3. Vérifier batteries pour devices battery
  const hasBatteryCapability = compose.capabilities && 
    compose.capabilities.includes('measure_battery');
  const hasBatteryInName = driverName.toLowerCase().includes('battery') ||
    driverName.toLowerCase().includes('cr2032') ||
    driverName.toLowerCase().includes('cr2450');
  
  if ((hasBatteryCapability || hasBatteryInName) && !compose.energy) {
    driverIssues.push('Missing energy.batteries');
    issues.missingBatteries.push(driverName);
    
    // Déterminer type de batterie
    let batteries = ['AAA'];
    if (driverName.includes('cr2032')) batteries = ['CR2032'];
    else if (driverName.includes('cr2450')) batteries = ['CR2450'];
    else if (driverName.includes('battery')) batteries = ['AAA', 'CR2032'];
    
    compose.energy = { batteries };
    modified = true;
  }
  
  // 4. Vérifier driver class
  if (compose.class === 'switch') {
    driverIssues.push('Invalid class: switch');
    issues.wrongDriverClass.push(driverName);
    
    // Déterminer la bonne classe
    if (driverName.includes('sensor') || driverName.includes('detector')) {
      compose.class = 'sensor';
    } else if (driverName.includes('light') || driverName.includes('bulb')) {
      compose.class = 'light';
    } else if (driverName.includes('plug') || driverName.includes('socket')) {
      compose.class = 'socket';
    } else if (driverName.includes('button') || driverName.includes('remote')) {
      compose.class = 'button';
    } else {
      compose.class = 'socket'; // Fallback
    }
    modified = true;
  }
  
  // 5. Vérifier images
  const assetsPath = path.join(driverPath, 'assets');
  const requiredImages = ['small.png', 'large.png', 'xlarge.png'];
  const missingImages = requiredImages.filter(img => 
    !fs.existsSync(path.join(assetsPath, img))
  );
  
  if (missingImages.length > 0) {
    driverIssues.push(`Missing images: ${missingImages.join(', ')}`);
    issues.missingImages.push({ driver: driverName, missing: missingImages });
  }
  
  // 6. Vérifier settings invalides
  if (compose.settings) {
    const invalidSettings = compose.settings.filter(s => 
      s.id && (s.id.startsWith('energy_') || s.id.startsWith('homey_') || s.id.startsWith('app_'))
    );
    
    if (invalidSettings.length > 0) {
      driverIssues.push('Invalid setting IDs');
      issues.wrongSettings.push({ driver: driverName, settings: invalidSettings.map(s => s.id) });
      
      // Renommer settings
      invalidSettings.forEach(setting => {
        const oldId = setting.id;
        setting.id = oldId.replace(/^(energy_|homey_|app_)/, 'device_');
      });
      modified = true;
    }
  }
  
  // 7. Vérifier bindings manquants pour battery devices
  if (hasBatteryCapability && compose.zigbee && compose.zigbee.endpoints) {
    Object.keys(compose.zigbee.endpoints).forEach(ep => {
      const endpoint = compose.zigbee.endpoints[ep];
      if (!endpoint.bindings || !endpoint.bindings.includes(1)) {
        driverIssues.push('Missing battery binding');
        issues.missingBindings.push(driverName);
        
        if (!endpoint.bindings) endpoint.bindings = [];
        if (!endpoint.bindings.includes(1)) endpoint.bindings.push(1);
        modified = true;
      }
    });
  }
  
  // Sauvegarder si modifié
  if (modified) {
    try {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      totalFixed++;
      return { fixed: true, issues: driverIssues };
    } catch (error) {
      return { fixed: false, reason: error.message };
    }
  }
  
  return { fixed: false, issues: driverIssues };
}

// Main
const driversDir = 'drivers';
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

console.log(`📦 ${drivers.length} drivers à analyser\n`);
console.log('🔍 Analyse en cours...\n');

drivers.forEach(driver => {
  const driverPath = path.join(driversDir, driver);
  const result = validateAndFixDriver(driverPath, driver);
  
  if (result.fixed) {
    console.log(`   ✅ ${driver} (${result.issues.length} corrections)`);
  } else if (result.issues && result.issues.length > 0) {
    console.log(`   ⚠️  ${driver} (${result.issues.length} warnings)`);
    totalIssues += result.issues.length;
  }
});

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                  RÉSUMÉ DES CORRECTIONS                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log(`   Total drivers analysés:    ${drivers.length}`);
console.log(`   ✅ Drivers corrigés:       ${totalFixed}`);
console.log(`   ⚠️  Warnings restants:      ${totalIssues}`);
console.log('');

// Détails par type de problème
console.log('📊 PROBLÈMES PAR CATÉGORIE:\n');

if (issues.missingEndpoints.length > 0) {
  console.log(`   🔧 Endpoints manquants: ${issues.missingEndpoints.length}`);
  console.log(`      → Corrigés automatiquement`);
}

if (issues.wrongClusterFormat.length > 0) {
  console.log(`   🔧 Format clusters incorrect: ${issues.wrongClusterFormat.length}`);
  console.log(`      → Convertis string → number`);
}

if (issues.missingBatteries.length > 0) {
  console.log(`   🔧 energy.batteries manquant: ${issues.missingBatteries.length}`);
  console.log(`      → Ajoutés automatiquement`);
}

if (issues.wrongDriverClass.length > 0) {
  console.log(`   🔧 Classe driver invalide: ${issues.wrongDriverClass.length}`);
  console.log(`      → Corrigées: switch → sensor/socket/light`);
}

if (issues.missingImages.length > 0) {
  console.log(`   ⚠️  Images manquantes: ${issues.missingImages.length} drivers`);
  console.log(`      → Exécuter: node scripts/generation/GENERATE_UNIQUE_DRIVER_IMAGES.js`);
}

if (issues.missingBindings.length > 0) {
  console.log(`   🔧 Bindings battery manquants: ${issues.missingBindings.length}`);
  console.log(`      → Ajoutés automatiquement`);
}

if (issues.wrongSettings.length > 0) {
  console.log(`   🔧 Settings IDs invalides: ${issues.wrongSettings.length}`);
  console.log(`      → Renommés: energy_/homey_/app_ → device_`);
}

console.log('');

// Sauvegarder rapport
const report = {
  date: new Date().toISOString(),
  totalDrivers: drivers.length,
  totalFixed: totalFixed,
  totalIssues: totalIssues,
  issues: issues
};

fs.writeFileSync(
  'reports/DRIVERS_FIX_REPORT.json',
  JSON.stringify(report, null, 2)
);

console.log('💾 Rapport sauvegardé: reports/DRIVERS_FIX_REPORT.json\n');

if (totalFixed > 0) {
  console.log('✅ Corrections appliquées avec succès!');
  console.log('⚡ Prochaine étape: homey app validate --level publish\n');
}
