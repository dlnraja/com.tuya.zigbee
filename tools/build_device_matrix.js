#!/usr/bin/env node
/**
 * Build device matrix from drivers and overlays
 * Construit la matrice des devices depuis les drivers et overlays
 */

const fs = require('fs');
const path = require('path');

function loadDriverCompose(driverPath) {
  try {
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      return JSON.parse(fs.readFileSync(composePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Failed to load driver compose: ${driverPath}`, error.message);
  }
  return null;
}

function loadOverlays() {
  const overlays = {};
  const vendorsDir = 'lib/tuya/overlays/vendors';
  
  if (!fs.existsSync(vendorsDir)) return overlays;
  
  for (const vendor of fs.readdirSync(vendorsDir)) {
    const vendorPath = path.join(vendorsDir, vendor);
    if (!fs.statSync(vendorPath).isDirectory()) continue;
    
    overlays[vendor] = {};
    
    for (const overlay of fs.readdirSync(vendorPath)) {
      if (overlay.endsWith('.json')) {
        try {
          const overlayPath = path.join(vendorPath, overlay);
          const overlayData = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
          overlays[vendor][overlay.replace('.json', '')] = overlayData;
        } catch (error) {
          console.error(`Failed to load overlay: ${vendor}/${overlay}`, error.message);
        }
      }
    }
  }
  
  return overlays;
}

function buildDeviceMatrix() {
  const matrix = {
    drivers: {},
    overlays: {},
    metadata: {
      generated: new Date().toISOString(),
      version: '1.0.0'
    }
  };
  
  // Charger les drivers
  const driversDir = 'drivers';
  if (fs.existsSync(driversDir)) {
    for (const driver of fs.readdirSync(driversDir)) {
      const driverPath = path.join(driversDir, driver);
      if (!fs.statSync(driverPath).isDirectory()) continue;
      
      const compose = loadDriverCompose(driverPath);
      if (compose) {
        matrix.drivers[driver] = {
          id: compose.id,
          name: compose.name,
          class: compose.class,
          capabilities: compose.capabilities,
          zigbee: compose.zigbee
        };
      }
    }
  }
  
  // Charger les overlays
  matrix.overlays = loadOverlays();
  
  return matrix;
}

function main() {
  console.log('🔧 Building device matrix...');
  
  try {
    const matrix = buildDeviceMatrix();
    
    // Sauvegarder la matrice
    const outputPath = 'DEVICE_MATRIX.json';
    fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));
    
    console.log(`✅ Device matrix saved to ${outputPath}`);
    console.log(`📊 Drivers: ${Object.keys(matrix.drivers).length}`);
    console.log(`🔧 Vendors: ${Object.keys(matrix.overlays).length}`);
    
  } catch (error) {
    console.error('❌ Failed to build device matrix:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildDeviceMatrix };
