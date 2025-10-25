#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const MAPPING_FILE = path.join(__dirname, '..', 'COMPLETE_DRIVER_FLOW_MAPPING.json');
const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow');

if (!fs.existsSync(MAPPING_FILE)) {
  console.error('❌ COMPLETE_DRIVER_FLOW_MAPPING.json not found');
  process.exit(1);
}

const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));

console.log('🎯 GENERATING FROM COMPLETE MAPPING\n');
console.log(`Drivers: ${Object.keys(mapping.drivers).length}\n`);

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

function createFlowCard(driverName, cardType, card) {
  const baseId = sanitizeId(card.id);
  const fileName = `${driverName}_${baseId}.json`;
  const filePath = path.join(FLOW_BASE, cardType, fileName);
  
  if (fs.existsSync(filePath)) return false;
  
  const flowCard = {
    title: card.title,
    hint: card.hint || { en: card.title.en, fr: card.title.fr },
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
      ...(card.args || [])
    ]
  };
  
  if (card.title.en.includes('[[') || card.title.en.includes('!{{')) {
    flowCard.titleFormatted = card.title;
  }
  
  if (cardType === 'triggers' && card.tokens) {
    flowCard.tokens = card.tokens;
  }
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(flowCard, null, 2));
  return true;
}

// Process all drivers
Object.entries(mapping.drivers).forEach(([driverName, driverData]) => {
  console.log(`📦 ${driverName}`);
  
  let created = 0;
  ['actions', 'triggers', 'conditions'].forEach(type => {
    if (driverData[type]) {
      driverData[type].forEach(card => {
        if (createFlowCard(driverName, type, card)) {
          created++;
          stats[type]++;
        }
      });
    }
  });
  
  if (created > 0) {
    console.log(`  ✅ ${created} cards\n`);
    totalCreated += created;
  }
});

console.log('='.repeat(80));
console.log(`Actions:    ${stats.actions}`);
console.log(`Triggers:   ${stats.triggers}`);
console.log(`Conditions: ${stats.conditions}`);
console.log(`TOTAL:      ${totalCreated} flow cards`);
console.log('='.repeat(80) + '\n');
