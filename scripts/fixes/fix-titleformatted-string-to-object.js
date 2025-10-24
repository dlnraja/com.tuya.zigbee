#!/usr/bin/env node

/**
 * FIX TITLEFORMATTED STRING TO OBJECT
 * 
 * Convertit tous les titleFormatted en string vers format objet {en: "..."}
 * 
 * Usage: node scripts/fixes/fix-titleformatted-string-to-object.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const APP_JSON_PATH = path.join(PROJECT_ROOT, 'app.json');

console.log('🔧 FIX TITLEFORMATTED STRING TO OBJECT\n');

// Charger app.json
const app = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixed = 0;

/**
 * Fixer flow cards d'un type
 */
function fixFlowCards(cards, typeName) {
  if (!cards || !Array.isArray(cards)) return 0;
  
  let count = 0;
  
  for (const card of cards) {
    if (card.titleFormatted && typeof card.titleFormatted === 'string') {
      const oldValue = card.titleFormatted;
      card.titleFormatted = { en: oldValue };
      console.log(`✅ ${typeName}: ${card.id}`);
      console.log(`   "${oldValue}"`);
      console.log(`   → { en: "${oldValue}" }\n`);
      count++;
    }
  }
  
  return count;
}

// Fixer triggers
if (app.flow && app.flow.triggers) {
  console.log('🔄 Fixing triggers...\n');
  fixed += fixFlowCards(app.flow.triggers, 'trigger');
}

// Fixer conditions
if (app.flow && app.flow.conditions) {
  console.log('\n🔄 Fixing conditions...\n');
  fixed += fixFlowCards(app.flow.conditions, 'condition');
}

// Fixer actions
if (app.flow && app.flow.actions) {
  console.log('\n🔄 Fixing actions...\n');
  fixed += fixFlowCards(app.flow.actions, 'action');
}

// Sauvegarder
if (fixed > 0) {
  const backup = APP_JSON_PATH + '.backup-titleformatted-objects';
  fs.copyFileSync(APP_JSON_PATH, backup);
  console.log(`\n💾 Backup: ${backup}`);
  
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(app, null, 2) + '\n', 'utf8');
  console.log('💾 Saved: app.json');
}

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY:\n');
console.log(`  ✅ Fixed: ${fixed} flow cards`);
console.log('='.repeat(60));

if (fixed > 0) {
  console.log('\n🎉 SUCCESS! All titleFormatted are now objects\n');
  console.log('Next steps:');
  console.log('  1. npm run validate:publish');
  console.log('  2. git add app.json');
  console.log('');
} else {
  console.log('\n✅ All titleFormatted are already objects\n');
}
