#!/usr/bin/env node
'use strict';

/**
 * Recover Manufacturer IDs from Git History
 * Scans all commits to find manufacturerName entries that may have been lost
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Scanning Git history for manufacturer IDs...\n');

// Get all commits that modified driver.compose.json files
const commits = execSync('git log --all --pretty=format:"%H" --name-only -- "drivers/*/driver.compose.json"', { encoding: 'utf8' })
  .split('\n')
  .filter(line => line.trim() && line.length === 40); // SHA hashes only

console.log(`📊 Found ${commits.length} commits to analyze\n`);

const manufacturerDB = {};
const driversDir = path.join(__dirname, '..', 'drivers');
let processedCommits = 0;

// Scan each commit
commits.slice(0, 100).forEach(commit => { // Limit to 100 most recent for speed
  try {
    const files = execSync(`git diff-tree --no-commit-id --name-only -r ${commit}`, { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.includes('driver.compose.json'));
    
    files.forEach(file => {
      try {
        const content = execSync(`git show ${commit}:${file}`, { encoding: 'utf8' });
        const json = JSON.parse(content);
        
        if (json.zigbee && json.zigbee.manufacturerName) {
          const driverName = file.split('/')[1];
          const manufacturers = Array.isArray(json.zigbee.manufacturerName) 
            ? json.zigbee.manufacturerName 
            : [json.zigbee.manufacturerName];
          
          if (!manufacturerDB[driverName]) {
            manufacturerDB[driverName] = new Set();
          }
          
          manufacturers.forEach(mfg => {
            if (mfg && mfg.length > 5) { // Valid manufacturer ID
              manufacturerDB[driverName].add(mfg);
            }
          });
        }
      } catch (err) {
        // Skip errors (deleted files, etc.)
      }
    });
    
    processedCommits++;
    if (processedCommits % 20 === 0) {
      console.log(`  Processed ${processedCommits}/${commits.slice(0, 100).length} commits...`);
    }
  } catch (err) {
    // Skip commit errors
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 MANUFACTURER DATABASE FROM HISTORY');
console.log('='.repeat(80) + '\n');

// Convert Sets to Arrays
const result = {};
Object.keys(manufacturerDB).forEach(driver => {
  result[driver] = Array.from(manufacturerDB[driver]).sort();
});

// Display results
Object.keys(result).sort().forEach(driver => {
  console.log(`${driver}: ${result[driver].length} manufacturers`);
  result[driver].forEach(mfg => console.log(`  → ${mfg}`));
  console.log();
});

// Save to file
const outputPath = path.join(__dirname, '..', 'reports', 'manufacturers-from-history.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log('='.repeat(80));
console.log(`📄 Database saved: ${outputPath}`);
console.log(`📊 Total drivers found: ${Object.keys(result).length}`);
console.log(`📊 Total manufacturers: ${Object.values(result).reduce((sum, arr) => sum + arr.length, 0)}`);
console.log('='.repeat(80));
