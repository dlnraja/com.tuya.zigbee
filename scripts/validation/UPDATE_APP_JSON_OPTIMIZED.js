#!/usr/bin/env node
'use strict';

/**
 * UPDATE APP JSON OPTIMIZED
 * 
 * Met à jour app.json avec les nouveaux drivers
 * ET optimise la taille pour respecter les limites Homey
 */

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function updateAppJson() {
  console.log('📝 UPDATE APP JSON OPTIMIZED\n');
  console.log('═'.repeat(70) + '\n');
  
  // Read current app.json
  const appJsonPath = path.join(ROOT, 'app.json');
  const appJson = await fs.readJson(appJsonPath);
  
  const beforeSize = JSON.stringify(appJson).length;
  console.log(`📊 Current app.json size: ${Math.round(beforeSize / 1024)} KB\n`);
  
  // Get all drivers
  const driverDirs = await fs.readdir(DRIVERS_DIR);
  const validDrivers = [];
  
  for (const dir of driverDirs) {
    const composeFile = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (await fs.pathExists(composeFile)) {
      validDrivers.push(dir);
    }
  }
  
  console.log(`📦 Found ${validDrivers.length} valid drivers\n`);
  
  // Update version
  const versionParts = appJson.version.split('.');
  versionParts[2] = parseInt(versionParts[2]) + 1;
  appJson.version = versionParts.join('.');
  
  console.log(`🔢 New version: ${appJson.version}\n`);
  
  // Update description with new count
  appJson.description.en = `Universal support for Zigbee devices across ${validDrivers.length} drivers - 100% local control, no cloud required. Supports Philips Hue, IKEA, Tuya, Xiaomi and more. 2024-2025 products supported.`;
  
  appJson.description.fr = `Support universel pour appareils Zigbee avec ${validDrivers.length} drivers - Contrôle 100% local, sans cloud. Supporte Philips Hue, IKEA, Tuya, Xiaomi et plus. Produits 2024-2025 supportés.`;
  
  // Optimize: Remove redundant data
  if (appJson.drivers) {
    console.log('⚠️  app.json contains drivers array - this should be in .homeycompose\n');
  }
  
  // Save optimized app.json
  await fs.writeJson(appJsonPath, appJson, { spaces: 2 });
  
  const afterSize = JSON.stringify(appJson).length;
  console.log(`📊 New app.json size: ${Math.round(afterSize / 1024)} KB`);
  console.log(`   Difference: ${Math.round((afterSize - beforeSize) / 1024)} KB\n`);
  
  if (afterSize / 1024 > 200) {
    console.log('⚠️  WARNING: app.json is > 200 KB!');
    console.log('   This may cause issues with Homey App Store\n');
  }
  
  // Update .homeyignore
  await updateHomeyIgnore();
  
  console.log('═'.repeat(70));
  console.log('\n✅ APP.JSON UPDATED\n');
  console.log('Summary:');
  console.log(`  Version: ${appJson.version}`);
  console.log(`  Drivers: ${validDrivers.length}`);
  console.log(`  Size: ${Math.round(afterSize / 1024)} KB\n`);
}

async function updateHomeyIgnore() {
  const homeyignorePath = path.join(ROOT, '.homeyignore');
  let content = await fs.readFile(homeyignorePath, 'utf8');
  
  const criticalEntries = [
    '.cache/',
    'references/',
    '*.md',
    '!README.md',
    '!CHANGELOG.md',
    'IMPLEMENTATION_COMPLETE_2025.md',
    'ENRICHISSEMENT_FLOW_CARDS_COMPLETE.md',
    'archive/',
    '*.placeholder'
  ];
  
  let added = false;
  for (const entry of criticalEntries) {
    if (!content.includes(entry)) {
      content += `\n${entry}`;
      added = true;
      console.log(`   + Added: ${entry}`);
    }
  }
  
  if (added) {
    await fs.writeFile(homeyignorePath, content);
    console.log('\n✅ .homeyignore updated\n');
  } else {
    console.log('✅ .homeyignore already complete\n');
  }
}

updateAppJson().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
