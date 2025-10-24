#!/usr/bin/env node
'use strict';

/**
 * APPLY IAS ZONE ENROLLER INTELLIGEMMENT
 * 
 * Détecte automatiquement les drivers qui nécessitent IASZoneEnroller:
 * - alarm_motion → Motion sensors (zoneType: 13)
 * - alarm_generic → SOS/Emergency (zoneType: 21)
 * - alarm_contact → Door/Window sensors (zoneType: 21)
 * - alarm_water → Water leak detectors (zoneType: 10)
 * 
 * Applique le code nécessaire automatiquement.
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

const ZONE_TYPES = {
  'alarm_motion': { zoneType: 13, name: 'Motion sensor', resetTimeout: 60000 },
  'alarm_generic': { zoneType: 21, name: 'Emergency button', resetTimeout: 0 },
  'alarm_contact': { zoneType: 21, name: 'Contact sensor', resetTimeout: 0 },
  'alarm_water': { zoneType: 10, name: 'Water leak detector', resetTimeout: 0 },
  'alarm_tamper': { zoneType: 21, name: 'Tamper sensor', resetTimeout: 0 }
};

let stats = {
  total: 0,
  applied: 0,
  skipped: 0,
  errors: 0
};

/**
 * Détecte le type d'alarme dans le driver
 */
function detectAlarmType(content) {
  for (const [capability, config] of Object.entries(ZONE_TYPES)) {
    if (content.includes(`'${capability}'`) || content.includes(`"${capability}"`)) {
      return { capability, ...config };
    }
  }
  return null;
}

/**
 * Vérifie si IASZoneEnroller est déjà implémenté
 */
function hasIASZoneEnroller(content) {
  return content.includes('IASZoneEnroller') || content.includes('new IASZoneEnroller');
}

/**
 * Ajoute l'import IASZoneEnroller
 */
function addIASImport(content) {
  const lines = content.split('\n');
  let lastRequireIndex = -1;
  
  // Trouver le dernier require
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("require(") && !lines[i].trim().startsWith('//')) {
      lastRequireIndex = i;
    }
    if (lines[i].includes('class ') && lines[i].includes('extends')) {
      break;
    }
  }
  
  if (lastRequireIndex === -1) {
    // Chercher 'use strict'
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("'use strict'")) {
        lastRequireIndex = i + 1;
        break;
      }
    }
  }
  
  if (lastRequireIndex !== -1) {
    lines.splice(lastRequireIndex + 1, 0, "const IASZoneEnroller = require('../../lib/IASZoneEnroller');");
  }
  
  return lines.join('\n');
}

/**
 * Génère le code IAS Zone enrollment
 */
function generateIASCode(alarmInfo) {
  return `
    // ${alarmInfo.name} IAS Zone
    if (this.hasCapability('${alarmInfo.capability}')) {
      this.log('🚨 Setting up ${alarmInfo.name} IAS Zone...');
      try {
        const endpoint = zclNode.endpoints[1];
        const enroller = new IASZoneEnroller(this, endpoint, {
          zoneType: ${alarmInfo.zoneType}, // ${alarmInfo.name}
          capability: '${alarmInfo.capability}',
          pollInterval: 30000,
          autoResetTimeout: ${alarmInfo.resetTimeout}
        });
        const method = await enroller.enroll(zclNode);
        this.log(\`✅ ${alarmInfo.name} IAS Zone enrolled via: \${method}\`);
      } catch (err) {
        this.error('❌ IAS Zone enrollment failed:', err);
        this.log('⚠️  Device may auto-enroll or work without explicit enrollment');
      }
    }
`;
}

/**
 * Insère le code IAS dans le onNodeInit
 */
function insertIASCode(content, iasCode) {
  // Chercher la fin de onNodeInit, juste avant setAvailable
  const setAvailablePattern = /await this\.setAvailable\(\);/;
  const match = content.match(setAvailablePattern);
  
  if (match) {
    const insertIndex = content.indexOf(match[0]);
    const before = content.substring(0, insertIndex);
    const after = content.substring(insertIndex);
    return before + iasCode + '\n    ' + after;
  }
  
  // Fallback: chercher la fin de la méthode onNodeInit
  const onNodeInitEnd = /\n  \}\s*\n\s*\/\//; // Cherche la fin de la méthode
  const match2 = content.match(onNodeInitEnd);
  
  if (match2) {
    const insertIndex = content.indexOf(match2[0]);
    const before = content.substring(0, insertIndex);
    const after = content.substring(insertIndex);
    return before + iasCode + after;
  }
  
  return content;
}

/**
 * Applique IASZoneEnroller à un driver
 */
function applyIASZoneEnroller(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const driverName = path.basename(path.dirname(filePath));
    
    // Vérifier si déjà implémenté
    if (hasIASZoneEnroller(content)) {
      console.log(`   ⏭️  ${driverName} - Already has IASZoneEnroller`);
      stats.skipped++;
      return 'skipped';
    }
    
    // Détecter le type d'alarme
    const alarmInfo = detectAlarmType(content);
    if (!alarmInfo) {
      return 'no-alarm';
    }
    
    console.log(`   🔧 ${driverName} - Applying IASZoneEnroller (${alarmInfo.name}, zoneType: ${alarmInfo.zoneType})...`);
    
    // Ajouter l'import
    content = addIASImport(content);
    
    // Générer et insérer le code IAS
    const iasCode = generateIASCode(alarmInfo);
    content = insertIASCode(content, iasCode);
    
    // Sauvegarder
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   ✅ ${driverName} - Applied successfully!`);
    stats.applied++;
    
    return 'applied';
    
  } catch (err) {
    console.error(`   ❌ ${path.basename(path.dirname(filePath))} - Error:`, err.message);
    stats.errors++;
    return 'error';
  }
}

/**
 * Scanner tous les drivers
 */
function scanAllDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR);
  
  for (const driver of drivers) {
    const devicePath = path.join(DRIVERS_DIR, driver, 'device.js');
    
    if (fs.existsSync(devicePath)) {
      stats.total++;
      applyIASZoneEnroller(devicePath);
    }
  }
}

// Exécution principale
console.log('🔧 APPLICATION INTELLIGENTE DE IASZoneEnroller\n');
console.log('='.repeat(70));
console.log('\n📁 Scanning drivers for alarm capabilities...\n');

scanAllDrivers();

console.log('\n' + '='.repeat(70));
console.log('📊 RÉSUMÉ\n');
console.log(`Total drivers scannés: ${stats.total}`);
console.log(`✅ IASZoneEnroller appliqué: ${stats.applied}`);
console.log(`⏭️  Déjà présent: ${stats.skipped}`);
console.log(`❌ Erreurs: ${stats.errors}`);
console.log('='.repeat(70));

if (stats.applied > 0) {
  console.log(`\n✅ ${stats.applied} drivers patched avec IASZoneEnroller!`);
  console.log('\nProchaine étape:');
  console.log('  git add drivers/');
  console.log('  git commit -m "fix(drivers): Apply IASZoneEnroller to all alarm-capable drivers"');
  console.log('  git push origin master');
} else if (stats.skipped === stats.total) {
  console.log('\n✅ Tous les drivers alarm sont déjà configurés!');
} else {
  console.log('\n⚠️  Aucun driver nécessitant IASZoneEnroller trouvé.');
}

process.exit(stats.errors > 0 ? 1 : 0);
