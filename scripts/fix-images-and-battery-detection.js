#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * FIX IMAGES & BATTERY AUTO-DETECTION
 * Corrige les paths d'images et améliore la détection batterie
 */

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

console.log('🔧 FIX IMAGES & BATTERY AUTO-DETECTION\n');
console.log('═'.repeat(80));

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: FIX IMAGE PATHS
// ═══════════════════════════════════════════════════════════════════

console.log('\n📸 PHASE 1: FIXING IMAGE PATHS\n');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() && !d.startsWith('.')
);

let imagesFixed = 0;
let imagesCreated = 0;

drivers.forEach(driverName => {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    let modified = false;
    
    if (compose.images) {
      // Fix image paths format
      ['small', 'large', 'xlarge'].forEach(size => {
        if (compose.images[size]) {
          const oldPath = compose.images[size];
          
          // Normalize path format
          let newPath = oldPath;
          
          // Remove leading slash
          if (newPath.startsWith('/')) {
            newPath = newPath.substring(1);
          }
          
          // Ensure it starts with drivers/
          if (!newPath.startsWith('drivers/')) {
            newPath = `drivers/${driverName}/assets/images/${size}.png`;
          }
          
          // Check if image exists
          const fullPath = path.join(__dirname, '..', newPath);
          
          if (!fs.existsSync(fullPath)) {
            // Create directory
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            
            // Create placeholder image (1x1 PNG)
            const placeholder = Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              'base64'
            );
            
            fs.writeFileSync(fullPath, placeholder);
            imagesCreated++;
          }
          
          if (newPath !== oldPath) {
            compose.images[size] = newPath;
            modified = true;
          }
        }
      });
      
      if (modified) {
        fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
        imagesFixed++;
        
        if (imagesFixed <= 10) {
          console.log(`  ✅ Fixed: ${driverName}`);
        }
      }
    }
    
  } catch (e) {
    console.error(`❌ Error: ${driverName}:`, e.message);
  }
});

if (imagesFixed > 10) {
  console.log(`  ... and ${imagesFixed - 10} more`);
}

console.log(`\n✅ Images fixed: ${imagesFixed}`);
console.log(`✅ Placeholders created: ${imagesCreated}`);

// ═══════════════════════════════════════════════════════════════════
// PHASE 2: ENHANCE BATTERY AUTO-DETECTION
// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('\n🔋 PHASE 2: ENHANCING BATTERY AUTO-DETECTION\n');

let batteryEnhanced = 0;

