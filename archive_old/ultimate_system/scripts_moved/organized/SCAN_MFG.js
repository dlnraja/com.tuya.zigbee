#!/usr/bin/env node
// 🔍 SCAN MFG v2.0.0 - Scan complet manufacturer names
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 SCAN MFG v2.0.0');

// 1. Scan tous commits
const commits = execSync('git log --oneline --all', {encoding: 'utf8'}).split('\n');
const mfgSet = new Set();

commits.forEach(c => {
  const mfgs = c.match(/_TZ[E0-9A-Z_]+/g) || [];
  mfgs.forEach(m => mfgSet.add(m));
});

// 2. Base enrichie manufacturer
const MEGA_MFG_DB = {
  motion: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZE200_3towulqd', '_TZ3000_mcxw5ehu'],
  switch: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar', '_TZE284_aao6qtcs', '_TZ3000_fllyghyj'],
  plug: ['_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZE284_cjbofhxw'],
  climate: ['_TZE200_cwbvmsar', '_TZE200_bjawzodf', '_TZE200_locansqn'],
  curtain: ['_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZE284_khkk23xi'],
  contact: ['_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZE284_9cxrt8gp'],
  dimmer: ['_TZ3000_rdz06uge', '_TZE284_rccgwzz8'],
  light: ['_TZ3000_msl6wxk9', '_TZE284_98z4zhra']
};

// 3. Enrichissement drivers
let enriched = 0;
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    const cat = Object.keys(MEGA_MFG_DB).find(c => d.includes(c)) || 'switch';
    data.zigbee.manufacturerName = MEGA_MFG_DB[cat];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
    enriched++;
  }
});

// 4. Sauvegarde
fs.writeFileSync('./references/mega_manufacturer_db.json', JSON.stringify({
  discovered: Array.from(mfgSet),
  categorized: MEGA_MFG_DB,
  totalCommits: commits.length,
  enrichedDrivers: enriched
}, null, 2));

console.log(`✅ Enrichi ${enriched} drivers avec ${mfgSet.size} manufacturer IDs`);
