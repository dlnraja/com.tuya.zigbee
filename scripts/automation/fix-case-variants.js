#!/usr/bin/env node
'use strict';
/**
 * Fix Case Variants from Report - v1.0.0
 * Reads case-normalization-report.json and auto-adds missing variants
 * Run: node scripts/automation/fix-case-variants.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '../../data/community-sync/case-normalization-report.json');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const DRY_RUN = process.argv.includes('--dry-run');

function main() {
  console.log('=== Fix Case Variants from Report' + (DRY_RUN ? ' (DRY RUN )' : '') + ' ===\n')      ;
  
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('Report not found: ' + REPORT_PATH);
    console.error('Run normalize-manufacturer-names.js first');
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  let totalAdded = 0;
  
  // Group missing variants by driver from the report
  const variants = report.missingVariants || [];
  
  // Build a map of suggested variants to add
  const toAdd = new Map(); // driver -> Set of variants
  
  // For each duplicate entry, extract the variants
  for (const dup of (report.duplicates || [])) {
    const drivers = dup.drivers;
    const originals = dup.originals || [];
    
    // Find which variants are present and which are missing
    const uppercase = originals.filter(o => o === o.toUpperCase() && o.startsWith('_T'));
    const lowercase = originals.filter(o => o === o.toLowerCase() && o.startsWith('_'));
    
    // If we have uppercase but no lowercase variant, add it
    if (uppercase.length > 0 && lowercase.length === 0) {
      const base = uppercase[0];
      // Generate lowercase variant
      const match = base.match(/^(_TZ[A-Z0-9]{3,4}_)(.+)$/);
      if (match) {
        const variant = match[1] + match[2].toLowerCase();
        
        // Add to each driver that has the uppercase version
        for (const driver of drivers) {
          if (!toAdd.has(driver)) toAdd.set(driver, new Set());
          toAdd.get(driver).add(variant);
        }
      }
    }
  }
  
  // Apply changes to drivers
  for (const [driver, variantsSet] of toAdd) {
    const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = data.zigbee?.manufacturerName || []       ;
      const existingNorm = new Set(mfrs.map(m => m.toUpperCase().replace(/\u0000/g, '').trim()));
      
      const toAddHere = [];
      for (const variant of variantsSet) {
        if (!existingNorm.has(variant.toUpperCase())) {
          toAddHere.push(variant);
        }
      }
      
      if (toAddHere.length > 0) {
        data.zigbee.manufacturerName.push(...toAddHere );
        if (!DRY_RUN) {
          fs.writeFileSync(composePath, JSON.stringify(data, null, 2) + '\n');
        }
        console.log(`  ${driver}: +${toAddHere.length} variants: ${toAddHere.join(', ')}`);
        totalAdded += toAddHere.length;
      }
    } catch (e) {
      console.error(`  Error in ${driver}: ${e.message}`);
    }
  }
  
  console.log('\nTotal variants added: ' + totalAdded);
  
  return totalAdded;
}

main();
