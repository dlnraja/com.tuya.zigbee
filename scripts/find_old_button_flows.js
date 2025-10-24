#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 RECHERCHE DES ANCIENS FLOW CARDS BUTTON...\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
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

let foundIssues = [];

// Vérifier les triggers
if (appJson.flow && appJson.flow.triggers) {
  appJson.flow.triggers.forEach((trigger, idx) => {
    OLD_DRIVER_PREFIXES.forEach(prefix => {
      if (trigger.id.startsWith(prefix)) {
        foundIssues.push({
          type: 'trigger',
          id: trigger.id,
          index: idx,
          oldDriver: String(prefix).replace('_', ''),
          title: trigger.title?.en || 'No title'
        });
      }
    });
  });
}

// Vérifier les conditions
if (appJson.flow && appJson.flow.conditions) {
  appJson.flow.conditions.forEach((condition, idx) => {
    OLD_DRIVER_PREFIXES.forEach(prefix => {
      if (condition.id.startsWith(prefix)) {
        foundIssues.push({
          type: 'condition',
          id: condition.id,
          index: idx,
          oldDriver: String(prefix).replace('_', ''),
          title: condition.title?.en || 'No title'
        });
      }
    });
  });
}

// Vérifier les actions
if (appJson.flow && appJson.flow.actions) {
  appJson.flow.actions.forEach((action, idx) => {
    OLD_DRIVER_PREFIXES.forEach(prefix => {
      if (action.id.startsWith(prefix)) {
        foundIssues.push({
          type: 'action',
          id: action.id,
          index: idx,
          oldDriver: String(prefix).replace('_', ''),
          title: action.title?.en || 'No title'
        });
      }
    });
  });
}

if (foundIssues.length === 0) {
  console.log('✅ AUCUN FLOW CARD OBSOLÈTE TROUVÉ!');
} else {
  console.log(`❌ ${foundIssues.length} FLOW CARDS OBSOLÈTES TROUVÉS:\n`);
  
  foundIssues.forEach(issue => {
    console.log(`📍 ${issue.type.toUpperCase()}: ${issue.id}`);
    console.log(`   Old Driver: ${issue.oldDriver}`);
    console.log(`   Title: ${issue.title}`);
    console.log(`   Index: ${issue.index}\n`);
  });
  
  console.log('\n🔧 CES FLOW CARDS DOIVENT ÊTRE SUPPRIMÉS OU ASSOCIÉS AUX NOUVEAUX DRIVERS!');
}
