#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🧹 CLEANING JSON FILES\n');

let fixCount = 0;

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory();
});

for (const driverName of drivers) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) continue;
  
  try {
    // Read file as buffer
    const buffer = fs.readFileSync(composeFile);
    
    // Remove BOM if present
    let content = buffer.toString('utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    // Try to parse
    const compose = JSON.parse(content);
    
    // Re-write with proper formatting
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
    
    console.log(`✅ Cleaned: ${driverName}`);
    fixCount++;
    
  } catch (err) {
    console.log(`❌ Failed: ${driverName} - ${err.message}`);
  }
}

console.log(`\n✅ Total cleaned: ${fixCount}\n`);
