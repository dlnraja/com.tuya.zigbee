#!/usr/bin/env node
// ============================================================================
// STRICT COHERENCE FIX - Suppression stricte des IDs incohérents
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');

// IDs VALIDES STRICTS PAR TYPE
const STRICT_VALID_IDS = {
  plug: ['TS011F', 'TS0121', '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZ3000_cphmq0q7'],
  switch: ['TS0001', 'TS0011', 'TS0012', 'TS0013', 'TS0014', '_TZ3000_qzjcsmar', '_TZ3000_ji4araar'],
  motion: ['TS0202', '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_mcxw5ehu'],
  contact: ['TS0203', '_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_4uuaja4a'],
  climate: ['TS0201', 'TS0601', '_TZE200_cwbvmsar', '_TZE200_bjawzodf', '_TZ3000_fllyghyj'],
  lighting: ['TS0505', 'TS0502', 'TS0505B', 'TS0502B', 'TS0504B', '_TZ3000_odygigth', '_TZ3000_dbou1ap4'],
  safety: ['TS0205', '_TZE200_m9skfctm'],
  curtain: ['TS130F', '_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZE200_zpzndjez'],
  button: ['TS0041', 'TS0042', 'TS0043', 'TS0044', '_TZ3000_tk3s5tyg']
};

const report = { fixed: 0, details: [] };

console.log('🔧 STRICT COHERENCE FIX\n');

function detectType(name) {
  const n = name.toLowerCase();
  if (n.includes('plug') || n.includes('socket') || n.includes('energy')) return 'plug';
  if (n.includes('switch') || n.includes('gang') || n.includes('relay')) return 'switch';
  if (n.includes('motion') || n.includes('pir')) return 'motion';
  if (n.includes('contact') || n.includes('door') || n.includes('window')) return 'contact';
  if (n.includes('temp') || n.includes('climate') || n.includes('humidity')) return 'climate';
  if (n.includes('light') || n.includes('bulb') || n.includes('led')) return 'lighting';
  if (n.includes('smoke') || n.includes('co') || n.includes('gas') || n.includes('leak')) return 'safety';
  if (n.includes('curtain') || n.includes('blind')) return 'curtain';
  if (n.includes('button') || n.includes('scene')) return 'button';
  return null;
}

const drivers = fs.readdirSync(driversPath)
  .filter(d => fs.statSync(path.join(driversPath, d)).isDirectory());

drivers.forEach((driverName, index) => {
  const composeFile = path.join(driversPath, driverName, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) return;
  
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  } catch (e) {
    return;
  }
  
  if (!compose.zigbee || !compose.zigbee.manufacturerName) return;
  
  const type = detectType(driverName);
  if (!type) {
    console.log(`[${index + 1}] ${driverName}: Type inconnu, skip`);
    return;
  }
  
  let currentIds = Array.isArray(compose.zigbee.manufacturerName)
    ? compose.zigbee.manufacturerName
    : [compose.zigbee.manufacturerName];
  
  const before = currentIds.length;
  
  // FILTRAGE STRICT: ne garder QUE les IDs valides pour ce type
  const validForType = STRICT_VALID_IDS[type] || [];
  const filtered = currentIds.filter(id => validForType.includes(id));
  
  // Si aucun ID valide trouvé, garder les 3 premiers originaux
  const final = filtered.length > 0 ? filtered : currentIds.slice(0, 3);
  
  if (final.length !== before) {
    compose.zigbee.manufacturerName = final;
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
    
    console.log(`[${index + 1}] ${driverName} (${type}): ${before} → ${final.length} IDs`);
    
    report.fixed++;
    report.details.push({
      driver: driverName,
      type,
      before,
      after: final.length,
      removed: before - final.length
    });
  }
});

console.log(`\n✅ ${report.fixed} drivers corrigés`);

// Version
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
  JSON.stringify({ [newVersion]: `Strict coherence: ${report.fixed} drivers with filtered IDs` }, null, 2)
);

// Git
execSync('git add -A', { cwd: rootPath, stdio: 'pipe' });
execSync(`git commit -m "🔧 Strict coherence fix v${newVersion} - ${report.fixed} drivers"`, { cwd: rootPath, stdio: 'pipe' });
execSync('git push origin master', { cwd: rootPath, stdio: 'inherit' });

console.log(`✅ Version ${newVersion} pushed`);

// Rapport
fs.writeFileSync(
  path.join(rootPath, 'references', 'reports', `STRICT_FIX_${Date.now()}.json`),
  JSON.stringify(report, null, 2)
);

console.log('🎉 TERMINÉ!\n');
