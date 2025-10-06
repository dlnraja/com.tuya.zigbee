#!/usr/bin/env node
/**
 * AUTO REPAIR - Répare automatiquement les incohérences détectées
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const MISSING_ICONS = [
  { driver: 'comprehensive_air_monitor', copyFrom: 'air_quality_monitor' },
  { driver: 'rgb_led_controller', copyFrom: 'led_strip_controller' },
  { driver: 'scene_controller', copyFrom: 'smart_switch_1gang_ac' },
  { driver: 'smart_thermostat', copyFrom: 'thermostat' },
  { driver: 'smart_valve_controller', copyFrom: 'water_valve' }
];

console.log('🔧 AUTO REPAIR - Starting repairs...\n');

let repaired = 0;

// Repair missing icon.svg files
MISSING_ICONS.forEach(({ driver, copyFrom }) => {
  const sourcePath = path.join(DRIVERS_DIR, copyFrom, 'assets', 'icon.svg');
  const targetDir = path.join(DRIVERS_DIR, driver, 'assets');
  const targetPath = path.join(targetDir, 'icon.svg');
  
  if (!fs.existsSync(targetPath)) {
    try {
      // Ensure assets directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Copy icon
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`  ✅ ${driver}: icon.svg copied from ${copyFrom}`);
      repaired++;
      
      // Generate PNGs from SVG
      const { execSync } = require('child_process');
      const smallPath = path.join(targetDir, 'small.png');
      const largePath = path.join(targetDir, 'large.png');
      
      try {
        if (!fs.existsSync(smallPath)) {
          execSync(`magick convert "${targetPath}" -resize 75x75 -background none "${smallPath}"`, { stdio: 'ignore' });
          console.log(`     ✓ Generated small.png`);
          repaired++;
        }
        
        if (!fs.existsSync(largePath)) {
          execSync(`magick convert "${targetPath}" -resize 500x500 -background none "${largePath}"`, { stdio: 'ignore' });
          console.log(`     ✓ Generated large.png`);
          repaired++;
        }
      } catch (imgError) {
        console.log(`     ⚠️  Could not generate PNGs: ${imgError.message}`);
      }
      
    } catch (error) {
      console.log(`  ❌ ${driver}: Failed to copy icon - ${error.message}`);
    }
  } else {
    console.log(`  ℹ️  ${driver}: icon.svg already exists`);
  }
});

console.log(`\n✅ Repair complete: ${repaired} fixes applied\n`);

// Re-run coherence check
console.log('🔍 Running coherence check again...\n');
const { execSync } = require('child_process');
try {
  execSync('node tools/coherence_checker.js', { 
    cwd: ROOT, 
    stdio: 'inherit' 
  });
  console.log('\n✅ All checks passed!');
  process.exit(0);
} catch (error) {
  console.log('\n⚠️  Some issues remain');
  process.exit(1);
}
