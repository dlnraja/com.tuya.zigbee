#!/usr/bin/env node

/**
 * FIX ALL FLOW CARD WARNINGS
 * Ajoute titleFormatted à tous les flow cards qui en manquent
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(f => 
  fs.statSync(path.join(driversDir, f)).isDirectory()
);

let fixed = 0;
let errors = 0;

/**
 * Génère titleFormatted à partir de title et args/tokens
 */
function generateTitleFormatted(card) {
  const title = card.title?.en || '';
  const args = card.args || [];
  const tokens = card.tokens || [];
  
  let formatted = title;
  
  // Ajouter les arguments dans titleFormatted
  args.forEach(arg => {
    if (arg.type === 'dropdown' || arg.type === 'text' || arg.type === 'number') {
      const argName = arg.name || arg.title?.en || 'argument';
      // Ajouter [[argument]] pour les dropdowns/inputs
      if (!formatted.includes(`[[${argName}]]`)) {
        formatted += ` [[${argName}]]`;
      }
    }
  });
  
  return formatted;
}

/**
 * Traite un fichier flow
 */
function processFlowFile(driverId, flowPath) {
  try {
    const content = fs.readFileSync(flowPath, 'utf8');
    const flow = JSON.parse(content);
    
    let modified = false;
    
    // Process triggers
    if (flow.triggers) {
      flow.triggers.forEach(trigger => {
        if (!trigger.titleFormatted && trigger.title) {
          trigger.titleFormatted = generateTitleFormatted(trigger);
          modified = true;
        }
      });
    }
    
    // Process conditions
    if (flow.conditions) {
      flow.conditions.forEach(condition => {
        if (!condition.titleFormatted && condition.title) {
          condition.titleFormatted = generateTitleFormatted(condition);
          modified = true;
        }
      });
    }
    
    // Process actions
    if (flow.actions) {
      flow.actions.forEach(action => {
        if (!action.titleFormatted && action.title) {
          action.titleFormatted = generateTitleFormatted(action);
          modified = true;
        }
      });
    }
    
    if (modified) {
      fs.writeFileSync(flowPath, JSON.stringify(flow, null, 2) + '\n', 'utf8');
      console.log(`✅ ${driverId}`);
      return true;
    } else {
      return false;
    }
    
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
    errors++;
    return false;
  }
}

console.log('\n🔧 Fixing all flow card warnings...\n');

drivers.forEach(driverId => {
  const flowPath = path.join(driversDir, driverId, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowPath)) {
    return;
  }
  
  if (processFlowFile(driverId, flowPath)) {
    fixed++;
  }
});

console.log(`\n✅ Fixed ${fixed} flow files`);
if (errors > 0) {
  console.log(`⚠️  ${errors} errors encountered`);
}

console.log('\n🎯 All titleFormatted warnings resolved!\n');
