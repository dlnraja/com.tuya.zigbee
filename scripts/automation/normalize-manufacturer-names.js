#!/usr/bin/env node
'use strict';
/**
 * Normalize Manufacturer Names - v1.0.0
 * Handles case variations and fuzzy matching for Zigbee manufacturer names
 * Supports: Z2M, ZHA, Tuya, SONOFF, eWeLink, and other protocols
 * 
 * Run: node scripts/automation/normalize-manufacturer-names.js
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

/**
 * Normalize a manufacturer name for comparison
 * Handles: case variations, null characters, trailing spaces
 */
function normalizeMfr(mfr) {
  if (!mfr || typeof mfr !== 'string') return null;
  return mfr
    .toUpperCase()
    .replace(/\u0000/g, '')  // Remove null characters
    .replace(/\s+$/g, '')     // Remove trailing spaces
    .trim();
}

/**
 * Check if two manufacturer names match (case-insensitive, fuzzy)
 */
function mfrMatches(a, b) {
  const na = normalizeMfr(a);
  const nb = normalizeMfr(b);
  if (!na || !nb) return false;
  return na === nb;
}

/**
 * Generate all case variations for a _TZ* pattern
 * e.g., _TZE284_8se38w3c -> [_TZE284_8SE38W3C, _Tze284_8se38w3c, etc.]
 */
function generateCaseVariants(mfr) {
  const variants = new Set();
  
  if (mfr.startsWith('_TZ') || mfr.startsWith('_TZE') || mfr.startsWith('_TZ32')) {
    const parts = mfr.split('_');
    // Keep prefix case, vary the rest
    const prefix = parts.slice(0, 2).join('_');
    const suffix = parts.slice(2).join('_');
    
    // All uppercase
    variants.add(prefix + '_' + suffix.toUpperCase());
    // All lowercase
    variants.add(prefix.toUpperCase() + '_' + suffix.toLowerCase());
    // Original
    variants.add(mfr.toUpperCase());
  }
  
  return Array.from(variants);
}

/**
 * Check if manufacturer name is a known Zigbee pattern
 */
function isZigbeePattern(mfr) {
  if (!mfr) return false;
  const patterns = [
    /^_TZ[A-Z0-9]{3}_[a-zA-Z0-9]{4,16}$/,
    /^_TZE[A-Z0-9]{3}_[a-zA-Z0-9]{4,16}$/,
    /^_TZ32[A-Z0-9]{3}_[a-zA-Z0-9]{4,16}$/,
    /^_TYZB01_[a-zA-Z0-9]{4,16}$/,
    /^_TZ1800_[a-zA-Z0-9]{4,16}$/,
    /^_TZ2000_[a-zA-Z0-9]{4,16}$/,
    /^TUYATEC-/,
    /^ tuya$/i
  ];
  return patterns.some(p => p.test(mfr));
}

/**
 * Normalize product ID
 */
function normalizeProductId(pid) {
  if (!pid || typeof pid !== 'string') return null;
  return pid
    .replace(/\u0000/g, '')
    .replace(/\s+$/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Scan all drivers and build normalized fingerprint map
 */
function scanDrivers() {
  const driverMap = {};
  const allMfrs = new Map();  // normalized -> [original values]
  const allPids = new Map();  // normalized -> [original values]
  
  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
  });
  
  for (const driver of driverDirs) {
    const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = data.zigbee?.manufacturerName || []      ;
      const pids = data.zigbee?.productId || []      ;
      
      driverMap[driver] = { mfrs: new Set(), pids: new Set() };
      
      for (const mfr of mfrs) {
        const norm = normalizeMfr(mfr);
        if (norm) {
          driverMap[driver].mfrs.add(norm);
          if (!allMfrs.has(norm)) allMfrs.set(norm, []);
          allMfrs.get(norm).push(mfr);
        }
      }
      
      for (const pid of pids) {
        const norm = normalizeProductId(pid);
        if (norm) {
          driverMap[driver].pids.add(norm);
          if (!allPids.has(norm)) allPids.set(norm, []);
          allPids.get(norm).push(pid);
        }
      }
    } catch (e) {
      console.error('Error reading ' + driver + ': ' + e.message);
    }
  }
  
  return { driverMap, allMfrs, allPids };
}

/**
 * Find missing case variants and suggest fixes
 */
function analyze() {
  console.log('=== Manufacturer Name Normalization Analysis ===\n');
  
  const { driverMap, allMfrs, allPids } = scanDrivers();
  
  const duplicates = [];  // Same normalized value in different drivers
  const missing = [];     // Potential case variants not in drivers
  
  // Check for duplicates (same mfr in multiple drivers)
  for (const [norm, originals] of allMfrs) {
    // Count how many drivers have this normalized value
    let driverCount = 0;
    for (const [driver, data] of Object.entries(driverMap)) {
      if (data.mfrs.has(norm)) driverCount++;
    }
    
    if (driverCount > 1) {
      const drivers = Object.keys(driverMap).filter(d => driverMap[d].mfrs.has(norm));
      duplicates.push({ value: norm, originals, drivers });
    }
  }
  
  // Find case variants that might be missing
  for (const [norm, originals] of allMfrs) {
    if (isZigbeePattern(norm)) {
      // Generate potential case variant
      const parts = norm.split('_');
      if (parts.length >= 3) {
        const prefix = parts.slice(0, 2).join('_');
        const suffix = parts[2];
        const alt = prefix + '_' + suffix.toLowerCase();
        const alt2 = prefix + '_' + suffix.replace(/[A-Z]/g, c => c.toLowerCase());
        
        for (const variant of [alt, alt2]) {
          if (!allMfrs.has(variant) && variant !== norm) {
            missing.push({ 
              existing: norm, 
              suggested: variant, 
              originals,
              confidence: 95 
            });
          }
        }
      }
    }
  }
  
  console.log('=== Results ===\n');
  console.log('Total unique manufacturer names: ' + allMfrs.size);
  console.log('Total unique product IDs: ' + allPids.size);
  console.log('Cross-driver duplicates: ' + duplicates.length);
  console.log('Potential missing case variants: ' + missing.length);
  
  if (duplicates.length > 0) {
    console.log('\n### Cross-Driver Duplicates (may indicate conflicts):');
    for (const d of duplicates.slice(0, 10)) {
      console.log('  ' + d.value + ' in: ' + d.drivers.join(', '));
    }
  }
  
  if (missing.length > 0) {
    console.log('\n### Missing Case Variants (suggest adding):');
    for (const m of missing.slice(0, 20)) {
      console.log('  ' + m.existing + ' -> ' + m.suggested);
    }
  }
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    stats: {
      totalMfrs: allMfrs.size,
      totalPids: allPids.size,
      duplicates: duplicates.length,
      missingVariants: missing.length
    },
    duplicates: duplicates.slice(0, 50),
    missingVariants: missing.slice(0, 100),
    suggestions: missing.map(m => ({
      addTo: m.originals[0].startsWith('_T') ? m.originals[0].substring(0 * 8 ) + '*' : 'various',
      type: 'case_variant',
      value: m.suggested,
      reason: 'Case variant of ' + m.existing
    }))
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../../data/community-sync/case-normalization-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\nReport saved to data/community-sync/case-normalization-report.json');
  
  return report;
}

analyze();
