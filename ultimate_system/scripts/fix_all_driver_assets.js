#!/usr/bin/env node
/*
 * fix_all_driver_assets.js
 * --------------------------------------------------------------
 * Ensures all driver assets (images) meet Homey requirements.
 * Generates missing 75x75 small.png and 500x500 large.png files.
 */

const fs = require('fs');
const path = require('path');
const pngGenerator = require('./generate_placeholder_png.js');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Category-to-color mapping (SDK3 store consistency)
// light -> Amber, sensor -> Green, socket -> Blue, lock -> Purple, other -> Blue Grey, default -> Teal
const CLASS_COLOR_HEX = {
  light: '#FFC107',
  sensor: '#4CAF50',
  socket: '#2196F3',
  lock: '#9C27B0',
  other: '#607D8B',
};
const DEFAULT_COLOR_HEX = '#009688';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getDriverClass(driverName) {
  try {
    const manifestPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(manifestPath)) return null;
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return typeof m.class === 'string' ? m.class : null;
  } catch { return null; }
}

function colorForClassHex(driverClass) {
  if (!driverClass) return DEFAULT_COLOR_HEX;
  return CLASS_COLOR_HEX[driverClass] || DEFAULT_COLOR_HEX;
}

function fixDriverAssets(driverName, index) {
  const driverDir = path.join(DRIVERS_DIR, driverName);
  const assetsDir = path.join(driverDir, 'assets');
  
  const smallPath = path.join(assetsDir, 'small.png');
  const largePath = path.join(assetsDir, 'large.png');
  
  const driverClass = getDriverClass(driverName);
  const colorHex = colorForClassHex(driverClass);
  let fixed = 0;
  
  ensureDir(assetsDir);
  
  
  try {
    // Generate 75x75 small.png
    const { execSync } = require('child_process');
    const genScript = path.join(ROOT, 'ultimate_system', 'scripts', 'generate_placeholder_png.js');
    execSync(`node "${genScript}" --width 75 --height 75 --color "${colorHex}" --output "${smallPath}"`, { cwd: ROOT });
    fixed++;
    
    // Generate 500x500 large.png
    execSync(`node "${genScript}" --width 500 --height 500 --color "${colorHex}" --output "${largePath}"`, { cwd: ROOT });
    fixed++;
  } catch (error) {
    console.warn(`   ⚠️  ${driverName}: ${error.message}`);
  }
  
  return { driver: driverName, fixed };
}

function main() {
  console.log('🖼️  Correction complète des assets drivers');
  
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  
  console.log(`   • ${drivers.length} drivers détectés`);
  
  let totalFixed = 0;
  const results = [];
  
  drivers.forEach((driverName, index) => {
    const result = fixDriverAssets(driverName, index);
    totalFixed += result.fixed;
    results.push(result);
    
    if ((index + 1) % 20 === 0) {
      console.log(`   • Progression: ${index + 1}/${drivers.length}`);
    }
  });
  
  console.log(`\n✅ ${totalFixed} assets générés pour ${drivers.length} drivers`);
  
  const reportPath = path.join(ROOT, 'ultimate_system', 'orchestration', 'state', 'assets_fix_report.json');
  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    driversProcessed: drivers.length,
    assetsFixed: totalFixed,
    results: results.slice(0, 10),
  }, null, 2), 'utf8');
  
  console.log(`📝 Rapport: ${path.relative(ROOT, reportPath)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Échec correction assets:', error);
    process.exitCode = 1;
  }
}

module.exports = { main };
