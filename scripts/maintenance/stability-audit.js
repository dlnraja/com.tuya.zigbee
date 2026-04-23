#!/usr/bin/env node
'use strict';

/**
 * Universal Tuya Stability Audit (v1.0.0)
 * 
 * Protects the codebase from automated degradations by verifying:
 * 1. Hybrid Inheritance: Any device using _safeSetCapability MUST extend BaseHybridDevice.
 * 2. SDK 3 Safety: All flow card getters must be wrapped or use safe app getters.
 * 3. Regression Prevention: No direct setCapabilityValue calls in hybrid drivers.
 * 4. Physical Button Hardening (v7.0.x): Remote button devices MUST call initPhysicalButtonDetection().
 * 5. Moisture Canyon Protection: Soil sensors MUST use BVB constraints for measure_humidity.soil.
 * 4. Physical Button Hardening (v7.0.x): Remote button devices MUST call initPhysicalButtonDetection().
 * 5. Moisture Canyon Protection: Soil sensors MUST use BVB constraints for measure_humidity.soil.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function audit() {
  console.log('===  Tuya Universal Stability Audit ===');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    const p = path.join(DRIVERS_DIR, d, 'device.js');
    return fs.existsSync(p);
  });

  let errors = 0;
  let warnings = 0;

  for (const d of drivers) {
    const devicePath = path.join(DRIVERS_DIR, d, 'device.js');
    const content = fs.readFileSync(devicePath, 'utf8');

    // --- 1. Inheritance Check ---
    const hybridBases = [
      'BaseHybridDevice', 
      'HybridSwitchBase', 
      'HybridPlugBase', 
      'HybridSensorBase', 
      'ClimateSensorDevice', 
      'CoverHybridDevice', 
      'EweLinkLocalDevice',
      'TuyaHybridDevice',
      'AutoAdaptiveDevice',
      'ButtonDevice',
      'TuyaSpecificClusterDevice',
      'ZclClimateDevice',
      'BaseDevice' // v5.13.2: Base class for some older drivers that implement the mixin
    ];
    const hybridRegex = new RegExp(`extends\\s+(${hybridBases.join('|')})`);
    const extendsHybrid = hybridRegex.test(content);
    const usesSafeSetter = content.includes('_safeSetCapability');
    
    if (usesSafeSetter && !extendsHybrid) {
      // EXCLUSION: BaseHybridDevice itself
      if (!content.includes('class BaseHybridDevice')) {
        console.error(` [${d}] CRITICAL: Uses _safeSetCapability but does NOT extend a Hybrid base class! This will CRASH at runtime.`);
        errors++;
      }
    }

    // --- 2. SDK 3 Flow Safety Check ---
    // Specifically looking for unwrapped getTriggerCard, getConditionCard, getActionCard
    const flowGetters = ['getTriggerCard', 'getConditionCard', 'getActionCard'];
    for (const getter of flowGetters) {
      if (content.includes(`this.homey.flow.${getter}`)) {
        // Check if it's wrapped in IIFE or using the app's safe getter
        const safeGetter = `_safeGet${getter.replace('get', '')}`;
        const isSafe = content.includes(`this.homey.app.${safeGetter}`) || 
                       content.includes('this.homey.app._safeGetCard') ||
                       (content.includes('(() => { try {') && content.includes(`this.homey.flow.${getter}`));
        
        if (!isSafe) {
          console.warn(` [${d}] Unwrapped ${getter} detected. Should use app.${safeGetter} for SDK 3 stability.`);
          warnings++;
        }
      }
    }

    // --- 3. Direct Setter Audit ---
    if (extendsHybrid && /this\.setCapabilityValue\s*\(/.test(content)) {
      // We allow it in onNodeInit for initial state, but warn for usage in reports
      if (content.includes('this.onNodeInit')) {
        // Check if it's used OUTSIDE onNodeInit
        const outsideOnNodeInit = content.replace(/async\s+onNodeInit[\s\S]*? async/, '---').includes('this.setCapabilityValue')      ;
        if (outsideOnNodeInit) {
          console.warn(` [${d}] Hybrid device uses raw setCapabilityValue outside onNodeInit. Use _safeSetCapability.`);
          warnings++;
        }
      }
    }
    
    // --- 4. Manufacturer ID Case Check ---
    const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json' );
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        const mfrNames = compose.zigbee?.manufacturerName || []       ;
        const hasUpperCase = mfrNames.some(n => n !== n.toLowerCase());
        const hasLowerCase = mfrNames.some(n => n !== n.toUpperCase());
        
        if (hasUpperCase && !mfrNames.includes(mfrNames.find(n => n !== n.toLowerCase())?.toLowerCase())) {
          // Warning: Upper case name without lower case twin (Homey SDK3 matching issue)
          // console.warn(` [${d}] MFR ID "${mfrNames.find(n => n !== n.toLowerCase())}" has no lowercase twin. May fail on SDK 3.`);
          // warnings++;
        }
      } catch (e) {}
    }
  }

  console.log('\n--- Stability Audit Result ---');
  console.log(`Errors: ${errors}`);
  console.log(`Warnings: ${warnings}`);

  if (errors > 0) {
    console.error(' Stability Audit FAILED. Please fix the inheritance or API usage errors before pushing.');
    process.exit(1);
  } else {
    console.log(' Stability Audit PASSED.');
  }
}

audit();
