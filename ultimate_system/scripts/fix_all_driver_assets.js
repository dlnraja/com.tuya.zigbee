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

const COLORS = [
  { r: 30, g: 136, b: 229, a: 255 },   // Blue
  { r: 76, g: 175, b: 80, a: 255 },    // Green
  { r: 255, g: 152, b: 0, a: 255 },    // Orange
  { r: 156, g: 39, b: 176, a: 255 },   // Purple
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getColorForDriver(index) {
  return COLORS[index % COLORS.length];
}

function fixDriverAssets(driverName, index) {
  const driverDir = path.join(DRIVERS_DIR, driverName);
  const assetsDir = path.join(driverDir, 'assets');
  
  const smallPath = path.join(assetsDir, 'small.png');
  const largePath = path.join(assetsDir, 'large.png');
  
  const color = getColorForDriver(index);
  let fixed = 0;
  
  ensureDir(assetsDir);
  
  
  try {
    // Generate 75x75 small.png
    const { execSync } = require('child_process');
    const genScript = path.join(ROOT, 'ultimate_system', 'scripts', 'generate_placeholder_png.js');
    execSync(`node "${genScript}" --width 75 --height 75 --color "#1E88E5" --output "${smallPath}"`, { cwd: ROOT });
    fixed++;
    
    // Generate 500x500 large.png
    execSync(`node "${genScript}" --width 500 --height 500 --color "#1E88E5" --output "${largePath}"`, { cwd: ROOT });
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
