#!/usr/bin/env node
'use strict';

/**
 * DETECT DRIVER OVERLAPS
 * 
 * Détecte les overlaps de manufacturer IDs et product IDs entre drivers
 * pour éviter les problèmes de wrong driver detection
 * 
 * Usage: node scripts/automation/detect-driver-overlaps.js
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

console.log('🔍 DETECTION DRIVER OVERLAPS\n');

// Lire tous les drivers
const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory())
  .filter(d => !d.startsWith('.'));

console.log(`📊 ${drivers.length} drivers trouvés\n`);

// Parser driver.compose.json
const driverData = [];
for (const driverName of drivers) {
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  ${driverName}: pas de driver.compose.json`);
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    const manufacturerNames = compose.zigbee?.manufacturerName || [];
    const productIds = compose.zigbee?.productId || [];
    const capabilities = compose.capabilities || [];
    
    driverData.push({
      name: driverName,
      displayName: compose.name?.en || driverName,
      class: compose.class || 'unknown',
      manufacturerNames,
      productIds,
      capabilities
    });
  } catch (err) {
    console.log(`❌ ${driverName}: Error parsing - ${err.message}`);
  }
}

console.log(`✅ ${driverData.length} drivers parsés\n`);

// Détecter overlaps manufacturer IDs
console.log('═'.repeat(80));
console.log('🔍 MANUFACTURER ID OVERLAPS');
console.log('═'.repeat(80) + '\n');

const manuIdMap = new Map();
for (const driver of driverData) {
  for (const manuId of driver.manufacturerNames) {
    if (!manuIdMap.has(manuId)) {
      manuIdMap.set(manuId, []);
    }
    manuIdMap.get(manuId).push(driver.name);
  }
}

const manuOverlaps = [];
for (const [manuId, drivers] of manuIdMap.entries()) {
  if (drivers.length > 1) {
    manuOverlaps.push({ id: manuId, drivers });
  }
}

if (manuOverlaps.length === 0) {
  console.log('✅ Aucun overlap manufacturer ID détecté\n');
} else {
  console.log(`⚠️  ${manuOverlaps.length} manufacturer IDs partagés entre drivers:\n`);
  
  for (const overlap of manuOverlaps.slice(0, 20)) { // Top 20
    console.log(`📌 ${overlap.id}:`);
    console.log(`   Drivers: ${overlap.drivers.join(', ')}`);
    console.log();
  }
  
  if (manuOverlaps.length > 20) {
    console.log(`   ... et ${manuOverlaps.length - 20} autres\n`);
  }
}

// Détecter overlaps product IDs
console.log('═'.repeat(80));
console.log('🔍 PRODUCT ID OVERLAPS');
console.log('═'.repeat(80) + '\n');

const prodIdMap = new Map();
for (const driver of driverData) {
  for (const prodId of driver.productIds) {
    if (!prodIdMap.has(prodId)) {
      prodIdMap.set(prodId, []);
    }
    prodIdMap.get(prodId).push(driver.name);
  }
}

const prodOverlaps = [];
for (const [prodId, drivers] of prodIdMap.entries()) {
  if (drivers.length > 1) {
    prodOverlaps.push({ id: prodId, drivers });
  }
}

if (prodOverlaps.length === 0) {
  console.log('✅ Aucun overlap product ID détecté\n');
} else {
  console.log(`⚠️  ${prodOverlaps.length} product IDs partagés entre drivers:\n`);
  
  for (const overlap of prodOverlaps.slice(0, 20)) { // Top 20
    console.log(`📌 ${overlap.id}:`);
    console.log(`   Drivers: ${overlap.drivers.join(', ')}`);
    console.log();
  }
  
  if (prodOverlaps.length > 20) {
    console.log(`   ... et ${prodOverlaps.length - 20} autres\n`);
  }
}

// Détecter overlaps critiques (même manu + même prod)
console.log('═'.repeat(80));
console.log('🚨 CRITICAL OVERLAPS (Manufacturer + Product ID)');
console.log('═'.repeat(80) + '\n');

const criticalOverlaps = [];

for (let i = 0; i < driverData.length; i++) {
  for (let j = i + 1; j < driverData.length; j++) {
    const driver1 = driverData[i];
    const driver2 = driverData[j];
    
    // Trouver overlaps manufacturer
    const manuOverlap = driver1.manufacturerNames.filter(m => 
      driver2.manufacturerNames.includes(m)
    );
    
    // Trouver overlaps product
    const prodOverlap = driver1.productIds.filter(p => 
      driver2.productIds.includes(p)
    );
    
    if (manuOverlap.length > 0 && prodOverlap.length > 0) {
      criticalOverlaps.push({
        driver1: driver1.name,
        driver2: driver2.name,
        displayName1: driver1.displayName,
        displayName2: driver2.displayName,
        manuOverlap,
        prodOverlap
      });
    }
  }
}

if (criticalOverlaps.length === 0) {
  console.log('✅ Aucun overlap critique détecté\n');
} else {
  console.log(`🚨 ${criticalOverlaps.length} overlaps CRITIQUES détectés:\n`);
  
  for (const overlap of criticalOverlaps) {
    console.log(`❌ ${overlap.displayName1} ↔ ${overlap.displayName2}`);
    console.log(`   Drivers: ${overlap.driver1} vs ${overlap.driver2}`);
    console.log(`   Manufacturer overlap (${overlap.manuOverlap.length}): ${overlap.manuOverlap.slice(0, 3).join(', ')}${overlap.manuOverlap.length > 3 ? '...' : ''}`);
    console.log(`   Product overlap (${overlap.prodOverlap.length}): ${overlap.prodOverlap.join(', ')}`);
    console.log(`   🚨 RISK: Wrong driver detection during pairing!\n`);
  }
}

// Générer rapport
const report = {
  timestamp: new Date().toISOString(),
  driversAnalyzed: driverData.length,
  manufacturerIdOverlaps: manuOverlaps.length,
  productIdOverlaps: prodOverlaps.length,
  criticalOverlaps: criticalOverlaps.length,
  overlaps: {
    manufacturer: manuOverlaps,
    product: prodOverlaps,
    critical: criticalOverlaps
  }
};

const reportPath = path.join(__dirname, '../../docs/reports/driver-overlaps-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('═'.repeat(80));
console.log('📊 SUMMARY');
console.log('═'.repeat(80));
console.log(`Drivers analyzed:       ${driverData.length}`);
console.log(`Manufacturer overlaps:  ${manuOverlaps.length}`);
console.log(`Product ID overlaps:    ${prodOverlaps.length}`);
console.log(`🚨 Critical overlaps:   ${criticalOverlaps.length}`);
console.log();
console.log(`Report: ${reportPath}`);
console.log('═'.repeat(80));

if (criticalOverlaps.length > 0) {
  console.log('\n⚠️  ACTION REQUIRED: Fix critical overlaps to prevent wrong driver detection!');
  process.exit(1);
} else {
  console.log('\n✅ No critical overlaps detected');
  process.exit(0);
}
