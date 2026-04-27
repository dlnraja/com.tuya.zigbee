#!/usr/bin/env node
/**
 * SDK v3 Flow Card Safety Fixer v2.0.0
 * 
 * 1. Replaces deprecated getDevice*Card with get*Card (SDK v3)
 * 2. Ensures these calls are safe (don't crash the driver if card is missing)
 * 3. Removes "insane" nested try-catch wrappers if present.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
const LIBDIR = path.join(process.cwd(), 'lib');

function isAlreadyWrapped(line) {
  return line.includes('(() => { try {') || line.includes('safeGetCard');
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Aggressive Strip of "insane" nesting
  // Matches structured nesting: (() => { try { return (() => ...
  if (content.includes('(() => { try { return (() => { try {')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('this.homey.flow.get') && lines[i].includes('[FLOW-SAFE]')) {
        const idMatch = lines[i].match(/Card\(['"]([^'"]+)['"]\)/);
        const typeMatch = lines[i].match(/\.get(Trigger|Condition|Action)Card/);
        const varMatch = lines[i].match(/(const|let|var)\s+(\w+)\s*=/);
        
        if (idMatch && typeMatch) {
          const type = typeMatch[1];
          const id = idMatch[1];
          let cleanCall = `this.homey.flow.get${type}Card('${id}')`;
          
          if (varMatch) {
             lines[i] = lines[i].replace(/=.*/, `= ${cleanCall};`);
          } else {
             // Try to preserve indentation
             const indent = lines[i].match(/^\s*/)[0];
             lines[i] = `${indent}${cleanCall};`;
          }
          changed = true;
        }
      }
    }
    content = lines.join('\n');
  }

  // 2. Wrap bare calls that might throw (SDK v3 requirement for stability)
  // We use a clean IIFE wrapper if not already wrapped
  const patterns = [
    {
      // Match this.homey.flow.get... or homey.flow.get...
      reg: /(? <!try\s*\{\s*|return\s+)(this\. )? homey\.flow\.get(Device )? (Trigger|Condition|Action)Card\(['"]([^'"]+)['"])(\.? \w+ )? /g ,
      replacer: (match, prefix, dev, type, id, method) => {
        prefix = prefix || '';
        let cleanCall = `${prefix}homey.flow.get${type}Card('${id}')`;
        const wrapper = `(() => { try { return ${cleanCall}; } catch(e) { return null; } })()`;
        
        if (method) {
          return `${wrapper}${method.startsWith('.') ? '?' : ''}${method}`      ;
        }
        return wrapper;
      }
    }
  ];

  for (const p of patterns) {
    const nextContent = content.replace(p.reg, p.replacer);
    if (nextContent !== content) {
      content = nextContent;
      changed = true;
    }
  }

  // 3. Fallback for deprecated names in any other context
  if (content.includes('getDeviceTriggerCard') || content.includes('getDeviceConditionCard') || content.includes('getDeviceActionCard')) {
    content = content.replace(/getDeviceTriggerCard/g, 'getTriggerCard');
    content = content.replace(/getDeviceConditionCard/g, 'getConditionCard');
    content = content.replace(/getDeviceActionCard/g, 'getActionCard');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
  }
  return changed;
}

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const allFiles = walk(DDIR).concat(walk(LIBDIR));
let count = 0;
allFiles.forEach(f => {
  if (processFile(f)) {
    console.log(` Fixed: ${path.relative(process.cwd(), f)}`);
    count++;
  }
});

console.log(`\nTotal files fixed: ${count}`);
