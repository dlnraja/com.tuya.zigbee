#!/usr/bin/env node
/**
 * Build app.json from Homey Compose files without using Homey CLI
 * This avoids the hanging issue with homey app build
 */

const fs = require('fs');
const path = require('path');

function buildManifest() {
  console.log('Building app.json from Compose files...');
  
  // Read base app.json from .homeycompose
  const baseAppPath = '.homeycompose/app.json';
  if (!fs.existsSync(baseAppPath)) {
    console.error('ERROR: .homeycompose/app.json not found');
    process.exit(1);
  }
  
  let manifest = JSON.parse(fs.readFileSync(baseAppPath, 'utf8'));
  
  // Add drivers
  manifest.drivers = [];
  const driversDir = 'drivers';
  
  if (fs.existsSync(driversDir)) {
    const driverFolders = fs.readdirSync(driversDir).filter(d => {
      const driverPath = path.join(driversDir, d);
      return fs.statSync(driverPath).isDirectory() && 
             fs.existsSync(path.join(driverPath, 'driver.compose.json'));
    });
    
    for (const driverFolder of driverFolders) {
      const composePath = path.join(driversDir, driverFolder, 'driver.compose.json');
      console.log(`  Adding driver: ${driverFolder}`);
      
      try {
        const driverCompose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Ensure driver has required fields
        if (!driverCompose.id) driverCompose.id = driverFolder;
        if (!driverCompose.name) driverCompose.name = { en: driverFolder };
        if (!driverCompose.class) driverCompose.class = 'socket';
        if (!driverCompose.capabilities) driverCompose.capabilities = [];
        
        // Add to manifest
        manifest.drivers.push(driverCompose);
      } catch (e) {
        console.error(`  WARNING: Failed to parse ${composePath}: ${e.message}`);
      }
    }
  }
  
  // Add flow cards if they exist
  const flowDir = '.homeycompose/flow';
  if (fs.existsSync(flowDir)) {
    manifest.flow = {};
    
    const flowTypes = ['triggers', 'conditions', 'actions'];
    for (const type of flowTypes) {
      const flowFile = path.join(flowDir, `${type}.json`);
      if (fs.existsSync(flowFile)) {
        try {
          const flowData = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
          manifest.flow[type] = flowData;
          console.log(`  Added flow ${type}`);
        } catch (e) {
          console.error(`  WARNING: Failed to parse ${flowFile}: ${e.message}`);
        }
      }
    }
  }
  
  // Add capabilities if they exist
  const capabilitiesDir = '.homeycompose/capabilities';
  if (fs.existsSync(capabilitiesDir)) {
    manifest.capabilities = {};
    const capFiles = fs.readdirSync(capabilitiesDir).filter(f => f.endsWith('.json'));
    
    for (const capFile of capFiles) {
      const capName = capFile.replace('.json', '');
      try {
        const capData = JSON.parse(fs.readFileSync(path.join(capabilitiesDir, capFile), 'utf8'));
        manifest.capabilities[capName] = capData;
        console.log(`  Added capability: ${capName}`);
      } catch (e) {
        console.error(`  WARNING: Failed to parse ${capFile}: ${e.message}`);
      }
    }
  }
  
  // Write final app.json
  fs.writeFileSync('app.json', JSON.stringify(manifest, null, 2));
  console.log('✓ app.json built successfully');
  console.log(`  Total drivers: ${manifest.drivers?.length || 0}`);
  
  return manifest;
}

// Run if called directly
if (require.main === module) {
  try {
    buildManifest();
    process.exit(0);
  } catch (e) {
    console.error('BUILD FAILED:', e.message);
    process.exit(1);
  }
}

module.exports = { buildManifest };
