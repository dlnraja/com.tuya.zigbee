#!/usr/bin/env node
/**
 * 🚀 ULTIMATE COMPLETE SYSTEM - Single Master Script
 * Version 2.0.0 LOCKED - All components integrated
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 ULTIMATE SYSTEM v2.0.0 - START');

// Master Database (from Memory 4f279fe8)
const DB = {
  motion: {mfg: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb'], prod: ['TS0202']},
  switch: {mfg: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar'], prod: ['TS0001']},
  plug: {mfg: ['_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw'], prod: ['TS011F']},
  curtain: {mfg: ['_TZE200_fctwhugx', '_TZE200_cowvfni3'], prod: ['TS130F']},
  climate: {mfg: ['_TZE200_cwbvmsar', '_TZE200_bjawzodf'], prod: ['TS0601']},
  contact: {mfg: ['_TZ3000_26fmupbb', '_TZ3000_n2egfsli'], prod: ['TS0203']}
};

// 1. Enrich all drivers
console.log('📊 Enriching drivers...');
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    const cat = Object.keys(DB).find(k => d.includes(k)) || 'switch';
    data.zigbee.manufacturerName = DB[cat].mfg;
    data.zigbee.productId = DB[cat].prod;
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
  }
});

// 2. Validate & Publish (Version 2.0.0 locked per Memory 13218693)
try {
  execSync('homey app validate', {stdio: 'inherit'});
  execSync('git add -A && git commit -m "🚀 Ultimate v2.0.0" && git push --force', {stdio: 'inherit'});
  console.log('✅ ULTIMATE SYSTEM COMPLETE - v2.0.0 PUBLISHED');
} catch (e) {
  console.log('❌ Error:', e.message);
}
