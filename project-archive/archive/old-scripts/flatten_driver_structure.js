const fs = require('fs');
const path = require('path');

class DriverStructureFlattener {
  constructor() {
    this.moved = [];
    this.errors = [];
  }

  async flattenDriverStructure() {
    console.log('🔧 Flattening driver structure for Homey compatibility...\n');
    
    // 1. Move all drivers from category folders to root drivers folder
    await this.moveDriversToRoot();
    
    // 2. Clean up empty category folders
    await this.cleanupCategoryFolders();
    
    // 3. Generate new app.json without driver paths
    await this.generateCleanAppJson();
    
    // 4. Generate final report
    this.generateReport();
  }

  async moveDriversToRoot() {
    console.log('📁 Moving drivers from category folders to root...');
    
    const driversPath = './drivers';
    const newDriversPath = './drivers_flat';
    
    // Create temporary flat structure
    fs.mkdirSync(newDriversPath, { recursive: true });
    
    const categories = ['light', 'sensor', 'switch', 'thermostat', 'lock', 'other'];
    
    for (const category of categories) {
      const categoryPath = path.join(driversPath, category);
      
      if (!fs.existsSync(categoryPath)) continue;
      
      const drivers = fs.readdirSync(categoryPath, { withFileTypes: true });
      
      for (const driver of drivers) {
        if (!driver.isDirectory()) continue;
        
        const sourcePath = path.join(categoryPath, driver.name);
        const targetPath = path.join(newDriversPath, driver.name);
        
        try {
          // Check if driver has compose file
          const composeFile = path.join(sourcePath, 'driver.compose.json');
          if (!fs.existsSync(composeFile)) {
            console.log(`  ⚠️ Skipping ${driver.name}: no compose file`);
            continue;
          }
          
          // Copy entire driver directory
          this.copyDirectory(sourcePath, targetPath);
          console.log(`  ✅ Moved: ${category}/${driver.name} -> ${driver.name}`);
          this.moved.push(`${category}/${driver.name} -> ${driver.name}`);
          
        } catch (error) {
          console.log(`  ❌ Failed to move ${driver.name}: ${error.message}`);
          this.errors.push(`${driver.name}: ${error.message}`);
        }
      }
    }
    
    // Replace old structure with flat structure
    if (fs.existsSync(driversPath)) {
      fs.rmSync(driversPath, { recursive: true, force: true });
    }
    fs.renameSync(newDriversPath, driversPath);
    
    console.log(`📊 Moved ${this.moved.length} drivers to flat structure\n`);
  }

  copyDirectory(source, target) {
    if (!fs.existsSync(source)) {
      throw new Error(`Source directory does not exist: ${source}`);
    }
    
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

  async cleanupCategoryFolders() {
    console.log('🧹 Structure is now flat, no category cleanup needed');
  }

  async generateCleanAppJson() {
    console.log('📝 Generating clean app.json...');
    
    const driversPath = './drivers';
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name)
      .sort();

    const appConfig = {
      "main": "app.js",
      "id": "com.dlnraja.ultimate.zigbee.hub",
      "version": "4.0.3",
      "compatibility": ">=8.0.0",
      "category": ["lights", "security"],
      "name": {
        "en": "Ultimate Zigbee Hub",
        "fr": "Hub Zigbee Ultime", 
        "nl": "Ultieme Zigbee Hub"
      },
      "description": {
        "en": `Comprehensive Zigbee device support for Homey with ${drivers.length} AI-enhanced drivers`,
        "fr": `Support complet des appareils Zigbee pour Homey avec ${drivers.length} pilotes améliorés par IA`,
        "nl": `Uitgebreide Zigbee apparaat ondersteuning voor Homey met ${drivers.length} AI-verbeterde drivers`
      },
      "author": {
        "name": "dlnraja",
        "email": "dylan.rajasekaram@gmail.com"
      },
      "contributors": {
        "developers": ["dlnraja"],
        "homey_community": ["Johan Benz", "Community Contributors"],
        "ai_enhancement": ["Comprehensive AI Analysis & Enhancement"]
      },
      "support": "mailto:dylan.rajasekaram@gmail.com",
      "homepage": "https://github.com/dlnraja/tuya_repair",
      "bugs": {
        "url": "https://github.com/dlnraja/tuya_repair/issues"
      },
      "license": "MIT",
      "platforms": ["local"],
      "connectivity": ["zigbee"],
      "tags": {
        "en": ["tuya", "zigbee", "smart-home", "iot", "sensors", "lights", "switches", "ai-enhanced"],
        "fr": ["tuya", "zigbee", "maison-intelligente", "iot", "capteurs", "éclairage", "interrupteurs", "amélioré-ia"],
        "nl": ["tuya", "zigbee", "slim-huis", "iot", "sensoren", "verlichting", "schakelaars", "ai-verbeterd"]
      },
      "permissions": [
        "homey:manager:api"
      ],
      "api": {
        "getDevices": {
          "method": "GET",
          "path": "/devices"
        },
        "getDrivers": {
          "method": "GET", 
          "path": "/drivers"
        }
      },
      "brandColor": "#00A0DC",
      "source": "https://github.com/dlnraja/tuya_repair.git"
    };

    // Write the clean app.json (drivers will be auto-detected by Homey)
    fs.writeFileSync('./app.json', JSON.stringify(appConfig, null, 2));
    
    console.log(`📄 Clean app.json generated (${drivers.length} drivers will be auto-detected)`);
    console.log(`   Drivers: ${drivers.slice(0, 5).join(', ')}${drivers.length > 5 ? '...' : ''}`);
  }

  generateReport() {
    console.log('\n📊 DRIVER STRUCTURE FLATTEN SUMMARY:');
    console.log(`✅ Successfully moved: ${this.moved.length}`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      for (const error of this.errors) {
        console.log(`  - ${error}`);
      }
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      moved: this.moved,
      errors: this.errors,
      structure: 'flat'
    };
    
    fs.writeFileSync('./driver_flatten_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved: driver_flatten_report.json');
  }
}

// Run the flattening
const flattener = new DriverStructureFlattener();
flattener.flattenDriverStructure().catch(console.error);
