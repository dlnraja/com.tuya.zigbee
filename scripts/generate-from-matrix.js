#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * GENERATE FROM MATRIX
 * Génère flow cards à partir de CAPABILITIES_FLOW_MATRIX.json
 */

const MATRIX_FILE = path.join(__dirname, '..', 'CAPABILITIES_FLOW_MATRIX.json');
const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow');

if (!fs.existsSync(MATRIX_FILE)) {
  console.error('❌ CAPABILITIES_FLOW_MATRIX.json not found');
  process.exit(1);
}

const matrix = JSON.parse(fs.readFileSync(MATRIX_FILE, 'utf8'));

console.log('🎯 GENERATING FROM CAPABILITIES MATRIX\n');
console.log(`Families: ${Object.keys(matrix.families).length}`);
console.log(`Version: ${matrix.metadata.version}\n`);

let totalCreated = 0;
const stats = { actions: 0, triggers: 0, conditions: 0 };

function sanitizeId(str) {
  return str.toLowerCase()
    .replace(/\[\[.*?\]\]/g, '')
    .replace(/!?\{\{.*?\}\}/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '');
}

function createFlowCard(familyName, cardType, card) {
  const baseId = sanitizeId(card.id);
  const fileName = `${familyName}_${baseId}.json`;
  const filePath = path.join(FLOW_BASE, cardType, fileName);
  
  if (fs.existsSync(filePath)) {
    return false;
  }
  
  // Build complete card
  const flowCard = {
    title: card.title,
    hint: card.hint || { en: card.title.en, fr: card.title.fr },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${familyName}` },
      ...(card.args || [])
    ]
  };
  
  if (card.tokens) {
    flowCard.tokens = card.tokens;
  }
  
  if (card.titleFormatted) {
    flowCard.titleFormatted = card.titleFormatted;
  }
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(flowCard, null, 2));
  return true;
}

function processFamily(familyName, familyData) {
  console.log(`\n${familyData.emoji} ${familyName.toUpperCase()}`);
  console.log(`Types: ${familyData.types.join(', ')}`);
  console.log(`Smart Mode: ${familyData.smartMode}`);
  
  let created = 0;
  
  // Process each type in family
  familyData.types.forEach(typeName => {
    // Actions
    if (familyData.flowCards.actions) {
      familyData.flowCards.actions.forEach(action => {
        if (createFlowCard(typeName, 'actions', action)) {
          created++;
          stats.actions++;
        }
      });
    }
    
    // Triggers
    if (familyData.flowCards.triggers) {
      familyData.flowCards.triggers.forEach(trigger => {
        if (createFlowCard(typeName, 'triggers', trigger)) {
          created++;
          stats.triggers++;
        }
      });
    }
    
    // Conditions
    if (familyData.flowCards.conditions) {
      familyData.flowCards.conditions.forEach(condition => {
        if (createFlowCard(typeName, 'conditions', condition)) {
          created++;
          stats.conditions++;
        }
      });
    }
  });
  
  if (created > 0) {
    console.log(`  ✅ Created: ${created} flow cards`);
  } else {
    console.log(`  ⏭️  All exist`);
  }
  
  return created;
}

// Process all families
Object.entries(matrix.families).forEach(([name, data]) => {
  totalCreated += processFamily(name, data);
});

console.log('\n' + '='.repeat(80));
console.log('📊 GENERATION STATISTICS');
console.log('='.repeat(80));
console.log(`Actions created:    ${stats.actions}`);
console.log(`Triggers created:   ${stats.triggers}`);
console.log(`Conditions created: ${stats.conditions}`);
console.log('─'.repeat(80));
console.log(`TOTAL:              ${totalCreated} flow cards`);
console.log('='.repeat(80) + '\n');

console.log('🚀 Next: homey app build\n');
