#!/usr/bin/env node
/**
 * 🚀 ULTIMATE MASTER SCRIPT - Complete System Orchestrator
 * Node.js based - Homey SDK3 compatible - Version 2.0.0 LOCKED
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ULTIMATE MASTER SYSTEM - START v2.0.0');

// 1. REFERENTIALS DATABASE
const MASTER_DB = {
  motion: {mfg: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb'], prod: ['TS0202'], folder: 'motion_sensor_advanced'},
  switch: {mfg: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar'], prod: ['TS0001', 'TS0011'], folder: 'smart_switch'},
  plug: {mfg: ['_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw'], prod: ['TS011F'], folder: 'smart_plug_advanced'},
  curtain: {mfg: ['_TZE200_fctwhugx', '_TZE200_cowvfni3'], prod: ['TS130F'], folder: 'curtain_motor'},
  climate: {mfg: ['_TZE200_cwbvmsar', '_TZE200_bjawzodf'], prod: ['TS0601'], folder: 'climate_sensor'},
  contact: {mfg: ['_TZ3000_26fmupbb', '_TZ3000_n2egfsli'], prod: ['TS0203'], folder: 'contact_sensor'}
};

// 2. ENRICH ALL DRIVERS
function enrichDrivers() {
  console.log('📊 Enriching all drivers...');
  fs.readdirSync('./drivers').forEach(driverName => {
    const composePath = `./drivers/${driverName}/driver.compose.json`;
    if (fs.existsSync(composePath)) {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const category = Object.keys(MASTER_DB).find(k => driverName.includes(k)) || 'switch';
      
      data.zigbee.manufacturerName = MASTER_DB[category].mfg;
      data.zigbee.productId = MASTER_DB[category].prod;
      
      fs.writeFileSync(composePath, JSON.stringify(data, null, 2));
    }
  });
  console.log('✅ Drivers enriched');
}

// 3. VALIDATE & PUBLISH
function validateAndPublish() {
  console.log('🔍 Validating...');
  try {
    execSync('homey app validate', {stdio: 'inherit'});
    console.log('✅ Validation successful');
    
    execSync('git add -A && git commit -m "🚀 Ultimate system v2.0.0" && git push --force origin master', {stdio: 'inherit'});
    console.log('✅ Published to GitHub');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// 4. MASTER ORCHESTRATION
async function runUltimateSystem() {
  enrichDrivers();
  validateAndPublish();
  console.log('🎉 ULTIMATE SYSTEM COMPLETE');
}

// RUN ULTIMATE SYSTEM
runUltimateSystem();
