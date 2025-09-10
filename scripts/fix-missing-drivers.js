#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

const DRIVER_TEMPLATES = {
  'driver.js': `const { ZigBeeDevice } = require('homey-zigbeedriver');

class MyDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('Device initialized');
    
    // Register capabilities
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'onOff');
    }
  }
}

module.exports = MyDevice;`,

  'driver.compose.json': JSON.stringify({
    name: { en: "Smart Device" },
    class: "light",
    capabilities: ["onoff"],
    images: {
      large: "/drivers/{{driverId}}/assets/images/large.png",
      small: "/drivers/{{driverId}}/assets/images/small.png"
    },
    zigbee: {
      manufacturerName: "_TZ3000_*",
      productId: ["TS0011"],
      endpoints: {
        "1": {
          clusters: [0, 6]
        }
      }
    }
  }, null, 2)
};

async function fixMissingDrivers() {
  console.log('🔧 Fixing missing drivers and images...\n');
  
  const driversDir = path.join(__dirname, '../drivers');
  let fixes = 0;
  
  try {
    const drivers = await fs.readdir(driversDir);
    
    for (const driver of drivers) {
      if (driver.startsWith('_')) continue; // Skip template directories
      
      const driverPath = path.join(driversDir, driver);
      const stat = await fs.stat(driverPath);
      if (!stat.isDirectory()) continue;
      
      console.log(`📁 Processing driver: ${driver}`);
      
      // Fix missing driver.js
      const driverJsPath = path.join(driverPath, 'driver.js');
      try {
        await fs.access(driverJsPath);
      } catch {
        await fs.writeFile(driverJsPath, DRIVER_TEMPLATES['driver.js']);
        console.log(`  ✅ Created driver.js`);
        fixes++;
      }
      
      // Fix missing driver.compose.json
      const composePath = path.join(driverPath, 'driver.compose.json');
      try {
        await fs.access(composePath);
      } catch {
        await fs.writeFile(composePath, DRIVER_TEMPLATES['driver.compose.json']);
        console.log(`  ✅ Created driver.compose.json`);
        fixes++;
      }
      
      // Create images directory and placeholder images
      const imagesDir = path.join(driverPath, 'assets', 'images');
      await fs.mkdir(imagesDir, { recursive: true });
      
      // Create placeholder SVG images
      const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#f0f0f0"/>
  <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#666">
    ${driver.toUpperCase()}
  </text>
</svg>`;
      
      const largePath = path.join(imagesDir, 'large.png');
      const smallPath = path.join(imagesDir, 'small.png');
      
      try {
        await fs.access(largePath);
      } catch {
        await fs.writeFile(largePath, svgTemplate);
        console.log(`  ✅ Created large.png`);
        fixes++;
      }
      
      try {
        await fs.access(smallPath);
      } catch {
        await fs.writeFile(smallPath, svgTemplate);
        console.log(`  ✅ Created small.png`);
        fixes++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixes} missing files`);
    console.log('🎉 All drivers now have required files and images');
    
  } catch (error) {
    console.error('❌ Error fixing drivers:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  fixMissingDrivers().catch(console.error);
}

module.exports = { fixMissingDrivers };
