#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * FIX TOKENS AND INVALID ARGS
 * 1. Add 'title' to all tokens (from 'name')
 * 2. Fix invalid arg types (string -> dropdown with values)
 */

const ACTIONS_DIR = path.join(__dirname, '..', '.homeycompose', 'flow', 'actions');
const TRIGGERS_DIR = path.join(__dirname, '..', '.homeycompose', 'flow', 'triggers');

console.log('🔧 FIXING TOKENS AND ARGS\n');

let fixedTokens = 0;
let fixedArgs = 0;

function fixTokens(json) {
  let changed = false;
  
  if (json.tokens) {
    json.tokens.forEach(token => {
      if (token.name && !token.title) {
        // Generate title from name
        const label = token.name.charAt(0).toUpperCase() + token.name.slice(1).replace(/_/g, ' ');
        token.title = { en: label, fr: label };
        changed = true;
      }
    });
  }
  
  return changed;
}

function fixArgs(json) {
  let changed = false;
  
  if (json.args) {
    json.args.forEach(arg => {
      // Fix invalid types (like "string" -> "text")
      if (arg.type === 'string') {
        arg.type = 'text';
        arg.placeholder = arg.placeholder || { en: arg.name, fr: arg.name };
        changed = true;
      }
      
      // Fix args without type that have values (should be dropdown)
      if (!arg.type && arg.values) {
        arg.type = 'dropdown';
        changed = true;
      }
    });
  }
  
  return changed;
}

function processFile(filePath, fixFn) {
  const content = fs.readFileSync(filePath, 'utf8');
  let json;
  
  try {
    json = JSON.parse(content);
  } catch (e) {
    return false;
  }
  
  if (fixFn(json)) {
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
    return true;
  }
  
  return false;
}

// Fix triggers (tokens)
if (fs.existsSync(TRIGGERS_DIR)) {
  const triggerFiles = fs.readdirSync(TRIGGERS_DIR).filter(f => f.endsWith('.json'));
  triggerFiles.forEach(file => {
    if (processFile(path.join(TRIGGERS_DIR, file), fixTokens)) {
      console.log(`  ✅ Token: ${file}`);
      fixedTokens++;
    }
  });
}

// Fix actions (args)
if (fs.existsSync(ACTIONS_DIR)) {
  const actionFiles = fs.readdirSync(ACTIONS_DIR).filter(f => f.endsWith('.json'));
  actionFiles.forEach(file => {
    if (processFile(path.join(ACTIONS_DIR, file), fixArgs)) {
      console.log(`  ✅ Args: ${file}`);
      fixedArgs++;
    }
  });
}

console.log(`\n📊 Fixed ${fixedTokens} trigger files and ${fixedArgs} action files\n`);
