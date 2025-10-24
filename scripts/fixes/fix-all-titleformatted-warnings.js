#!/usr/bin/env node

/**
 * FIX ALL TITLEFORMATTED WARNINGS
 * 
 * Ajoute automatiquement titleFormatted à toutes les flow cards qui en manquent.
 * 
 * Patterns selon type:
 * - Triggers: "When [[device]] [event]"
 * - Conditions: "[[device]] [condition]"
 * - Actions: "[Action] [[device]]"
 * 
 * Usage: node scripts/fixes/fix-all-titleformatted-warnings.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const APP_JSON_PATH = path.join(PROJECT_ROOT, 'app.json');

console.log('🔧 FIX ALL TITLEFORMATTED WARNINGS\n');

// Charger app.json
const app = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixed = 0;
let skipped = 0;

/**
 * Générer titleFormatted depuis title
 */
function generateTitleFormatted(title, type) {
  if (!title || !title.en) return null;
  
  const text = title.en;
  
  // Si déjà [[device]] présent, garder tel quel
  if (text.includes('[[device]]')) {
    return { en: text };
  }
  
  // Patterns selon type
  switch (type) {
    case 'trigger':
      // "Contact opened" → "When [[device]] contact opened"
      // "Motion detected" → "When [[device]] motion detected"
      return { en: `When [[device]] ${text.toLowerCase()}` };
      
    case 'condition':
      // "Is open" → "[[device]] is open"
      // "Motion active" → "[[device]] motion active"
      return { en: `[[device]] ${text.toLowerCase()}` };
      
    case 'action':
      // "Turn on" → "Turn on [[device]]"
      // "Set brightness" → "Set [[device]] brightness"
      if (text.toLowerCase().startsWith('turn') || 
          text.toLowerCase().startsWith('switch') ||
          text.toLowerCase().startsWith('toggle')) {
        return { en: `${text} [[device]]` };
      }
      return { en: `Set [[device]] ${text.toLowerCase()}` };
      
    default:
      return { en: `[[device]] ${text.toLowerCase()}` };
  }
}

/**
 * Fixer flow cards d'un type
 */
function fixFlowCards(cards, type) {
  if (!cards || !Array.isArray(cards)) return 0;
  
  let count = 0;
  
  for (const card of cards) {
    // Vérifier si titleFormatted manque OU n'a pas de clé 'en'
    const needsFix = !card.titleFormatted || 
                     !card.titleFormatted.en || 
                     card.titleFormatted.en.trim() === '';
    
    if (needsFix && card.title && card.title.en) {
      const titleFormatted = generateTitleFormatted(card.title, type);
      
      if (titleFormatted) {
        card.titleFormatted = titleFormatted;
        console.log(`✅ ${type}: ${card.id}`);
        console.log(`   ${card.title.en}`);
        console.log(`   → ${titleFormatted.en}\n`);
        count++;
      }
    } else if (card.titleFormatted && card.titleFormatted.en) {
      skipped++;
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
  const backup = APP_JSON_PATH + '.backup-titleformatted';
  fs.copyFileSync(APP_JSON_PATH, backup);
  console.log(`\n💾 Backup: ${backup}`);
  
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(app, null, 2) + '\n', 'utf8');
  console.log('💾 Saved: app.json');
}

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY:\n');
console.log(`  ✅ Fixed: ${fixed} flow cards`);
console.log(`  ⏭️  Skipped: ${skipped} (already have titleFormatted)`);
console.log('='.repeat(60));

if (fixed > 0) {
  console.log('\n🎉 SUCCESS! All titleFormatted warnings will be resolved\n');
  console.log('Next steps:');
  console.log('  1. Review changes in app.json');
  console.log('  2. npm run validate:publish');
  console.log('  3. git add app.json');
  console.log('  4. git commit -m "fix: Add titleFormatted to all flow cards"');
  console.log('');
} else {
  console.log('\n✅ All flow cards already have titleFormatted\n');
}
