#!/usr/bin/env node

/**
 * 🔧 FIX FLOW CARD TOKENS
 * 
 * Corrige tous les tokens sans 'title' dans les flow cards
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function fixFlowCards() {
  console.log('🔧 Fixing flow card tokens...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() &&
    !d.startsWith('.') &&
    !d.includes('archived')
  );
  
  let fixed = 0;
  
  for (const driverId of drivers) {
    const flowPath = path.join(DRIVERS_DIR, driverId, 'driver.flow.compose.json');
    
    if (!fs.existsSync(flowPath)) continue;
    
    try {
      const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      let modified = false;
      
      // Fix triggers
      if (flow.triggers) {
        for (const trigger of flow.triggers) {
          if (trigger.tokens) {
            for (const token of trigger.tokens) {
              if (!token.title) {
                // Generate title from name
                token.title = token.name.charAt(0).toUpperCase() + token.name.slice(1);
                modified = true;
              }
            }
          }
        }
      }
      
      // Fix conditions
      if (flow.conditions) {
        for (const condition of flow.conditions) {
          if (condition.args) {
            for (const arg of condition.args) {
              if (!arg.title && arg.name) {
                arg.title = arg.name.charAt(0).toUpperCase() + arg.name.slice(1);
                modified = true;
              }
            }
          }
        }
      }
      
      // Fix actions
      if (flow.actions) {
        for (const action of flow.actions) {
          if (action.args) {
            for (const arg of action.args) {
              if (!arg.title && arg.name) {
                arg.title = arg.name.charAt(0).toUpperCase() + arg.name.slice(1);
                modified = true;
              }
            }
          }
        }
      }
      
      if (modified) {
        fs.writeFileSync(flowPath, JSON.stringify(flow, null, 2) + '\n', 'utf8');
        console.log(`✓ Fixed: ${driverId}`);
        fixed++;
      }
      
    } catch (err) {
      console.error(`✗ Error ${driverId}:`, err.message);
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} flow card files`);
}

fixFlowCards();
