#!/usr/bin/env node
'use strict';

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REPORT_PATH = path.join(ROOT, 'reports', 'NEW_PRODUCTS_2025_INTEGRATION.json');

async function main() {
  console.log('🏗️  AUTO GENERATE NEW 2025 DRIVERS\n');
  
  const report = await fs.readJson(REPORT_PATH);
  
  console.log(`Found ${report.driversToCreate.length} drivers to create\n`);
  
  let created = 0;
  
  for (const spec of report.driversToCreate) {
    const driverDir = path.join(DRIVERS_DIR, spec.id);
    
    if (await fs.pathExists(driverDir)) {
      console.log(`⚠️  ${spec.id} exists, skipping`);
      continue;
    }
    
    await fs.ensureDir(driverDir);
    console.log(`📦 Creating ${spec.id}...`);
    
    // Compose
    const compose = {
      id: spec.id,
      name: {
        en: spec.id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      },
      class: spec.class,
      capabilities: spec.capabilities || [],
      images: {
        small: './assets/small.png',
        large: './assets/large.png'
      },
      zigbee: {
        manufacturerName: spec.manufacturerName || [],
        productId: spec.productId || [],
        endpoints: {
          '1': {
            clusters: spec.clusters || [],
            bindings: (spec.clusters || []).filter(c => [1,5,6,8,768,1024,1030,1280].includes(c))
          }
        },
        learnmode: {
          image: './assets/large.png',
          instruction: {
            en: '1. Power on device\n2. Press pairing button 5 seconds\n3. Wait for Homey'
          }
        }
      }
    };
    
    if (spec.energy) compose.energy = spec.energy;
    
    await fs.writeJson(path.join(driverDir, 'driver.compose.json'), compose, { spaces: 2 });
    
    // Device.js
    const className = spec.id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Device';
    const deviceCode = `'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class ${className} extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('${spec.id} initialized');
    await super.onNodeInit({ zclNode });
    await this.setAvailable();
  }
}

module.exports = ${className};
`;
    await fs.writeFile(path.join(driverDir, 'device.js'), deviceCode);
    
    // Driver.js
    const driverCode = `'use strict';
const { Driver } = require('homey');

class ${String(className).replace('Device', 'Driver')} extends Driver {
  async onInit() {
    this.log('${spec.id} driver initialized');
  }
}

module.exports = ${String(className).replace('Device', 'Driver')};
`;
    await fs.writeFile(path.join(driverDir, 'driver.js'), driverCode);
    
    // Assets
    const assetsDir = path.join(driverDir, 'assets');
    await fs.ensureDir(assetsDir);
    await fs.writeFile(path.join(assetsDir, 'small.png.placeholder'), 'TODO: Create images');
    
    created++;
    console.log(`✅ ${spec.id} created\n`);
  }
  
  console.log(`\n✅ Complete: ${created}/${report.driversToCreate.length} drivers created\n`);
}

main().catch(console.error);
