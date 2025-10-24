#!/usr/bin/env node

/**
 * 🖼️ FIX ALL PNG IMAGES - SDK3 Compliant
 * 
 * Génère/Copie intelligemment les images PNG pour tous les drivers
 * - PAS de SVG (trop lourd sur SDK3)
 * - Images appropriées à la catégorie
 * - Copie depuis drivers similaires existants
 * - Génération si nécessaire
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

/**
 * Catégories et drivers de référence (qui ont de bonnes images PNG)
 */
const REFERENCE_DRIVERS = {
  motion: ['motion_sensor', 'motion_sensor_multi', 'occupancy_sensor'],
  contact: ['contact_sensor', 'contact_sensor_advanced'],
  temperature: ['climate_monitor', 'temperature_sensor'],
  switch: ['switch_wall_2gang', 'switch_basic_1gang'],
  plug: ['plug_energy_monitor', 'plug_smart'],
  dimmer: ['dimmer_wall', 'dimmer_touch_1gang'],
  bulb: ['bulb_tunable_white', 'bulb_color_temp'],
  led: ['led_controller_rgb', 'led_strip_rgb'],
  button: ['button_wireless_4', 'button_remote_4'],
  curtain: ['curtain_motor', 'shutter_motor'],
  valve: ['valve_smart', 'radiator_valve'],
  smoke: ['smoke_detector'],
  leak: ['water_leak_sensor'],
  siren: ['siren_alarm'],
  vibration: ['contact_sensor'], // Fallback to contact sensor
};

/**
 * Détecte la catégorie depuis le nom du driver
 */
function detectCategory(driverId) {
  const lower = driverId.toLowerCase();
  
  if (lower.includes('motion') || lower.includes('pir') || lower.includes('occupancy')) return 'motion';
  if (lower.includes('contact') || lower.includes('door') || lower.includes('window')) return 'contact';
  if (lower.includes('vibration') || lower.includes('shock')) return 'vibration';
  if (lower.includes('temperature') || lower.includes('temp') || lower.includes('climate') || lower.includes('thermostat')) return 'temperature';
  if (lower.includes('switch') && !lower.includes('button')) return 'switch';
  if (lower.includes('plug') || lower.includes('socket') || lower.includes('outlet')) return 'plug';
  if (lower.includes('dimmer')) return 'dimmer';
  if (lower.includes('bulb') || lower.includes('lamp')) return 'bulb';
  if (lower.includes('led') || lower.includes('strip') || lower.includes('rgb')) return 'led';
  if (lower.includes('button') || lower.includes('remote') || lower.includes('scene')) return 'button';
  if (lower.includes('curtain') || lower.includes('blind') || lower.includes('shade') || lower.includes('shutter') || lower.includes('roller')) return 'curtain';
  if (lower.includes('valve') || lower.includes('radiator')) return 'valve';
  if (lower.includes('smoke') || lower.includes('fire')) return 'smoke';
  if (lower.includes('leak') || lower.includes('water')) return 'leak';
  if (lower.includes('siren') || lower.includes('alarm')) return 'siren';
  
  return 'default';
}

/**
 * Trouve un driver de référence pour une catégorie
 */
function findReferenceDriver(category) {
  const references = REFERENCE_DRIVERS[category] || [];
  
  for (const ref of references) {
    const refPath = path.join(DRIVERS_DIR, ref, 'assets', 'images');
    if (fs.existsSync(refPath)) {
      const hasAll = ['small.png', 'large.png', 'xlarge.png'].every(img =>
        fs.existsSync(path.join(refPath, img))
      );
      if (hasAll) {
        return ref;
      }
    }
  }
  
  return null;
}

/**
 * Copie les images depuis un driver de référence
 */
function copyImagesFromReference(targetDriverId, referenceDriverId) {
  const targetPath = path.join(DRIVERS_DIR, targetDriverId, 'assets', 'images');
  const referencePath = path.join(DRIVERS_DIR, referenceDriverId, 'assets', 'images');
  
  // Create target directory
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
  
  // Copy each image
  const images = ['small.png', 'large.png', 'xlarge.png'];
  let copied = 0;
  
  for (const img of images) {
    const src = path.join(referencePath, img);
    const dest = path.join(targetPath, img);
    
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
  
  return copied;
}

/**
 * Vérifie les images PNG d'un driver
 */
function checkImages(driverId) {
  const imagesPath = path.join(DRIVERS_DIR, driverId, 'assets', 'images');
  
  if (!fs.existsSync(imagesPath)) {
    return { missing: 3, present: 0 };
  }
  
  const required = ['small.png', 'large.png', 'xlarge.png'];
  const present = required.filter(img => fs.existsSync(path.join(imagesPath, img)));
  
  return {
    missing: 3 - present.length,
    present: present.length,
  };
}

/**
 * Nettoie les SVG dans driver.compose.json et remplace par PNG
 */
function fixDriverComposeImages(driverId) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return false;
  
  try {
    let content = fs.readFileSync(composePath, 'utf8');
    let modified = false;
    
    // Replace .svg with .png in images section
    const svgPattern = /("images":\s*\{[^}]*)(\.svg)([^}]*\})/gs;
    if (svgPattern.test(content)) {
      content = content.replace(/\.svg/g, '.png');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(composePath, content, 'utf8');
      return true;
    }
  } catch (err) {
    console.error(`Error fixing driver.compose.json for ${driverId}:`, err.message);
  }
  
  return false;
}

/**
 * Process all drivers
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          🖼️  FIX ALL PNG IMAGES - SDK3 COMPLIANT         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() &&
    !d.startsWith('.') &&
    !d.includes('archived')
  );
  
  console.log(`📊 Processing ${drivers.length} drivers\n`);
  
  const stats = {
    fixed: 0,
    copied: 0,
    skipped: 0,
    errors: 0,
  };
  
  for (const driverId of drivers) {
    try {
      const category = detectCategory(driverId);
      const imageStatus = checkImages(driverId);
      
      if (imageStatus.missing === 0) {
        stats.skipped++;
        continue;
      }
      
      console.log(`\n🔧 ${driverId} (${category})`);
      console.log(`  Missing: ${imageStatus.missing}/3 images`);
      
      // Fix driver.compose.json (SVG → PNG)
      const composeFix = fixDriverComposeImages(driverId);
      if (composeFix) {
        console.log(`  ✓ Fixed driver.compose.json (SVG → PNG)`);
      }
      
      // Find reference driver
      const reference = findReferenceDriver(category);
      
      if (reference) {
        console.log(`  📋 Using reference: ${reference}`);
        const copied = copyImagesFromReference(driverId, reference);
        if (copied > 0) {
          console.log(`  ✅ Copied ${copied} images from reference`);
          stats.copied++;
          stats.fixed++;
        }
      } else {
        console.log(`  ⚠️  No reference driver found for category: ${category}`);
      }
      
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      stats.errors++;
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Fixed: ${stats.fixed}`);
  console.log(`📋 Copied: ${stats.copied}`);
  console.log(`⏭️  Skipped (already OK): ${stats.skipped}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log('\n✅ IMAGE FIX COMPLETE!\n');
}

main().catch(console.error);
