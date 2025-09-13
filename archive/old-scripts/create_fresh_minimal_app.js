const fs = require('fs');
const path = require('path');

class FreshMinimalAppCreator {
  async createFreshApp() {
    console.log('🔧 Creating completely fresh minimal Homey app...\n');
    
    // Clean everything and start fresh
    await this.cleanAndBackupEverything();
    
    // Create minimal required files
    await this.createMinimalRequiredFiles();
    
    console.log('✅ Fresh minimal app created');
    console.log('🎯 Test: homey app validate');
  }

  async cleanAndBackupEverything() {
    console.log('🧹 Cleaning and backing up current state...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backup-${timestamp}`;
    
    // Create backup of current state
    fs.mkdirSync(backupPath, { recursive: true });
    
    const filesToBackup = [
      'app.json', 'app.js', 'package.json', '.homeyrc.json',
      'drivers', 'lib', 'locales', 'assets'
    ];
    
    for (const item of filesToBackup) {
      if (fs.existsSync(item)) {
        if (fs.statSync(item).isDirectory()) {
          this.copyDirectory(item, path.join(backupPath, item));
        } else {
          fs.copyFileSync(item, path.join(backupPath, item));
        }
        console.log(`  📦 Backed up: ${item}`);
      }
    }
    
    // Remove current files (except backups and scripts)
    const toRemove = ['drivers', 'lib', 'locales', '.homeybuild'];
    for (const item of toRemove) {
      if (fs.existsSync(item)) {
        fs.rmSync(item, { recursive: true, force: true });
      }
    }
    
    console.log(`📁 Current state backed up to: ${backupPath}\n`);
  }

  copyDirectory(source, target) {
    fs.mkdirSync(target, { recursive: true });
    const items = fs.readdirSync(source, { withFileTypes: true });
    
    for (const item of items) {
      const sourcePath = path.join(source, item.name);
      const targetPath = path.join(target, item.name);
      
      if (item.isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  async createMinimalRequiredFiles() {
    console.log('📄 Creating minimal required files...');
    
    // 1. Fresh package.json
    const packageJson = {
      "name": "com.dlnraja.ultimate.zigbee.hub",
      "version": "1.0.0",
      "description": "Minimal Zigbee App",
      "main": "app.js",
      "dependencies": {
        "homey-zigbeedriver": "^3.0.0"
      },
      "engines": {
        "node": ">=16"
      }
    };
    
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
    console.log('  ✅ package.json');
    
    // 2. Minimal app.json
    const appJson = {
      "id": "com.dlnraja.ultimate.zigbee.hub",
      "version": "1.0.0",
      "compatibility": ">=8.0.0",
      "sdk": 3,
      "platforms": ["local"],
      "name": {
        "en": "Minimal Zigbee Test"
      },
      "description": {
        "en": "Minimal Zigbee app for validation testing"
      },
      "category": ["lights"],
      "permissions": [],
      "author": {
        "name": "dlnraja",
        "email": "dylan.rajasekaram@gmail.com"
      },
      "license": "MIT"
    };
    
    fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));
    console.log('  ✅ app.json');
    
    // 3. Ultra-simple app.js
    const appJs = `'use strict';

const Homey = require('homey');

class MinimalApp extends Homey.App {
  onInit() {
    this.log('Minimal app initialized');
  }
}

module.exports = MinimalApp;
`;
    
    fs.writeFileSync('./app.js', appJs);
    console.log('  ✅ app.js');
    
    // 4. Create basic assets structure
    fs.mkdirSync('./assets/images', { recursive: true });
    
    // Create placeholder images if main assets don't exist
    const placeholderPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    
    if (!fs.existsSync('./assets/images/small.png')) {
      fs.writeFileSync('./assets/images/small.png', placeholderPng);
    }
    if (!fs.existsSync('./assets/images/large.png')) {
      fs.writeFileSync('./assets/images/large.png', placeholderPng);
    }
    
    console.log('  ✅ Basic assets');
    
    // 5. Create single test driver
    await this.createSingleTestDriver();
    
    console.log('📊 Fresh minimal app structure created');
  }

  async createSingleTestDriver() {
    const driverPath = './drivers/test_basic';
    fs.mkdirSync(driverPath, { recursive: true });
    fs.mkdirSync(`${driverPath}/assets/images`, { recursive: true });
    
    // Ultra-minimal compose
    const compose = {
      "id": "test_basic",
      "name": {
        "en": "Test Basic Light"
      },
      "class": "light",
      "capabilities": ["onoff"],
      "zigbee": {
        "manufacturerName": ["Test"],
        "productId": ["BASIC"],
        "endpoints": {
          "1": {
            "clusters": [6],
            "bindings": [6]
          }
        }
      },
      "images": {
        "small": "{{driverAssetsPath}}/images/small.png",
        "large": "{{driverAssetsPath}}/images/large.png"
      }
    };
    
    fs.writeFileSync(`${driverPath}/driver.compose.json`, JSON.stringify(compose, null, 2));
    
    // Minimal device.js
    const deviceCode = `'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
class TestBasicDevice extends ZigBeeDevice {
  async onNodeInit() {
    this.registerCapability('onoff', 'genOnOff');
  }
}
module.exports = TestBasicDevice;`;
    
    fs.writeFileSync(`${driverPath}/device.js`, deviceCode);
    
    // Minimal driver.js  
    const driverCode = `'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class TestBasicDriver extends ZigBeeDriver {}
module.exports = TestBasicDriver;`;
    
    fs.writeFileSync(`${driverPath}/driver.js`, driverCode);
    
    // Copy placeholder images
    const placeholderPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(`${driverPath}/assets/images/small.png`, placeholderPng);
    fs.writeFileSync(`${driverPath}/assets/images/large.png`, placeholderPng);
    
    console.log('  ✅ test_basic driver');
  }
}

new FreshMinimalAppCreator().createFreshApp().catch(console.error);
