#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * FIX ALL DROPDOWNS
 * Convertit tous les dropdowns avec valeurs simples en format SDK3 correct
 */

const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow', 'actions');

console.log('🔧 FIXING ALL DROPDOWN VALUES\n');

let fixed = 0;

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let json;
  
  try {
    json = JSON.parse(content);
  } catch (e) {
    console.log(`  ❌ Invalid JSON: ${path.basename(filePath)}`);
    return false;
  }
  
  let changed = false;
  
  if (json.args) {
    json.args.forEach(arg => {
      if (arg.type === 'dropdown' && arg.values) {
        // Check if values need fixing
        const needsFix = arg.values.some(v => typeof v === 'string' || typeof v === 'number');
        
        if (needsFix) {
          arg.values = arg.values.map(v => {
            if (typeof v === 'object' && v.id) {
              return v; // Already correct
            }
            
            const id = String(v);
            const label = id.charAt(0).toUpperCase() + id.slice(1);
            
            return {
              id: id,
              label: { en: label, fr: label }
            };
          });
          
          changed = true;
        }
      }
    });
  }
  
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
    return true;
  }
  
  return false;
}

// Process all action files
const files = fs.readdirSync(FLOW_BASE).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const filePath = path.join(FLOW_BASE, file);
  if (processFile(filePath)) {
    console.log(`  ✅ Fixed: ${file}`);
    fixed++;
  }
});

console.log(`\n📊 Fixed ${fixed} dropdown files\n`);
