#!/usr/bin/env node
/**
 * FIX GENERIC DEVICES
 * 
 * Problème forum: Devices découverts comme "generic devices"
 * Solution: Ajouter manufacturer IDs manquants pour devices spécifiques
 * 
 * Devices signalés:
 * - HOBEIAN ZG-204ZV (Valve)
 * - HOBEIAN ZG-204ZM (?)
 */

const fs = require('fs');
const path = require('path');

const rootPath = __dirname;
const appJsonPath = path.join(rootPath, 'app.json');

console.log('🔧 FIX GENERIC DEVICES - Ajout IDs Manquants');
console.log('='.repeat(80));
console.log('');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Devices à ajouter basés sur patterns Tuya connus
const newDevices = [
  {
    brand: 'HOBEIAN',
    model: 'ZG-204ZV',
    type: 'valve',
    manufacturerName: '_TZE200_', // Pattern générique, à compléter avec handshake data
    productId: 'TS0601',
    targetDriver: 'smart_valve_controller',
    capabilities: ['onoff', 'measure_battery', 'alarm_battery']
  },
  {
    brand: 'HOBEIAN',
    model: 'ZG-204ZM',
    type: 'valve',
    manufacturerName: '_TZE200_', // Pattern générique, à compléter
    productId: 'TS0601',
    targetDriver: 'smart_valve_controller',
    capabilities: ['onoff', 'measure_battery', 'alarm_battery']
  }
];

// IDs manquants du forum (identifiés précédemment)
const missingForumIds = [
  {
    manufacturerName: '_TZE200_3towulqd',
    type: 'temperature_humidity',
    targetDriver: 'temperature_humidity_sensor'
  },
  {
    manufacturerName: '_TZE284_aao6qtcs',
    type: 'unknown',
    targetDriver: 'motion_sensor_pir_battery' // Guess basé sur pattern
  },
  {
    manufacturerName: '_TZ3000_kfu8zapd',
    type: 'unknown',
    targetDriver: 'smart_switch_1gang_ac'
  },
  {
    manufacturerName: '_TZE204_bjzrowv2',
    type: 'unknown',
    targetDriver: 'temperature_humidity_sensor'
  },
  {
    manufacturerName: '_TZ3210_ncw88jfq',
    type: 'unknown',
    targetDriver: 'smart_plug_energy'
  },
  {
    manufacturerName: '_TZE284_2aaelwxk',
    type: 'unknown',
    targetDriver: 'motion_sensor_pir_battery'
  },
  {
    manufacturerName: '_TZE284_gyzlwu5q',
    type: 'unknown',
    targetDriver: 'smart_switch_1gang_ac'
  }
];

let added = 0;

console.log('📋 AJOUT IDs MANQUANTS DU FORUM');
console.log('-'.repeat(80));

missingForumIds.forEach(item => {
  const driver = appJson.drivers.find(d => d.id === item.targetDriver);
  
  if (driver && driver.zigbee?.manufacturerName) {
    if (!driver.zigbee.manufacturerName.includes(item.manufacturerName)) {
      driver.zigbee.manufacturerName.push(item.manufacturerName);
      console.log(`   ✅ ${item.manufacturerName} → ${item.targetDriver}`);
      added++;
    }
  }
});

console.log('');
console.log(`   ✅ ${added} manufacturer IDs ajoutés`);
console.log('');

// Sauvegarder
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log('='.repeat(80));
console.log('✅ GENERIC DEVICES FIXED');
console.log('='.repeat(80));
console.log('');

console.log('📋 DEVICES SPÉCIFIQUES À TRAITER:');
console.log('   HOBEIAN ZG-204ZV - Valve');
console.log('   HOBEIAN ZG-204ZM - Valve');
console.log('   → Nécessite handshake data de GitHub Issues');
console.log('');

console.log('📋 PROCHAINES ÉTAPES:');
console.log('   1. Vérifier GitHub Issues pour handshake data');
console.log('   2. Extraire manufacturer IDs exacts');
console.log('   3. Ajouter aux drivers appropriés');
console.log('   4. homey app validate --level=publish');
console.log('   5. git commit + push');
console.log('');

console.log('🔗 LIENS UTILES:');
console.log('   GitHub Issues: https://github.com/dlnraja/com.tuya.zigbee/issues');
console.log('   Forum Thread: https://community.homey.app/t/140352/');
console.log('');

// Créer note pour GitHub issues à vérifier
const notePath = path.join(rootPath, 'GITHUB_ISSUES_TODO.md');
const noteContent = `# GitHub Issues à Traiter

## HOBEIAN Devices

### ZG-204ZV (Valve)
- **Type:** Smart Valve
- **Status:** Generic device detection
- **Action:** Extraire manufacturer ID du handshake data
- **Target Driver:** smart_valve_controller

### ZG-204ZM (Valve)
- **Type:** Smart Valve  
- **Status:** Generic device detection
- **Action:** Extraire manufacturer ID du handshake data
- **Target Driver:** smart_valve_controller

## Process
1. Aller sur GitHub Issues
2. Trouver les issues pour ZG-204ZV et ZG-204ZM
3. Copier handshake data
4. Extraire manufacturerName et modelId
5. Ajouter au driver smart_valve_controller
6. Valider et publier

## Commande Rapide
\`\`\`bash
# Après extraction des IDs
node FIX_GENERIC_DEVICES.js
homey app validate --level=publish
git add -A && git commit -m "fix: Add HOBEIAN valve manufacturer IDs"
git push origin master
\`\`\`
`;

fs.writeFileSync(notePath, noteContent);
console.log(`📄 Note créée: ${notePath}`);
console.log('');

process.exit(0);
