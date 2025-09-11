const fs = require('fs');
const path = require('path');

class MinimalTestCreator {
  constructor() {
    this.minimal = ['ikea_tradfri_bulb', 'tuya_light_ts0501a'];
    this.moved = [];
  }

  async createMinimalTest() {
    console.log('🔧 Creating minimal test with 2 drivers only...\n');
    
    await this.moveAllButMinimal();
    await this.updateAppJsonMinimal();
    
    console.log(`✅ Minimal test created with ${this.minimal.length} drivers`);
    console.log('🎯 Run: homey app validate');
  }

  async moveAllButMinimal() {
    console.log('📁 Moving all but minimal drivers...');
    
    const driversPath = './drivers';
    const backupPath = './drivers_minimal_backup';
    
    fs.mkdirSync(backupPath, { recursive: true });
    
    const allDrivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driver of allDrivers) {
      if (!this.minimal.includes(driver)) {
        const sourcePath = path.join(driversPath, driver);
        const targetPath = path.join(backupPath, driver);
        
        fs.renameSync(sourcePath, targetPath);
        console.log(`  📦 ${driver}`);
        this.moved.push(driver);
      }
    }
    
    console.log(`📊 Moved ${this.moved.length} drivers, kept ${this.minimal.length}\n`);
  }

  async updateAppJsonMinimal() {
    const appConfig = {
      "main": "app.js",
      "id": "com.dlnraja.ultimate.zigbee.hub",
      "version": "4.0.5-minimal",
      "compatibility": ">=8.0.0",
      "category": ["lights"],
      "name": {
        "en": "Ultimate Zigbee Hub (Minimal Test)",
        "fr": "Hub Zigbee Ultime (Test Minimal)", 
        "nl": "Ultieme Zigbee Hub (Minimale Test)"
      },
      "description": {
        "en": "Minimal validation test with 2 essential drivers",
        "fr": "Test de validation minimal avec 2 pilotes essentiels",
        "nl": "Minimale validatietest met 2 essentiële drivers"
      },
      "author": {
        "name": "dlnraja",
        "email": "dylan.rajasekaram@gmail.com"
      },
      "support": "mailto:dylan.rajasekaram@gmail.com",
      "homepage": "https://github.com/dlnraja/tuya_repair",
      "license": "MIT",
      "platforms": ["local"],
      "connectivity": ["zigbee"],
      "permissions": [
        "homey:manager:api"
      ],
      "brandColor": "#00A0DC"
    };

    fs.writeFileSync('./app.json', JSON.stringify(appConfig, null, 2));
    console.log('📄 Minimal app.json created');
  }
}

new MinimalTestCreator().createMinimalTest().catch(console.error);
