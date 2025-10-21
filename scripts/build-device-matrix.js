#!/usr/bin/env node
'use strict';

/**
 * Build Device Matrix from driver.compose.json files
 * Generates JSON and CSV exports of all supported devices
 * 
 * Output:
 * - matrix/devices.json - Full device list with metadata
 * - matrix/devices.csv - CSV export for spreadsheets
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const OUT_DIR = path.join(__dirname, '..', 'matrix');

// Ensure output directory exists
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Recursively walk directory and find all driver.compose.json files
 * @param {string} dir - Directory to walk
 * @param {Array} out - Output array of file paths
 * @returns {Array<string>} - Array of file paths
 */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      walk(fullPath, out);
    } else if (entry.isFile() && entry.name === 'driver.compose.json') {
      out.push(fullPath);
    }
  }
  
  return out;
}

/**
 * Convert rows to CSV format
 * @param {Array<Object>} rows - Array of row objects
 * @returns {string} - CSV string
 */
function toCsv(rows) {
  if (!rows.length) return '';
  
  const headers = Object.keys(rows[0]);
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  
  const csvRows = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ];
  
  return csvRows.join('\n');
}

// Main execution
try {
  console.log('🔍 Scanning drivers directory...');
  const files = walk(DRIVERS_DIR);
  console.log(`   Found ${files.length} driver.compose.json files`);
  
  const rows = [];
  let errors = 0;
  
  for (const file of files) {
    try {
      const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
      const fp = compose.zigbee?.fingerprint || compose.fingerprint || {};
      const driverName = path.basename(path.dirname(file));
      
      // Extract manufacturer names (can be array or string)
      let manufacturerNames = fp.manufacturerName || [];
      if (typeof manufacturerNames === 'string') {
        manufacturerNames = [manufacturerNames];
      }
      
      // Extract product IDs (can be array or string)
      let productIds = fp.productId || [];
      if (typeof productIds === 'string') {
        productIds = [productIds];
      }
      
      rows.push({
        driver: driverName,
        name: compose.name?.en || driverName,
        class: compose.class || '',
        category: compose.category || '',
        manufacturerNames: manufacturerNames.join(', '),
        productIds: productIds.join(', '),
        capabilities: (compose.capabilities || []).join('|'),
        batteries: (compose.energy?.batteries || []).join(', '),
        connectivity: (compose.connectivity || []).join(', '),
        platforms: (compose.platforms || []).join(', ')
      });
    } catch (e) {
      console.error(`   ❌ Failed parsing ${file}: ${e.message}`);
      errors++;
    }
  }
  
  // Write JSON
  const jsonPath = path.join(OUT_DIR, 'devices.json');
  fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2));
  console.log(`✅ Exported JSON: ${jsonPath} (${rows.length} devices)`);
  
  // Write CSV
  const csvPath = path.join(OUT_DIR, 'devices.csv');
  fs.writeFileSync(csvPath, toCsv(rows));
  console.log(`✅ Exported CSV: ${csvPath} (${rows.length} devices)`);
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total devices: ${rows.length}`);
  console.log(`   Parse errors: ${errors}`);
  console.log(`   Success rate: ${((rows.length / files.length) * 100).toFixed(1)}%`);
  
  if (errors > 0) {
    console.log('\n⚠️  Some drivers failed to parse. Check errors above.');
    process.exit(1);
  }
  
  process.exit(0);
  
} catch (error) {
  console.error('❌ Matrix generation failed:', error);
  process.exit(1);
}
