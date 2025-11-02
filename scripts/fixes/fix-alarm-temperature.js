#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const APP_JSON = path.join(__dirname, '../../app.json');

console.log('🔧 Removing invalid alarm_temperature capability...\n');

// Read app.json
let content = fs.readFileSync(APP_JSON, 'utf8');
let fixed = 0;

// Find all occurrences
const matches = content.match(/"alarm_temperature"/g);
if (matches) {
  console.log(`Found ${matches.length} occurrences of "alarm_temperature"`);
  
  // Remove from capabilities arrays - handle different patterns
  const patterns = [
    /"alarm_temperature",?\s*/g,  // "alarm_temperature", or "alarm_temperature" 
    /,\s*"alarm_temperature"/g,   // , "alarm_temperature"
  ];
  
  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      fixed++;
    }
  });
  
  // Clean up any resulting issues
  content = content.replace(/,\s*\]/g, ']');  // Trailing comma before ]
  content = content.replace(/\[\s*,/g, '[');  // Leading comma after [
  content = content.replace(/,\s*,/g, ',');   // Double commas
  
  // Write back
  fs.writeFileSync(APP_JSON, content, 'utf8');
  
  console.log(`✅ Removed alarm_temperature from app.json`);
  console.log(`   Applied ${fixed} pattern fixes`);
} else {
  console.log('✅ No alarm_temperature found in app.json');
}

console.log('\n✨ Complete!');
