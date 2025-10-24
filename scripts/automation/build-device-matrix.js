#!/usr/bin/env node
'use strict';

/**
 * BUILD DEVICE MATRIX
 * 
 * Génère une matrice complète de tous les devices supportés
 * Output: JSON + CSV pour transparence et CI artifacts
 * 
 * Usage: node scripts/automation/build-device-matrix.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const MATRIX_DIR = path.join(ROOT, 'matrix');

console.log('🔍 BUILD DEVICE MATRIX\n');

// Créer dossier matrix
if (!fs.existsSync(MATRIX_DIR)) {
  fs.mkdirSync(MATRIX_DIR, { recursive: true });
}

/**
 * Scan récursif pour trouver tous les driver.compose.json
 */
function walkSync(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkSync(filePath, fileList);
    } else if (file === 'driver.compose.json') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Parser un driver.compose.json
 */
function parseDriver(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const compose = JSON.parse(content);
    const driverName = path.basename(path.dirname(filePath));
    
    // Extraire infos essentielles
    const entry = {
      driverName,
      displayName: compose.name?.en || driverName,
      category: compose.class || 'other',
      capabilities: compose.capabilities || [],
      
      // Zigbee fingerprint
      manufacturerNames: compose.zigbee?.manufacturerName || [],
      productIds: compose.zigbee?.productId || [],
      
      // Metadata
      platforms: compose.platforms || [],
      connectivity: compose.connectivity || [],
      energy: compose.energy || {},
      
      // Notes
      notes: compose.notes || '',
      learnmode: compose.learnmode?.instruction?.en || ''
    };
    
    return entry;
  } catch (err) {
    console.error(`❌ Error parsing ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Convertir en CSV
 */
function toCSV(data) {
  if (data.length === 0) return '';
  
  const headers = [
    'Driver Name',
    'Display Name',
    'Category',
    'Capabilities',
    'Manufacturer IDs',
    'Product IDs',
    'Platforms',
    'Connectivity',
    'Battery Type',
    'Notes'
  ];
  
  const escape = (value) => {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${String(str).replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const rows = data.map(entry => [
    escape(entry.driverName),
    escape(entry.displayName),
    escape(entry.category),
    escape(entry.capabilities.join('|')),
    escape(entry.manufacturerNames.slice(0, 3).join('|') + (entry.manufacturerNames.length > 3 ? '...' : '')),
    escape(entry.productIds.slice(0, 3).join('|') + (entry.productIds.length > 3 ? '...' : '')),
    escape(entry.platforms.join('|')),
    escape(entry.connectivity.join('|')),
    escape(entry.energy.batteries?.join(',') || ''),
    escape(entry.notes)
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

/**
 * Générer statistiques
 */
function generateStats(data) {
  const stats = {
    totalDrivers: data.length,
    categories: {},
    capabilities: {},
    manufacturers: new Set(),
    productIds: new Set(),
    connectivity: {},
    powerSources: {
      battery: 0,
      mains: 0,
      hybrid: 0
    }
  };
  
  data.forEach(entry => {
    // Categories
    stats.categories[entry.category] = (stats.categories[entry.category] || 0) + 1;
    
    // Capabilities
    entry.capabilities.forEach(cap => {
      stats.capabilities[cap] = (stats.capabilities[cap] || 0) + 1;
    });
    
    // Manufacturers
    entry.manufacturerNames.forEach(m => stats.manufacturers.add(m));
    
    // Product IDs
    entry.productIds.forEach(p => stats.productIds.add(p));
    
    // Connectivity
    entry.connectivity.forEach(c => {
      stats.connectivity[c] = (stats.connectivity[c] || 0) + 1;
    });
    
    // Power sources
    if (entry.energy.batteries && entry.energy.batteries.length > 0) {
      if (entry.connectivity.includes('zigbee') && !entry.driverName.includes('hybrid')) {
        stats.powerSources.battery++;
      } else {
        stats.powerSources.hybrid++;
      }
    } else {
      stats.powerSources.mains++;
    }
  });
  
  return {
    ...stats,
    manufacturerCount: stats.manufacturers.size,
    productIdCount: stats.productIds.size,
    manufacturers: undefined, // Remove Set for JSON
    productIds: undefined
  };
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

console.log('📂 Scanning drivers directory...\n');

const driverFiles = walkSync(DRIVERS_DIR);
console.log(`Found ${driverFiles.length} driver.compose.json files\n`);

console.log('📊 Parsing drivers...\n');

const matrix = [];
let parsed = 0;
let errors = 0;

driverFiles.forEach(file => {
  const entry = parseDriver(file);
  if (entry) {
    matrix.push(entry);
    parsed++;
  } else {
    errors++;
  }
});

console.log(`✅ Parsed: ${parsed}`);
console.log(`❌ Errors: ${errors}\n`);

// Sort by category then name
matrix.sort((a, b) => {
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category);
  }
  return a.displayName.localeCompare(b.displayName);
});

console.log('💾 Writing JSON...');
const jsonPath = path.join(MATRIX_DIR, 'devices.json');
fs.writeFileSync(jsonPath, JSON.stringify(matrix, null, 2), 'utf8');
console.log(`   → ${jsonPath}\n`);

console.log('💾 Writing CSV...');
const csv = toCSV(matrix);
const csvPath = path.join(MATRIX_DIR, 'devices.csv');
fs.writeFileSync(csvPath, csv, 'utf8');
console.log(`   → ${csvPath}\n`);

console.log('📈 Generating statistics...');
const stats = generateStats(matrix);
const statsPath = path.join(MATRIX_DIR, 'statistics.json');
fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf8');
console.log(`   → ${statsPath}\n`);

// Display summary
console.log('=' .repeat(80));
console.log('📊 MATRIX SUMMARY');
console.log('='.repeat(80));
console.log(`Total Drivers:        ${stats.totalDrivers}`);
console.log(`Manufacturer IDs:     ${stats.manufacturerCount}`);
console.log(`Product IDs:          ${stats.productIdCount}`);
console.log();
console.log('Categories:');
Object.entries(stats.categories)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  });
console.log();
console.log('Power Sources:');
console.log(`  Battery:             ${stats.powerSources.battery}`);
console.log(`  Mains (AC):          ${stats.powerSources.mains}`);
console.log(`  Hybrid:              ${stats.powerSources.hybrid}`);
console.log();
console.log('Connectivity:');
Object.entries(stats.connectivity)
  .sort((a, b) => b[1] - a[1])
  .forEach(([conn, count]) => {
    console.log(`  ${conn.padEnd(20)} ${count}`);
  });
console.log('='.repeat(80));

console.log('\n✅ Device matrix generated successfully!');
console.log('\nFiles created:');
console.log(`  - ${jsonPath}`);
console.log(`  - ${csvPath}`);
console.log(`  - ${statsPath}`);

process.exit(0);
