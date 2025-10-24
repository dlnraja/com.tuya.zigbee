#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 SUPPRESSION DES ANCIENS FLOW CARDS BUTTON (DEBUG)...\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
console.log(`📂 Fichier: ${appJsonPath}`);
console.log(`📊 Taille avant: ${fs.statSync(appJsonPath).size} bytes`);

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
console.log(`📊 Triggers avant: ${appJson.flow.triggers.length}`);

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
      removedCount++;
      return false;
    }
    return true;
  });
  console.log(`\n✅ Triggers: ${originalLength} → ${appJson.flow.triggers.length} (supprimé: ${originalLength - appJson.flow.triggers.length})`);
}

// Supprimer des conditions
if (appJson.flow && appJson.flow.conditions) {
  const originalLength = appJson.flow.conditions.length;
  appJson.flow.conditions = appJson.flow.conditions.filter(condition => {
    if (isObsolete(condition.id)) {
      removedCount++;
      return false;
    }
    return true;
  });
  console.log(`✅ Conditions: ${originalLength} → ${appJson.flow.conditions.length} (supprimé: ${originalLength - appJson.flow.conditions.length})`);
}

// Supprimer des actions
if (appJson.flow && appJson.flow.actions) {
  const originalLength = appJson.flow.actions.length;
  appJson.flow.actions = appJson.flow.actions.filter(action => {
    if (isObsolete(action.id)) {
      removedCount++;
      return false;
    }
    return true;
  });
  console.log(`✅ Actions: ${originalLength} → ${appJson.flow.actions.length} (supprimé: ${originalLength - appJson.flow.actions.length})`);
}

console.log(`\n📊 Total flow cards obsolètes trouvés: ${removedCount}`);

if (removedCount > 0) {
  // Sauvegarder
  const newContent = JSON.stringify(appJson, null, 2);
  console.log(`\n💾 Écriture du fichier...`);
  fs.writeFileSync(appJsonPath, newContent, 'utf8');
  console.log(`✅ Fichier sauvegardé!`);
  console.log(`📊 Taille après: ${fs.statSync(appJsonPath).size} bytes`);
  console.log(`\n✅ ${removedCount} FLOW CARDS OBSOLÈTES SUPPRIMÉS!`);
} else {
  console.log(`\n✅ AUCUN FLOW CARD OBSOLÈTE TROUVÉ!`);
}
