'use strict';

/**
 * Generate drivers-index.json for GitHub Pages search
 * 
 * Scans all drivers and creates a searchable index with:
 * - Driver ID, name, description
 * - Supported models & manufacturers
 * - Capabilities
 * - Tags
 * - Icons
 */

const fs = require('fs-extra');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const OUTPUT_FILE = path.join(__dirname, '../../docs/drivers-index.json');
const APP_JSON_PATH = path.join(__dirname, '../../app.json');

async function generateDriversIndex() {
  console.log('🔍 Generating drivers index...');
  
  // Read app.json
  const appJson = await fs.readJSON(APP_JSON_PATH);
  const drivers = appJson.drivers || [];
  
  const index = {
    generated: new Date().toISOString(),
    version: appJson.version,
    totalDrivers: drivers.length,
    drivers: []
  };
  
  for (const driver of drivers) {
    try {
      const driverData = {
        id: driver.id,
        name: driver.name?.en || driver.id,
        description: driver.class || 'Unknown',
        class: driver.class,
        capabilities: driver.capabilities || [],
        models: [],
        manufacturers: [],
        tags: extractTags(driver),
        icon: driver.icon || `/drivers/${driver.id}/assets/icon.svg`,
        images: driver.images || {},
        connectivity: driver.connectivity || [],
        platforms: driver.platforms || ['local'],
        energy: driver.energy || null
      };
      
      // Extract models and manufacturers from pairing
      if (driver.pair) {
        driver.pair.forEach(pairItem => {
          if (pairItem.id === 'list_devices') {
            // Try to extract from template
            const template = pairItem.template || '';
            // This is simplified - in reality, we'd need to parse the driver code
          }
        });
      }
      
      // Try to read device models from driver directory
      const driverDir = path.join(DRIVERS_DIR, driver.id);
      if (await fs.pathExists(driverDir)) {
        const deviceFile = path.join(driverDir, 'device.js');
        if (await fs.pathExists(deviceFile)) {
          const deviceCode = await fs.readFile(deviceFile, 'utf8');
          
          // Extract model IDs (simplistic regex)
          const modelMatches = deviceCode.match(/'TS\d{4}'/g);
          if (modelMatches) {
            driverData.models = [...new Set(modelMatches.map(m => m.replace(/'/g, '')))];
          }
          
          // Extract manufacturer IDs
          const mfgMatches = deviceCode.match(/'_TZ[E\d]+_\w+'/g);
          if (mfgMatches) {
            driverData.manufacturers = [...new Set(mfgMatches.map(m => m.replace(/'/g, '')))];
          }
        }
      }
      
      // Add to index
      index.drivers.push(driverData);
      console.log(`  ✓ ${driverData.id}`);
      
    } catch (err) {
      console.error(`  ✗ ${driver.id}: ${err.message}`);
    }
  }
  
  // Ensure docs directory exists
  await fs.ensureDir(path.dirname(OUTPUT_FILE));
  
  // Write index
  await fs.writeJSON(OUTPUT_FILE, index, { spaces: 2 });
  
  console.log(`\n✅ Generated drivers index: ${OUTPUT_FILE}`);
  console.log(`   Total drivers: ${index.totalDrivers}`);
  console.log(`   Models found: ${index.drivers.reduce((sum, d) => sum + d.models.length, 0)}`);
  console.log(`   Manufacturers found: ${index.drivers.reduce((sum, d) => sum + d.manufacturers.length, 0)}`);
  
  return index;
}

function extractTags(driver) {
  const tags = [];
  
  // Class-based tags
  if (driver.class) {
    tags.push(driver.class);
  }
  
  // Capability-based tags
  const capabilities = driver.capabilities || [];
  if (capabilities.includes('onoff')) tags.push('switch');
  if (capabilities.includes('dim')) tags.push('dimmer');
  if (capabilities.some(c => c.includes('measure_'))) tags.push('sensor');
  if (capabilities.includes('alarm_motion')) tags.push('motion');
  if (capabilities.includes('alarm_contact')) tags.push('contact');
  if (capabilities.includes('measure_battery')) tags.push('battery');
  
  // Multi-gang detection
  if (capabilities.some(c => c.includes('.gang'))) {
    const gangCount = capabilities.filter(c => c.includes('.gang')).length + 1;
    tags.push(`${gangCount}-gang`);
    tags.push('multi-gang');
  }
  
  // Connectivity
  if (driver.connectivity?.includes('zigbee')) tags.push('zigbee');
  if (driver.id.includes('tuya')) tags.push('tuya');
  
  // Energy
  if (driver.energy) tags.push('energy-monitor');
  
  return [...new Set(tags)];
}

// Run if called directly
if (require.main === module) {
  generateDriversIndex()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Failed to generate drivers index:', err);
      process.exit(1);
    });
}

module.exports = { generateDriversIndex };
