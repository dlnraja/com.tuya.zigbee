#!/usr/bin/env node
'use strict';

/**
 * Mass Hybrid Driver Generator
 * Consolidates ALL drivers with energy suffixes into unified hybrid drivers
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');
const analysisPath = path.join(__dirname, '../CONSOLIDATION_ANALYSIS_FULL.json');

// Load analysis
const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));

// Categories mapping
const DEVICE_CATEGORIES = {
  light: {
    baseClass: 'BaseHybridDevice',
    baseFile: '../lib/BaseHybridDevice',
    icon: 'light'
  },
  socket: {
    baseClass: 'SwitchDevice',
    baseFile: '../lib/SwitchDevice',
    icon: 'switch'
  },
  sensor: {
    baseClass: 'BaseHybridDevice',
    baseFile: '../lib/BaseHybridDevice',
    icon: 'sensor'
  },
  button: {
    baseClass: 'ButtonDevice',
    baseFile: '../lib/ButtonDevice',
    icon: 'button'
  },
  other: {
    baseClass: 'BaseHybridDevice',
    baseFile: '../lib/BaseHybridDevice',
    icon: 'device'
  }
};

let stats = {
  created: 0,
  skipped: 0,
  errors: []
};

function generateDriverCompose(baseName, group) {
  const { deviceClass, variants, capabilities } = group;
  
  // Collect all manufacturer IDs from all variants
  const allManufacturers = [];
  const allProductIds = [];
  const allEndpoints = {};
  
  for (const variant of variants) {
    const variantPath = path.join(driversDir, variant.driverName, 'driver.compose.json');
    if (!fs.existsSync(variantPath)) continue;
    
    try {
      const variantCompose = JSON.parse(fs.readFileSync(variantPath, 'utf-8'));
      
      // Collect manufacturer names
      if (variantCompose.zigbee && variantCompose.zigbee.manufacturerName) {
        const names = Array.isArray(variantCompose.zigbee.manufacturerName) 
          ? variantCompose.zigbee.manufacturerName 
          : [variantCompose.zigbee.manufacturerName];
        allManufacturers.push(...names);
      }
      
      // Collect product IDs
      if (variantCompose.zigbee && variantCompose.zigbee.productId) {
        const ids = Array.isArray(variantCompose.zigbee.productId) 
          ? variantCompose.zigbee.productId 
          : [variantCompose.zigbee.productId];
        allProductIds.push(...ids);
      }
      
      // Collect endpoints
      if (variantCompose.zigbee && variantCompose.zigbee.endpoints) {
        Object.assign(allEndpoints, variantCompose.zigbee.endpoints);
      }
    } catch (err) {
      console.warn(`⚠️  Could not read ${variant.driverName}: ${err.message}`);
    }
  }
  
  // Remove duplicates
  const uniqueManufacturers = [...new Set(allManufacturers)];
  const uniqueProductIds = [...new Set(allProductIds)];
  
  // Convert capabilities Set to Array and filter out measure_battery (will be added dynamically)
  const capabilitiesArray = Array.from(capabilities).filter(cap => cap !== 'measure_battery');
  
  // Base compose structure
  const compose = {
    name: {
      en: baseName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      fr: baseName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    },
    class: deviceClass,
    capabilities: capabilitiesArray,
    energy: {
      batteries: ['CR2032', 'CR2450', 'AAA', 'AA']
    },
    zigbee: {
      manufacturerName: uniqueManufacturers,
      productId: uniqueProductIds.length > 0 ? uniqueProductIds : ['default'],
      endpoints: Object.keys(allEndpoints).length > 0 ? allEndpoints : { 1: {} },
      learnmode: {
        image: '/drivers/' + baseName + '/assets/learnmode.svg',
        instruction: {
          en: 'Press and hold the pairing button for 5 seconds until the LED flashes.',
          fr: 'Appuyez et maintenez le bouton d\'appairage pendant 5 secondes jusqu\'à ce que la LED clignote.'
        }
      }
    },
    settings: [
      {
        id: 'auto_battery_detection',
        type: 'checkbox',
        label: {
          en: 'Auto Battery Type Detection',
          fr: 'Détection Automatique du Type de Batterie'
        },
        value: true,
        hint: {
          en: 'Automatically detect battery type based on voltage',
          fr: 'Détecter automatiquement le type de batterie en fonction de la tension'
        }
      }
    ]
  };
  
  return compose;
}

function generateDeviceJS(baseName, group) {
  const { deviceClass } = group;
  const category = DEVICE_CATEGORIES[deviceClass] || DEVICE_CATEGORIES['other'];
  
  const className = baseName.split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('') + 'Device';
  
  return `'use strict';

const ${category.baseClass} = require('${category.baseFile}');

/**
 * ${className} - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class ${className} extends ${category.baseClass} {

  async onNodeInit() {
    this.log('${className} initializing...');
    
    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit();
    
    this.log('${className} initialized - Power source:', this.powerSource || 'unknown');
  }

  async onDeleted() {
    this.log('${className} deleted');
    await super.onDeleted();
  }
}

module.exports = ${className};
`;
}

function generateDriverJS(baseName) {
  const className = baseName.split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('') + 'Driver';
  
  return `'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDriver {

  async onInit() {
    this.log('${className} initialized');
  }
}

module.exports = ${className};
`;
}

function copyAssets(baseName, variants) {
  const targetPath = path.join(driversDir, baseName);
  const assetsPath = path.join(targetPath, 'assets', 'images');
  
  // Create assets directory
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }
  
  // Try to copy from first variant
  for (const variant of variants) {
    const variantAssetsPath = path.join(driversDir, variant.driverName, 'assets', 'images');
    if (fs.existsSync(variantAssetsPath)) {
      try {
        // Copy images
        const images = ['small.png', 'large.png', 'xlarge.png'];
        for (const img of images) {
          const srcImg = path.join(variantAssetsPath, img);
          const dstImg = path.join(assetsPath, img);
          if (fs.existsSync(srcImg)) {
            fs.copyFileSync(srcImg, dstImg);
          }
        }
        
        // Copy learnmode SVG
        const learnmodeSrc = path.join(driversDir, variant.driverName, 'assets', 'learnmode.svg');
        const learnmodeDst = path.join(targetPath, 'assets', 'learnmode.svg');
        if (fs.existsSync(learnmodeSrc)) {
          fs.copyFileSync(learnmodeSrc, learnmodeDst);
        }
        
        return true; // Success
      } catch (err) {
        console.warn(`⚠️  Could not copy assets from ${variant.driverName}: ${err.message}`);
      }
    }
  }
  
  return false; // No assets found
}

function generateUnifiedDriver(baseName, group) {
  const targetPath = path.join(driversDir, baseName);
  
  // Skip if already exists
  if (fs.existsSync(targetPath)) {
    console.log(`⏭️  Skipping ${baseName} (already exists)`);
    stats.skipped++;
    return;
  }
  
  console.log(`\n🔨 Creating unified driver: ${baseName}`);
  console.log(`   Device class: ${group.deviceClass}`);
  console.log(`   Variants: ${group.variants.length}`);
  console.log(`   Total manufacturers: ${group.totalManufacturers}`);
  
  try {
    // Create driver directory
    fs.mkdirSync(targetPath, { recursive: true });
    
    // Generate files
    const compose = generateDriverCompose(baseName, group);
    const deviceJS = generateDeviceJS(baseName, group);
    const driverJS = generateDriverJS(baseName);
    
    // Write files
    fs.writeFileSync(
      path.join(targetPath, 'driver.compose.json'),
      JSON.stringify(compose, null, 2)
    );
    
    fs.writeFileSync(
      path.join(targetPath, 'device.js'),
      deviceJS
    );
    
    fs.writeFileSync(
      path.join(targetPath, 'driver.js'),
      driverJS
    );
    
    // Copy assets
    copyAssets(baseName, group.variants);
    
    console.log(`   ✅ Created successfully`);
    stats.created++;
    
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    stats.errors.push({ baseName, error: err.message });
  }
}

function generateAllHybridDrivers() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   MASS HYBRID DRIVER GENERATION');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const groups = Object.values(analysis.consolidationGroups);
  console.log(`📦 Total groups to process: ${groups.length}\n`);
  
  // Process each group
  for (const group of groups) {
    generateUnifiedDriver(group.baseName, group);
  }
  
  // Print summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('   GENERATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Created: ${stats.created}`);
  console.log(`⏭️  Skipped: ${stats.skipped} (already exist)`);
  console.log(`❌ Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n🔴 Errors:');
    for (const err of stats.errors) {
      console.log(`   - ${err.baseName}: ${err.error}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Run generator
generateAllHybridDrivers();
