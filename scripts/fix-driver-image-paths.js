#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

async function fixImagePaths() {
  console.log('🔧 Fixing driver image paths...\n');
  
  const driversDir = path.join(__dirname, '..', 'drivers');
  const drivers = await fs.readdir(driversDir);
  
  let fixed = 0;
  
  for (const driver of drivers) {
    const composeFile = path.join(driversDir, driver, 'driver.compose.json');
    
    try {
      const content = await fs.readFile(composeFile, 'utf8');
      const data = JSON.parse(content);
      
      // Fix images paths
      if (data.images) {
        let changed = false;
        
        if (data.images.small && data.images.small.includes('/assets/images/')) {
          data.images.small = './assets/images/small.png';
          changed = true;
        }
        
        if (data.images.large && data.images.large.includes('/assets/images/')) {
          data.images.large = './assets/images/large.png';
          changed = true;
        }
        
        if (changed) {
          await fs.writeFile(composeFile, JSON.stringify(data, null, 2) + '\n', 'utf8');
          fixed++;
          console.log(`✅ ${driver}`);
        }
      }
    } catch (err) {
      // Skip if file doesn't exist
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} drivers`);
}

fixImagePaths().catch(console.error);
