#!/usr/bin/env node
'use strict';

/**
 * 
 *       MANIFEST CASELESS PROCESSOR - v1.1.0                                    
 * 
 *   Ensures Tuya fingerprints are present in BOTH Uppercase and Lowercase       
 *   in driver manifests, bypassing Homey's case-sensitive matching.             
 * 
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function processFile(filePath) {
  let content;
  try {
    content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`  [ERR] Failed to parse ${filePath}: ${e.message}`);
    return;
  }

  let changed = false;

  if (content.zigbee) {
    // 1. Process manufacturerName (Case-insensitive)
    if (Array.isArray(content.zigbee.manufacturerName)) {
      const original = content.zigbee.manufacturerName;
      const newNames = new Set(original);
      for (const name of original) {
        if (typeof name !== 'string') continue;
        newNames.add(name.toLowerCase());
        newNames.add(name.toUpperCase());
      }
      if (newNames.size !== original.length) {
        content.zigbee.manufacturerName = [...newNames].sort();
        changed = true;
      }
    }

    // 2. Process productId (Case-insensitive)
    if (Array.isArray(content.zigbee.productId)) {
      const original = content.zigbee.productId;
      const newIds = new Set(original);
      for (const id of original) {
        if (typeof id !== 'string') continue;
        newIds.add(id.toLowerCase());
        newIds.add(id.toUpperCase());
      }
      if (newIds.size !== original.length) {
        content.zigbee.productId = [...newIds].sort();
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    console.log(`  [CASELESS] Updated ${path.basename(path.dirname(filePath))}: Normalised manufacturerNames/productIds.`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'driver.compose.json') {
      processFile(fullPath);
    }
  });
}

console.log('Starting Manifest Caseless Normalization...');
walk(DRIVERS_DIR);
console.log('Done.');
