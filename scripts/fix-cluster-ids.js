#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function fixClusterIds() {
  console.log('🔧 Fixing cluster ID formats...\n');
  
  const driversDir = path.join(__dirname, '../drivers');
  let fixes = 0;
  
  try {
    const drivers = await fs.readdir(driversDir);
    
    for (const driver of drivers) {
      if (driver.startsWith('_')) continue;
      
      const composePath = path.join(driversDir, driver, 'driver.compose.json');
      
      try {
        await fs.access(composePath);
        const content = await fs.readFile(composePath, 'utf8');
        let compose = JSON.parse(content);
        
        let changed = false;
        
        // Fix zigbee configuration
        if (compose.zigbee && compose.zigbee.endpoints) {
          for (const [endpointId, endpoint] of Object.entries(compose.zigbee.endpoints)) {
            if (endpoint.clusters && Array.isArray(endpoint.clusters)) {
              endpoint.clusters = endpoint.clusters.map(cluster => {
                if (typeof cluster === 'string') {
                  // Convert string hex to number
                  const num = parseInt(cluster, 16);
                  if (!isNaN(num)) {
                    changed = true;
                    return num;
                  }
                }
                return cluster;
              });
            }
          }
        }
        
        if (changed) {
          await fs.writeFile(composePath, JSON.stringify(compose, null, 2));
          console.log(`✅ Fixed cluster IDs in ${driver}`);
          fixes++;
        }
        
      } catch (error) {
        // Skip if file doesn't exist
      }
    }
    
    console.log(`\n✅ Fixed ${fixes} driver configurations`);
    
  } catch (error) {
    console.error('❌ Error fixing cluster IDs:', error.message);
  }
}

if (require.main === module) {
  fixClusterIds().catch(console.error);
}

module.exports = { fixClusterIds };
