#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * GENERATE FROM USER-PROVIDED ADVANCED JSON
 * Parse et génère TOUS les flow cards avec préfixes SDK3 corrects
 */

const JSON_FILE = path.join(__dirname, '..', 'drivers_flows_advanced_full.json');
const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow');

if (!fs.existsSync(JSON_FILE)) {
  console.error('❌ drivers_flows_advanced_full.json not found');
  console.error('   Create it with the provided JSON data');
  process.exit(1);
}

const drivers = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

console.log('🎯 GENERATING FROM USER-PROVIDED ADVANCED JSON\n');
console.log(`Drivers to process: ${drivers.length}\n`);

let totalCreated = 0;
const stats = { actions: 0, triggers: 0, conditions: 0 };

function sanitizeId(str) {
  return str.toLowerCase()
    .replace(/\s*—\s*.*/g, '') // Remove French after —
    .replace(/\(.*?\)/g, '') // Remove parentheses
    .replace(/\//g, '_') // Replace slashes
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '');
}

function extractEN(str) {
  const match = str.match(/^([^—(]+)/);
  return match ? match[1].trim() : str.trim();
}

function extractFR(str) {
  const dashMatch = str.match(/—\s*(.+)$/);
  if (dashMatch) return dashMatch[1].trim();
  const parenMatch = str.match(/\(([^)]+)\)$/);
  if (parenMatch) return parenMatch[1].trim();
  return extractEN(str);
}

function createFlowCard(driverName, cardType, cardTitle) {
  const enTitle = extractEN(cardTitle);
  const frTitle = extractFR(cardTitle);
  const cardId = sanitizeId(cardTitle);
  
  // SDK3: prefix avec nom driver
  const fullId = `${driverName}_${cardId}`;
  const fileName = `${fullId}.json`;
  const filePath = path.join(FLOW_BASE, cardType, fileName);
  
  if (fs.existsSync(filePath)) return false;
  
  const flowCard = {
    title: { en: enTitle, fr: frTitle },
    hint: { en: enTitle, fr: frTitle },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${driverName}` }]
  };
  
  // Détecter paramètres et ajouter args
  const hasParams = /\b(X|Y|N|%|level|threshold|value)\b/i.test(enTitle);
  
  if (hasParams) {
    let formatted = enTitle
      .replace(/\bX\b/gi, '[[value]]')
      .replace(/\bY\b/gi, '[[max]]')
      .replace(/\bN\b/gi, '[[number]]')
      .replace(/\b(\d+)\s*%/g, '[[percent]]%')
      .replace(/\blevel\b/gi, '[[level]]')
      .replace(/\bthreshold\b/gi, '[[threshold]]');
    
    flowCard.titleFormatted = { en: formatted, fr: frTitle };
    
    // Ajouter argument approprié
    if (/brightness|position|percent|%/i.test(enTitle)) {
      flowCard.args.push({
        type: 'range',
        name: 'value',
        min: 0,
        max: 100,
        step: 1,
        label: { en: 'Value (%)', fr: 'Valeur (%)' }
      });
    } else if (/temperature|temp/i.test(enTitle)) {
      flowCard.args.push({
        type: 'number',
        name: 'temperature',
        min: -20,
        max: 50,
        step: 0.5,
        placeholder: { en: 'Temperature (°C)', fr: 'Température (°C)' }
      });
    } else if (/speed|level/i.test(enTitle)) {
      flowCard.args.push({
        type: 'range',
        name: 'level',
        min: 0,
        max: 10,
        step: 1,
        label: { en: 'Level', fr: 'Niveau' }
      });
    } else {
      flowCard.args.push({
        type: 'number',
        name: 'value',
        placeholder: { en: 'Value', fr: 'Valeur' }
      });
    }
  }
  
  // Tokens pour triggers
  if (cardType === 'triggers') {
    if (/changed|detected|above|below/i.test(enTitle)) {
      flowCard.tokens = [{
        name: 'value',
        type: 'number',
        title: { en: 'Value', fr: 'Valeur' }
      }];
    }
  }
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(flowCard, null, 2));
  return true;
}

// Process chaque driver
drivers.forEach(driver => {
  console.log(`📦 ${driver.driver}`);
  let created = 0;
  
  // Actions
  if (driver.advanced_flow_cards.actions) {
    driver.advanced_flow_cards.actions.forEach(action => {
      if (createFlowCard(driver.driver, 'actions', action)) {
        created++;
        stats.actions++;
      }
    });
  }
  
  // Triggers
  if (driver.advanced_flow_cards.triggers) {
    driver.advanced_flow_cards.triggers.forEach(trigger => {
      if (createFlowCard(driver.driver, 'triggers', trigger)) {
        created++;
        stats.triggers++;
      }
    });
  }
  
  // Conditions
  if (driver.advanced_flow_cards.conditions) {
    driver.advanced_flow_cards.conditions.forEach(condition => {
      if (createFlowCard(driver.driver, 'conditions', condition)) {
        created++;
        stats.conditions++;
      }
    });
  }
  
  if (created > 0) {
    console.log(`  ✅ ${created} cards`);
    totalCreated += created;
  } else {
    console.log(`  ⏭️  All exist`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 STATISTICS');
console.log('='.repeat(80));
console.log(`Actions created:    ${stats.actions}`);
console.log(`Triggers created:   ${stats.triggers}`);
console.log(`Conditions created: ${stats.conditions}`);
console.log('─'.repeat(80));
console.log(`TOTAL:              ${totalCreated} flow cards`);
console.log('='.repeat(80) + '\n');

console.log('🎉 DONE! Run: homey app build\n');
