#!/usr/bin/env node
'use strict';

/**
 * FIX WALL TOUCH FLOW CARDS
 * 
 * Problème: wall_touch_1gang à wall_touch_8gang essaient d'enregistrer
 * des flow cards qui n'existent pas, causant des erreurs au démarrage.
 * 
 * Solution: Créer toutes les flow cards manquantes dans flow/triggers.json
 * 
 * Diagnostic Log: 7548be2e-d9e4-4ff2-bc6f-13654dd9c37d
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FLOW_DIR = path.join(ROOT, 'flow');
const TRIGGERS_FILE = path.join(FLOW_DIR, 'triggers.json');

console.log('🔧 FIXING WALL TOUCH FLOW CARDS');
console.log('═══════════════════════════════════════════════════\n');

// Créer dossier flow si manquant
if (!fs.existsSync(FLOW_DIR)) {
  fs.mkdirSync(FLOW_DIR, { recursive: true });
  console.log('✅ Created flow/ directory');
}

// Lire ou créer triggers.json
let triggers = [];
if (fs.existsSync(TRIGGERS_FILE)) {
  triggers = JSON.parse(fs.readFileSync(TRIGGERS_FILE, 'utf8'));
  console.log(`📋 Loaded ${triggers.length} existing triggers`);
} else {
  console.log('📋 Creating new triggers.json');
}

// Backup
if (fs.existsSync(TRIGGERS_FILE)) {
  const backupPath = TRIGGERS_FILE + '.backup-wall-touch';
  fs.writeFileSync(backupPath, JSON.stringify(triggers, null, 2), 'utf8');
  console.log(`✅ Backup: ${backupPath}\n`);
}

// ============================================================================
// GÉNÉRER FLOW CARDS POUR WALL TOUCH
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log('GENERATING FLOW CARDS FOR WALL TOUCH DRIVERS');
console.log('═══════════════════════════════════════════════════\n');

const BUTTON_EVENTS = [
  { suffix: 'pressed', title: 'pressed' },
  { suffix: 'long_pressed', title: 'long pressed' },
  { suffix: 'released', title: 'released' }
];

let added = 0;

for (let gang = 1; gang <= 8; gang++) {
  const driverId = `wall_touch_${gang}gang`;
  
  console.log(`\n📱 ${driverId}:`);
  
  for (let button = 1; button <= gang; button++) {
    for (const event of BUTTON_EVENTS) {
      const flowId = `${driverId}_button${button}_${event.suffix}`;
      
      // Vérifier si existe déjà
      const exists = triggers.find(t => t.id === flowId);
      if (exists) {
        console.log(`   ℹ️  ${flowId} - already exists`);
        continue;
      }
      
      // Créer flow card
      const flowCard = {
        id: flowId,
        title: {
          en: `Button ${button} ${event.title}`,
          fr: `Bouton ${button} ${event.title === 'pressed' ? 'appuyé' : event.title === 'long pressed' ? 'appuyé longuement' : 'relâché'}`
        },
        titleFormatted: {
          en: `Button ${button} ${event.title}`,
          fr: `Bouton ${button} ${event.title === 'pressed' ? 'appuyé' : event.title === 'long pressed' ? 'appuyé longuement' : 'relâché'}`
        },
        hint: {
          en: `Triggered when button ${button} is ${event.title}`,
          fr: `Déclenché quand le bouton ${button} est ${event.title === 'pressed' ? 'appuyé' : event.title === 'long pressed' ? 'appuyé longuement' : 'relâché'}`
        },
        tokens: [
          {
            name: 'gang',
            type: 'number',
            title: {
              en: 'Gang number',
              fr: 'Numéro gang'
            },
            example: button
          },
          {
            name: 'button',
            type: 'number',
            title: {
              en: 'Button number',
              fr: 'Numéro bouton'
            },
            example: button
          },
          {
            name: 'action',
            type: 'string',
            title: {
              en: 'Action',
              fr: 'Action'
            },
            example: event.suffix
          }
        ]
      };
      
      triggers.push(flowCard);
      added++;
      console.log(`   ✅ ${flowId}`);
    }
  }
}

// ============================================================================
// SAUVEGARDER
// ============================================================================

fs.writeFileSync(TRIGGERS_FILE, JSON.stringify(triggers, null, 2) + '\n', 'utf8');

console.log('\n═══════════════════════════════════════════════════');
console.log('✅ FLOW CARDS CREATED');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Flow cards added: ${added}`);
console.log(`Total triggers: ${triggers.length}`);
console.log(`\nFile: ${TRIGGERS_FILE}\n`);

// ============================================================================
// RÉCAPITULATIF
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════\n');

console.log('Flow cards by driver:');
for (let gang = 1; gang <= 8; gang++) {
  const count = gang * 3; // button1-N × 3 events
  console.log(`  wall_touch_${gang}gang: ${count} flow cards`);
}

console.log(`\nTotal: ${added} flow cards added`);
console.log('');

console.log('Events per button:');
console.log('  • pressed');
console.log('  • long_pressed');
console.log('  • released');
console.log('');

console.log('Next steps:');
console.log('  1. Validate: homey app validate');
console.log('  2. Test a wall_touch driver');
console.log('  3. Commit & push');
console.log('');