drivers.forEach(driverName => {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const caps = compose.capabilities || [];
    
    if (caps.includes('measure_battery')) {
      let modified = false;
      
      // Ensure energy config exists
      if (!compose.energy) {
        compose.energy = {};
        modified = true;
      }
      
      // Smart battery type detection
      if (!compose.energy.batteries || compose.energy.batteries.length === 0) {
        let batteries = ['CR2032'];
        
        // Motion sensors - usually AAA
        if (driverName.includes('motion') || driverName.includes('pir')) {
          batteries = ['AAA', 'AAA'];
        }
        // Contact sensors - usually CR2032
        else if (driverName.includes('contact') || driverName.includes('door') || driverName.includes('window')) {
          batteries = ['CR2032'];
        }
        // Multi-sensors - usually AAA
        else if (driverName.includes('multi') || driverName.includes('comprehensive')) {
          batteries = ['AAA', 'AAA'];
        }
        // Buttons/remotes - CR2032 or CR2450
        else if (driverName.includes('button') || driverName.includes('remote')) {
          batteries = ['CR2032', 'CR2450'];
        }
        // Wall switches - multiple AAA
        else if (driverName.includes('switch') && driverName.includes('wall')) {
          batteries = ['AAA', 'AAA', 'AAA'];
        }
        // Water/leak sensors - CR2450
        else if (driverName.includes('water') || driverName.includes('leak')) {
          batteries = ['CR2450'];
        }
        // Smoke detectors - AA
        else if (driverName.includes('smoke')) {
          batteries = ['AA', 'AA'];
        }
        
        compose.energy.batteries = batteries;
        modified = true;
      }
      
      // Add battery settings if missing
      if (!compose.settings) {
        compose.settings = [];
      }
      
      const hasBatterySettings = compose.settings.some(s => s.id === 'battery_type');
      
      if (!hasBatterySettings) {
        const batterySettings = [
          {
            id: 'battery_type',
            type: 'dropdown',
            label: { en: 'Battery Type', fr: 'Type de Batterie' },
            value: 'auto',
            values: [
              { id: 'auto', label: { en: 'Auto Detect', fr: 'Détection Automatique' } },
              { id: 'CR2032', label: { en: 'CR2032 (3V)', fr: 'CR2032 (3V)' } },
              { id: 'CR2450', label: { en: 'CR2450 (3V)', fr: 'CR2450 (3V)' } },
              { id: 'AAA', label: { en: 'AAA (1.5V)', fr: 'AAA (1.5V)' } },
              { id: 'AA', label: { en: 'AA (1.5V)', fr: 'AA (1.5V)' } }
            ]
          },
          {
            id: 'battery_low_threshold',
            type: 'number',
            label: { en: 'Low Battery Threshold (%)', fr: 'Seuil Batterie Faible (%)' },
            value: 20,
            min: 5,
            max: 50,
            step: 5
          }
        ];
        
        compose.settings.unshift(...batterySettings);
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
        batteryEnhanced++;
        
        if (batteryEnhanced <= 10) {
          console.log(`  ✅ Enhanced: ${driverName} (${compose.energy.batteries.join(', ')})`);
        }
      }
    }
    
  } catch (e) {
    console.error(`❌ Error: ${driverName}:`, e.message);
  }
});

if (batteryEnhanced > 10) {
  console.log(`  ... and ${batteryEnhanced - 10} more`);
}

console.log(`\n✅ Battery configs enhanced: ${batteryEnhanced}`);

// ═══════════════════════════════════════════════════════════════════
// PHASE 3: ADD CAPABILITY OPTIONS
// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('\n⚙️ PHASE 3: ADDING CAPABILITY OPTIONS\n');

let capOptionsAdded = 0;

drivers.forEach(driverName => {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const caps = compose.capabilities || [];
    let modified = false;
    
    if (!compose.capabilitiesOptions) {
      compose.capabilitiesOptions = {};
    }
    
    // Add titles for multi-gang onoff capabilities
    const gangMatch = driverName.match(/(\d)gang/);
    if (gangMatch) {
      const gangCount = parseInt(gangMatch[1]);
      
      for (let i = 1; i <= gangCount; i++) {
        const cap = i === 1 ? 'onoff' : `onoff.button${i}`;
        
        if (caps.includes(cap) && !compose.capabilitiesOptions[cap]) {
          compose.capabilitiesOptions[cap] = {
            title: {
              en: `Channel ${i}`,
              fr: `Canal ${i}`
            }
          };
          modified = true;
        }
      }
    }
    
    // Add battery options
    if (caps.includes('measure_battery') && !compose.capabilitiesOptions.measure_battery) {
      compose.capabilitiesOptions.measure_battery = {
        title: {
          en: 'Battery',
          fr: 'Batterie'
        },
        preventInsights: false
      };
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
      capOptionsAdded++;
      
      if (capOptionsAdded <= 10) {
        console.log(`  ✅ Added options: ${driverName}`);
      }
    }
    
  } catch (e) {
    console.error(`❌ Error: ${driverName}:`, e.message);
  }
});

if (capOptionsAdded > 10) {
  console.log(`  ... and ${capOptionsAdded - 10} more`);
}

console.log(`\n✅ Capability options added: ${capOptionsAdded}`);

// ═══════════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('\n✅ COMPLETE!\n');
console.log(`📊 Summary:`);
console.log(`   - Images fixed:           ${imagesFixed}`);
console.log(`   - Placeholders created:   ${imagesCreated}`);
console.log(`   - Battery configs:        ${batteryEnhanced}`);
console.log(`   - Capability options:     ${capOptionsAdded}`);
console.log(`\n✅ All drivers optimized!\n`);
