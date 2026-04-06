#!/usr/bin/env node
'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      MANIFEST CASELESS PROCESSOR - v1.0.0                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Ensures Tuya fingerprints are present in BOTH Uppercase and Lowercase       ║
 * ║  in driver manifests, bypassing Homey's case-sensitive matching.             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
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

  if (!content.zigbee || !content.zigbee.manufacturerName) return;

  const original = content.zigbee.manufacturerName;
  const newNames = new Set(original);
  let changed = false;

  for (const name of original) {
    if (typeof name !== 'string') continue;

    // We focus on Tuya prefixes which are the most common source of casing issues
    if (name.startsWith('_TZ') || name.startsWith('_TY') || name.startsWith('_TZE')) {
      const lower = name.toLowerCase();
      const upper = name.toUpperCase();

      if (!newNames.has(lower)) {
        newNames.add(lower);
        changed = true;
      }
      if (!newNames.has(upper)) {
        newNames.add(upper);
        changed = true;
      }
    }
  }

  if (changed) {
    content.zigbee.manufacturerName = [...newNames].sort();
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    console.log(`  [CASELESS] Updated ${path.basename(path.dirname(filePath))}: Added ${newNames.size - original.length} variants.`);
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
