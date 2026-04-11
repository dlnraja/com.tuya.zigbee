'use strict';
/**
 * ANTI-GENERIC AUDIT SCRIPT v5.5.779
 * 
 * Ensures NO device ever pairs as "zigbee generic" if it can belong to this app.
 * 
 * CHECKS:
 * 1. Every driver has manufacturerName defined
 * 2. universal_fallback is permissive (70+ prefixes)
 * 3. No driver blocks pairing with hard cluster requirements
 * 4. No throw/reject in onNodeInit that could block pairing
 * 5. manufacturerName multi-driver conflicts (same mfr+pid in multiple drivers)
 */
const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(__dirname, '../../drivers');

let total = 0, safe = 0, risky = 0, critical = 0;
const mfrPidMap = new Map(); // Track manufacturerName+productId collisions

console.log('=== ANTI-GENERIC AUDIT v5.5.779 ===\n');

// Phase 1: Check driver configs
console.log('📋 PHASE 1: Driver Configuration Audit\n');

fs.readdirSync(DRIVERS).forEach(d => {
  const cf = path.join(DRIVERS, d, 'driver.compose.json');
  if (!fs.existsSync(cf)) return;
  total++;
  
  const c = JSON.parse(fs.readFileSync(cf));
  const mfr = c.zigbee?.manufacturerName || [];
  const pid = c.zigbee?.productId || [];
  const endpoints = c.zigbee?.endpoints || {};
  
  let status = '✅';
  let issues = [];
  
  // Check 1: Must have manufacturerName
  if (mfr.length === 0) { 
    issues.push('NO_MFR'); 
    status = '❌'; 
  }
  
  // Check 2: No fake/generic manufacturerNames
  if (mfr.some(m => m.toLowerCase().includes('generic'))) { 
    issues.push('FAKE_MFR'); 
    status = '⚠️'; 
  }
  
  // Check 3: universal_fallback must be very permissive
  if (d === 'universal_fallback') {
    if (mfr.length < 50) { 
      issues.push(`FALLBACK_NEEDS_MORE_MFR(${mfr.length}/50+)`); 
      status = '⚠️'; 
    }
    // Check for essential prefixes
    const essentialPrefixes = ['_TZ', '_TZE', '_TYZB', 'TS', 'TUYATEC', 'Tuya'];
    const missing = essentialPrefixes.filter(p => !mfr.some(m => m.startsWith(p) || m === p));
    if (missing.length > 0) {
      issues.push(`FALLBACK_MISSING_PREFIXES(${missing.join(',')})`);
      status = '❌';
    }
  }
  
  // Check 4: Endpoints shouldn't require too many clusters at pairing
  for (const [epId, ep] of Object.entries(endpoints)) {
    const clusters = ep.clusters || [];
    // Only cluster 0 (basic) should be truly required
    if (clusters.length > 10 && !clusters.includes(0)) {
      issues.push(`EP${epId}_MISSING_BASIC_CLUSTER`);
      status = '⚠️';
    }
  }
  
  // Track mfr+pid for collision detection
  mfr.forEach(m => {
    pid.forEach(p => {
      const key = `${m.toLowerCase()}|${p.toLowerCase()}`;
      if (!mfrPidMap.has(key)) mfrPidMap.set(key, []);
      mfrPidMap.get(key).push(d);
    });
  });
  
  if (status === '✅') safe++;
  else if (status === '⚠️') risky++;
  else critical++;
  
  if (issues.length) console.log(`${status} ${d}: ${issues.join(', ')}`);
});

// Phase 2: Check for mfr+pid collisions
console.log('\n📋 PHASE 2: ManufacturerName + ProductId Collision Check\n');

let collisions = 0;
mfrPidMap.forEach((drivers, key) => {
  if (drivers.length > 1) {
    // Filter out universal_fallback - it's expected to overlap
    const nonFallback = drivers.filter(d => d !== 'universal_fallback');
    if (nonFallback.length > 1) {
      console.log(`⚠️ COLLISION: ${key} → ${nonFallback.join(', ')}`);
      collisions++;
    }
  }
});

if (collisions === 0) {
  console.log('✅ No problematic collisions found');
}

// Phase 3: Check device.js for blocking throws in onNodeInit
console.log('\n📋 PHASE 3: Pairing-Blocking Code Check\n');

let blockingDrivers = 0;
fs.readdirSync(DRIVERS).forEach(d => {
  const deviceJs = path.join(DRIVERS, d, 'device.js');
  if (!fs.existsSync(deviceJs)) return;
  
  const content = fs.readFileSync(deviceJs, 'utf8');
  
  // Find onNodeInit method and check for immediate throws
  const onNodeInitMatch = content.match(/async\s+onNodeInit\s*\([^)]*\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s);
  if (onNodeInitMatch) {
    const initBody = onNodeInitMatch[1];
    // Check for throws before any try-catch
    const lines = initBody.split('\n').slice(0, 30); // First 30 lines
    for (const line of lines) {
      if (line.includes('throw') && !line.includes('try') && !line.includes('catch')) {
        // Check if it's a real throw, not in a comment
        if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
          console.log(`⚠️ ${d}: Potential blocking throw in onNodeInit`);
          blockingDrivers++;
          break;
        }
      }
    }
  }
});

if (blockingDrivers === 0) {
  console.log('✅ No blocking throws found in onNodeInit');
}

// Summary
console.log('\n=== AUDIT COMPLETE ===');
console.log(`Total Drivers: ${total}`);
console.log(`Safe: ${safe} | Risky: ${risky} | Critical: ${critical}`);
console.log(`MFR+PID Collisions: ${collisions}`);
console.log(`Blocking Drivers: ${blockingDrivers}`);

const score = Math.round((safe / total) * 100);
console.log(`\nAnti-Generic Score: ${score}%`);

if (score >= 95) {
  console.log('🎉 EXCELLENT - Almost all devices will be caught by this app!');
} else if (score >= 80) {
  console.log('✅ GOOD - Most devices will be caught, minor improvements needed');
} else if (score >= 60) {
  console.log('⚠️ NEEDS WORK - Some devices may fall to zigbee generic');
} else {
  console.log('❌ CRITICAL - Many devices risk falling to zigbee generic!');
}

process.exit(critical > 0 ? 1 : 0);
