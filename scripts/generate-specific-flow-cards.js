#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * GENERATE SPECIFIC FLOW CARDS
 * Crée des flow cards ultra-spécifiques basées sur driver-flow-mapping.json
 */

const MAPPING_FILE = path.join(__dirname, '..', 'driver-flow-mapping.json');
const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow');

if (!fs.existsSync(MAPPING_FILE)) {
  console.error('❌ driver-flow-mapping.json not found');
  process.exit(1);
}

const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));

console.log('🎯 GENERATING SPECIFIC FLOW CARDS\n');
console.log(`Drivers in mapping: ${Object.keys(mapping.drivers).length}\n`);

let totalCreated = 0;

function sanitizeId(str) {
  return str.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()/%><]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '');
}

function createAction(driverName, actionName) {
  const id = sanitizeId(actionName);
  const fileName = `${driverName}_${id}.json`;
  const filePath = path.join(FLOW_BASE, 'actions', fileName);
  
  if (fs.existsSync(filePath)) {
    return false; // Skip existing
  }
  
  const card = {
    title: { en: actionName, fr: actionName },
    hint: { en: `${actionName} on device`, fr: `${actionName} sur l'appareil` },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${driverName}` }]
  };
  
  // Add specific arguments based on action type
  if (actionName.includes('Set') && actionName.includes('%')) {
    card.titleFormatted = { en: `${actionName.replace('%', '[[value]]%')}` };
    card.args.push({
      type: 'range',
      name: 'value',
      min: 0,
      max: 100,
      step: 1,
      value: 50,
      label: { en: 'Value (%)', fr: 'Valeur (%)' }
    });
  } else if (actionName.includes('Temperature')) {
    card.titleFormatted = { en: `${actionName} to [[temperature]]°C` };
    card.args.push({
      type: 'number',
      name: 'temperature',
      min: 5,
      max: 35,
      step: 0.5,
      placeholder: { en: 'Temperature', fr: 'Température' }
    });
  } else if (actionName.includes('Brightness')) {
    card.titleFormatted = { en: `${actionName} to [[brightness]]%` };
    card.args.push({
      type: 'range',
      name: 'brightness',
      min: 0,
      max: 100,
      step: 1,
      value: 50
    });
  }
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(card, null, 2));
  return true;
}

function createTrigger(driverName, triggerName) {
  const id = sanitizeId(triggerName);
  const fileName = `${driverName}_${id}.json`;
  const filePath = path.join(FLOW_BASE, 'triggers', fileName);
  
  if (fs.existsSync(filePath)) {
    return false;
  }
  
  const card = {
    title: { en: triggerName, fr: triggerName },
    hint: { en: `When ${triggerName.toLowerCase()}`, fr: `Quand ${triggerName.toLowerCase()}` },
    args: [{ type: 'device', name: 'device', filter: `driver_id=${driverName}` }]
  };
  
  // Add tokens for specific trigger types
  if (triggerName.includes('Above') || triggerName.includes('Below')) {
    card.tokens = [{
      name: 'value',
      type: 'number',
      title: { en: 'Value', fr: 'Valeur' },
      example: 100
    }];
    
    // Add threshold argument
    card.titleFormatted = { en: `${triggerName.replace('X', '[[threshold]]')}` };
    card.args.push({
      type: 'number',
      name: 'threshold',
      placeholder: { en: 'Threshold', fr: 'Seuil' }
    });
  } else if (triggerName.includes('Changed')) {
    const metric = triggerName.split(' ')[0].toLowerCase();
    card.tokens = [{
      name: metric,
      type: 'number',
      title: { en: triggerName.split(' ')[0], fr: triggerName.split(' ')[0] }
    }];
  }
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(card, null, 2));
  return true;
}

// Process each driver
Object.entries(mapping.drivers).forEach(([driverName, config]) => {
  console.log(`📦 ${driverName}`);
  
  let created = 0;
  
  // Create actions
  config.actions.forEach(actionName => {
    if (createAction(driverName, actionName)) {
      created++;
      console.log(`  ✅ Action: ${actionName}`);
    }
  });
  
  // Create triggers
  config.triggers.forEach(triggerName => {
    if (createTrigger(driverName, triggerName)) {
      created++;
      console.log(`  ✅ Trigger: ${triggerName}`);
    }
  });
  
  if (created > 0) {
    console.log(`  📊 Created: ${created} flow cards\n`);
    totalCreated += created;
  } else {
    console.log(`  ⏭️  All exist\n`);
  }
});

console.log('='.repeat(80));
console.log(`✅ Total specific flow cards created: ${totalCreated}`);
console.log('='.repeat(80) + '\n');

console.log('🚀 Next: homey app build\n');
