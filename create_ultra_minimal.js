const fs = require('fs');
const path = require('path');

class UltraMinimalCreator {
  async createUltraMinimal() {
    console.log('🔧 Creating ultra-minimal single driver for validation test...\n');
    
    // Remove all existing drivers
    await this.cleanDrivers();
    
    // Create single basic driver
    await this.createBasicDriver();
    
    // Create minimal app.json
    await this.createMinimalAppJson();
    
    console.log('✅ Ultra-minimal setup created');
    console.log('🎯 Test: homey app validate');
  }

  async cleanDrivers() {
    const driversPath = './drivers';
    
    if (fs.existsSync(driversPath)) {
      // Move everything to backup
      const backupPath = './drivers_ultra_backup';
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      }
      fs.renameSync(driversPath, backupPath);
      console.log('📦 All existing drivers moved to backup');
    }
    
    // Create fresh drivers directory
    fs.mkdirSync(driversPath, { recursive: true });
  }

  async createBasicDriver() {
    const driverId = 'test_light';
    const driverPath = path.join('./drivers', driverId);
    
    // Create driver directory structure
    fs.mkdirSync(driverPath, { recursive: true });
    fs.mkdirSync(path.join(driverPath, 'assets', 'images'), { recursive: true });
    
    // Create driver.compose.json
    const compose = {
      "id": driverId,
      "name": {
        "en": "Test Light"
      },
      "class": "light",
      "capabilities": ["onoff"],
      "zigbee": {
        "manufacturerName": ["Test"],
        "productId": ["TEST001"],
        "endpoints": {
          "1": {
            "clusters": [0, 6],
            "bindings": [6]
          }
        }
      },
      "images": {
        "small": "{{driverAssetsPath}}/images/small.png",
        "large": "{{driverAssetsPath}}/images/large.png"
      }
    };
    
    fs.writeFileSync(
      path.join(driverPath, 'driver.compose.json'), 
      JSON.stringify(compose, null, 2)
    );
    
    // Create device.js
    const deviceCode = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TestLightDevice extends ZigBeeDevice {
  async onNodeInit() {
    this.registerCapability('onoff', 'genOnOff');
    await super.onNodeInit();
  }
}

module.exports = TestLightDevice;
`;
    
    fs.writeFileSync(path.join(driverPath, 'device.js'), deviceCode);
    
    // Create driver.js
    const driverCode = `'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TestLightDriver extends ZigBeeDriver {
  onInit() {
    super.onInit();
  }
}

module.exports = TestLightDriver;
`;
    
    fs.writeFileSync(path.join(driverPath, 'driver.js'), driverCode);
    
    // Copy basic images if they exist
    const globalSmall = './assets/images/small.png';
    const globalLarge = './assets/images/large.png';
    
    if (fs.existsSync(globalSmall)) {
      fs.copyFileSync(globalSmall, path.join(driverPath, 'assets/images/small.png'));
    }
    if (fs.existsSync(globalLarge)) {
      fs.copyFileSync(globalLarge, path.join(driverPath, 'assets/images/large.png'));
    }
    
    console.log(`📁 Created ultra-minimal driver: ${driverId}`);
  }

  async createMinimalAppJson() {
    const appConfig = {
      "main": "app.js",
      "id": "com.dlnraja.ultimate.zigbee.hub",
      "version": "4.0.6-ultra-minimal",
      "compatibility": ">=8.0.0",
      "category": ["lights"],
      "name": {
        "en": "Test Zigbee App"
      },
      "description": {
        "en": "Ultra-minimal test app with 1 driver"
      },
      "author": {
        "name": "dlnraja",
        "email": "dylan.rajasekaram@gmail.com"
      },
      "license": "MIT",
      "platforms": ["local"],
      "connectivity": ["zigbee"]
    };

    fs.writeFileSync('./app.json', JSON.stringify(appConfig, null, 2));
    console.log('📄 Ultra-minimal app.json created');
  }
}

new UltraMinimalCreator().createUltraMinimal().catch(console.error);
