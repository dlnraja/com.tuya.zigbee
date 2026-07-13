#!/usr/bin/env node
/**
 * check-flow-cards.js - Verify all flow cards are present
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Check .homeycompose/flow directory
const flowDir = '.homeycompose/flow';
if (!fs.existsSync(flowDir)) {
  console.log('❌ Flow directory missing');
  process.exit(1);
}

let totalCards = 0;
let missingFiles = 0;

function scanDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) {
        scanDir(fp);
      } else if (f.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
          if (data.id) totalCards++;
        } catch (e) {
          missingFiles++;
          console.log(`❌ Invalid JSON: ${fp}`);
        }
      }
    }
  } catch {}
}

scanDir(flowDir);

// Check for missing flow card files in drivers
const driversDir = './drivers';
let driverFlowIssues = 0;
try {
  const drivers = fs.readdirSync(driversDir);
  for (const d of drivers) {
    const flowPath = path.join(driversDir, d, 'driver.flow.compose.json');
    const composePath = path.join(driversDir, d, 'driver.compose.json');
    if (fs.existsSync(composePath) && !fs.existsSync(flowPath)) {
      // Check if this driver has flow cards in compose.json
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        if (compose.flow) {
          driverFlowIssues++;
          console.log(`⚠️ ${d}: has flow in compose but no flow.compose.json`);
        }
      } catch {}
    }
  }
} catch {}

console.log(`\nFlow card integrity check:`);
console.log(`  Total flow cards: ${totalCards}`);
console.log(`  Invalid JSON: ${missingFiles}`);
console.log(`  Drivers missing flow.compose.json: ${driverFlowIssues}`);

process.exit(missingFiles > 0 || driverFlowIssues > 0 ? 1 : 0);
