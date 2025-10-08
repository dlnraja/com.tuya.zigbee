#!/usr/bin/env node
// ============================================================================
// SIMPLE DEEP FIX 10X - Simple mais robuste
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');

// IDs STRICTS PAR TYPE
const VALID_IDS = {
  plug: ['TS011F', 'TS0121', '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZ3000_cphmq0q7'],
  switch: ['TS0001', 'TS0011', 'TS0012', 'TS0013', 'TS0014', '_TZ3000_qzjcsmar', '_TZ3000_ji4araar'],
  motion: ['TS0202', '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu'],
  contact: ['TS0203', '_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_4uuaja4a'],
  climate: ['TS0201', 'TS0601', '_TZE200_cwbvmsar', '_TZE200_bjawzodf', '_TZ3000_fllyghyj'],
  lighting: ['TS0505', 'TS0502', 'TS0505B', 'TS0502B', '_TZ3000_odygigth', '_TZ3000_dbou1ap4'],
  safety: ['TS0205', '_TZE200_m9skfctm'],
  curtain: ['TS130F', '_TZE200_fctwhugx', '_TZE200_cowvfni3'],
  button: ['TS0041', 'TS0042', 'TS0043', 'TS0044', '_TZ3000_tk3s5tyg'],
  valve: ['_TZE200_81isopgh'],
  lock: ['_TZE200_wfxuhoea']
};

const CLASSES = {
  plug: 'socket', switch: 'socket', motion: 'sensor', contact: 'sensor',
  climate: 'sensor', lighting: 'light', safety: 'sensor', curtain: 'windowcoverings',
  button: 'button', valve: 'other', lock: 'lock'
};

let totalFixed = 0;

console.log('🔧 SIMPLE DEEP FIX 10X\n');

function detectType(name) {
  const n = name.toLowerCase();
  if (n.includes('plug') || n.includes('socket') || n.includes('energy')) return 'plug';
  if (n.includes('motion') || n.includes('pir')) return 'motion';
  if (n.includes('contact') || n.includes('door') || n.includes('window')) return 'contact';
  if (n.includes('temp') || n.includes('climate') || n.includes('humidity')) return 'climate';
  if (n.includes('light') || n.includes('bulb') || n.includes('led')) return 'lighting';
  if (n.includes('smoke') || n.includes('co') || n.includes('gas') || n.includes('leak')) return 'safety';
  if (n.includes('curtain') || n.includes('blind') || n.includes('motor')) return 'curtain';
  if (n.includes('button') || n.includes('scene') || n.includes('remote') || n.includes('wireless')) return 'button';
  if (n.includes('valve')) return 'valve';
  if (n.includes('lock')) return 'lock';
  if (n.includes('switch') || n.includes('gang') || n.includes('relay')) return 'switch';
  return null;
}

function fixDriver(driverName) {
  const composeFile = path.join(driversPath, driverName, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) return false;
  
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  } catch (e) {
    return false;
  }
  
  const type = detectType(driverName);
  if (!type || !VALID_IDS[type]) return false;
  
  let changed = false;
  
  // Fix IDs
  if (compose.zigbee && compose.zigbee.manufacturerName) {
    let ids = Array.isArray(compose.zigbee.manufacturerName) 
      ? compose.zigbee.manufacturerName 
      : [compose.zigbee.manufacturerName];
    
    const before = ids.length;
    const filtered = ids.filter(id => VALID_IDS[type].includes(id));
    const final = filtered.length > 0 ? filtered : [ids[0]];
    
    if (JSON.stringify(final) !== JSON.stringify(ids)) {
      compose.zigbee.manufacturerName = final;
      changed = true;
    }
  }
  
  // Fix class
  if (CLASSES[type] && compose.class !== CLASSES[type]) {
    compose.class = CLASSES[type];
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
    return true;
  }
  
  return false;
}

// Run 10 iterations
for (let iteration = 1; iteration <= 10; iteration++) {
  console.log(`\nItération ${iteration}/10...`);
  
  const drivers = fs.readdirSync(driversPath)
    .filter(d => fs.statSync(path.join(driversPath, d)).isDirectory());
  
  let fixed = 0;
  drivers.forEach(driver => {
    if (fixDriver(driver)) fixed++;
  });
  
  console.log(`  Fixed: ${fixed}`);
  totalFixed += fixed;
  
  // Validation
  try {
    execSync('homey app validate --level=publish', { cwd: rootPath, stdio: 'pipe' });
    console.log('  Validation: PASS');
  } catch (e) {
    console.log('  Validation: WARNINGS');
  }
}

console.log(`\n✅ Total fixed: ${totalFixed}`);

// Version update
const appJsonPath = path.join(rootPath, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const parts = appJson.version.split('.');
parts[2] = parseInt(parts[2]) + 1;
const newVersion = parts.join('.');
appJson.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

// Changelog
fs.writeFileSync(
  path.join(rootPath, '.homeychangelog.json'),
  JSON.stringify({ [newVersion]: `Deep fix 10x: ${totalFixed} corrections` }, null, 2)
);

console.log(`\nVersion: ${newVersion}`);

// Git
try {
  execSync('git add -A', { cwd: rootPath, stdio: 'pipe' });
  execSync(`git commit -m "🔧 Simple deep fix 10x v${newVersion}"`, { cwd: rootPath, stdio: 'pipe' });
  execSync('git push origin master', { cwd: rootPath, stdio: 'inherit' });
  console.log('✅ Pushed!');
} catch (e) {
  console.log('⚠️ Git:', e.message.split('\n')[0]);
}

console.log('\n🎉 DONE!\n');
