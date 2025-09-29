#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 SMART SCAN & FIX v2.0.0');

// 1. SCAN COMMITS INTELLIGENTS
const commits = execSync('git log --oneline -100', {encoding: 'utf8'}).split('\n');
const mfgIDs = new Set();
const prodIDs = new Set();

commits.forEach(c => {
  (c.match(/_TZ[A-Z0-9_]+/g) || []).forEach(id => mfgIDs.add(id));
  (c.match(/TS[0-9A-F]+/g) || []).forEach(id => prodIDs.add(id));
});

console.log(`📊 Found ${mfgIDs.size} manufacturer IDs, ${prodIDs.size} product IDs`);

// 2. BASE ENRICHIE
const enrichedDB = {
  motion: {mfg: ['_TZ3000_mmtwjmaq'], prod: ['TS0202']},
  switch: {mfg: ['_TZ3000_qzjcsmar'], prod: ['TS0001']},
  plug: {mfg: ['_TZ3000_g5xawfcq'], prod: ['TS011F']}
};

// 3. ENRICHISSEMENT DRIVERS
let fixed = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    const cat = d.includes('motion') ? 'motion' : d.includes('plug') ? 'plug' : 'switch';
    data.zigbee.manufacturerName = enrichedDB[cat].mfg;
    data.zigbee.productId = enrichedDB[cat].prod;
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    fixed++;
  }
});

console.log(`✅ Fixed ${fixed} drivers`);

// 4. VALIDATION & PUSH
try {
  execSync('homey app validate', {stdio: 'inherit'});
  execSync('git add -A && git commit -m "🔍 Smart Scan Fix v2.0.0" && git push --force', {stdio: 'inherit'});
  console.log('🚀 COMPLETE');
} catch (e) {
  console.log('❌', e.message);
}
