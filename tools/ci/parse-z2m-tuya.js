#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const INPUT = 'C:/Users/Dell/Documents/homey/master/.github/state/z2m-tuya-raw.txt';
const OUTPUT = 'C:/Users/Dell/Documents/homey/master/.github/state/z2m-pairs.json';

const content = fs.readFileSync(INPUT, 'utf8');
const lines = content.split('\n');

// Parse blocks: each export const X = {...} or export const X: DefinitionWithExtend = {...}
// Format we want: { vendor, model, description, zigbeeModel[] }
const blocks = [];
let currentBlock = null;
let braceDepth = 0;
let inBlock = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Start of an exported device
  // export const definitions = [ ... ] or just { vendor, model }
  // In the file, individual devices are: { vendor: '...', model: '...', ... }

  // Track vendor
  const vendorMatch = line.match(/^\s*vendor:\s*['"]([^'"]+)['"]/);
  if (vendorMatch) {
    if (!currentBlock) currentBlock = {};
    currentBlock.vendor = vendorMatch[1];
  }

  // Track model
  const modelMatch = line.match(/^\s*model:\s*['"]([^'"]+)['"]/);
  if (modelMatch) {
    if (!currentBlock) currentBlock = {};
    currentBlock.model = modelMatch[1];
  }

  // Track zigbeeModel
  const zigbeeMatch = line.match(/^\s*zigbeeModel:\s*\[([^\]]+)\]/);
  if (zigbeeMatch) {
    if (!currentBlock) currentBlock = {};
    currentBlock.zigbeeModels = zigbeeMatch[1]
      .split(',')
      .map(s => s.trim().replace(/['"\s]/g, ''))
      .filter(Boolean);
  }

  // Track description
  const descMatch = line.match(/^\s*description:\s*['"]([^'"]+)['"]/);
  if (descMatch) {
    if (!currentBlock) currentBlock = {};
    currentBlock.description = descMatch[1];
  }

  // Detect end of block: a line with just '},' (close brace + comma)
  if (trimmed === '},' || trimmed === '}, ' || trimmed === '}') {
    if (currentBlock && (currentBlock.vendor || currentBlock.model)) {
      // Initialize zigbeeModels with [model] if not present
      if (!currentBlock.zigbeeModels && currentBlock.model) {
        currentBlock.zigbeeModels = [currentBlock.model];
      }
      blocks.push(currentBlock);
    }
    currentBlock = null;
  }
}

// Dedupe
const seen = new Set();
const unique = [];
for (const b of blocks) {
  const key = `${b.vendor || 'unknown'}|${b.model || 'unknown'}`;
  if (!seen.has(key) && b.vendor) {
    seen.add(key);
    unique.push(b);
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(unique, null, 2));
console.log('Extracted', unique.length, 'unique vendor+model blocks');
console.log('Unique vendors:', new Set(unique.map(b => b.vendor)).size);
console.log('Sample (first 3):');
console.log(JSON.stringify(unique.slice(0, 3), null, 2));
