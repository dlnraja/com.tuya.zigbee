#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 SUPPRESSION DES ANCIENS FLOW CARDS BUTTON...\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const backupPath = appJsonPath + '.backup-button-flows.' + Date.now();

// Backup
console.log('💾 Création backup: ' + path.basename(backupPath));
fs.copyFileSync(appJsonPath, backupPath);

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Anciens préfixes de drivers qui n'existent plus
const OLD_DRIVER_PREFIXES = [
  'button_1gang_',
  'button_2gang_',
  'button_3gang_',
  'button_4gang_',
  'button_6gang_',
  'button_8gang_'
];

let removedCount = 0;

// Fonction pour vérifier si un flow card est obsolète
function isObsolete(id) {
  return OLD_DRIVER_PREFIXES.some(prefix => id.startsWith(prefix));
}

// Supprimer des triggers
if (appJson.flow && appJson.flow.triggers) {
  const originalLength = appJson.flow.triggers.length;
  appJson.flow.triggers = appJson.flow.triggers.filter(trigger => {
    if (isObsolete(trigger.id)) {
      console.log(`  ❌ Supprimé trigger: ${trigger.id}`);
      removedCount++;
      return false;
    }
    return true;
  });
  console.log(`\n✅ Triggers: ${originalLength} → ${appJson.flow.triggers.length}`);
}

// Supprimer des conditions
if (appJson.flow && appJson.flow.conditions) {
  const originalLength = appJson.flow.conditions.length;
  appJson.flow.conditions = appJson.flow.conditions.filter(condition => {
    if (isObsolete(condition.id)) {
      console.log(`  ❌ Supprimé condition: ${condition.id}`);
      removedCount++;
      return false;
    }
    return true;
  });
  console.log(`\n✅ Conditions: ${originalLength} → ${appJson.flow.conditions.length}`);
}

// Supprimer des actions
if (appJson.flow && appJson.flow.actions) {
  const originalLength = appJson.flow.actions.length;
  appJson.flow.actions = appJson.flow.actions.filter(action => {
    if (isObsolete(action.id)) {
      console.log(`  ❌ Supprimé action: ${action.id}`);
      removedCount++;
      return false;
    }
    return true;
  });
  console.log(`\n✅ Actions: ${originalLength} → ${appJson.flow.actions.length}`);
}

// Sauvegarder
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`\n✅ ${removedCount} FLOW CARDS OBSOLÈTES SUPPRIMÉS!`);
console.log(`\n💡 PROCHAINES ÉTAPES:`);
console.log(`   1. homey app build`);
console.log(`   2. homey app validate --level publish`);
console.log(`   3. git add app.json`);
console.log(`   4. git commit -m "fix: remove obsolete button flow cards causing crashes"`);
