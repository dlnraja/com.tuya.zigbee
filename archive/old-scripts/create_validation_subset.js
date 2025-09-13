const fs = require('fs');
const path = require('path');

class ValidationSubsetCreator {
  constructor() {
    this.essential = [];
    this.moved = [];
    this.errors = [];
  }

  async createValidationSubset() {
    console.log('🔧 Creating validation subset with essential drivers only...\n');
    
    // 1. Define essential drivers for validation testing
    await this.defineEssentialDrivers();
    
    // 2. Move non-essential drivers to temporary backup
    await this.moveNonEssentialDrivers();
    
    // 3. Update app.json for subset
    await this.updateAppJsonForSubset();
    
    // 4. Generate report
    this.generateReport();
  }

  async defineEssentialDrivers() {
    console.log('📋 Defining essential drivers for validation...');
    
    // Essential drivers that represent different categories and configurations
    this.essential = [
      // Light drivers - representative of different configurations
      'ikea_tradfri_bulb',           // Standard light with color temperature
      'tuya_light_ts0501a',          // Basic dimmable Tuya light
      'tuya_light_universal',        // Universal light driver
      
      // Sensor drivers - key sensor types
      'aqara_motion_sensor',         // Motion sensor
      'tuya_radar_sensor',           // Advanced sensor with AI features
      'tuya_soil_sensor',            // Environmental sensor
      
      // Switch/Plug drivers
      'tuya-ts011f',                 // Smart plug with power monitoring
      'tuya_generic_switch',         // Generic switch
      
      // Climate/Thermostat
      'TS0601_climate',              // Climate control
      'tuya_thermostat',             // Thermostat
      
      // Lock
      'TS0601_lock',                 // Smart lock
      
      // Fallback/Universal
      'tuya_generic_fallback',       // AI-enhanced fallback driver
      
      // Special purpose
      'TS0601_cover'                 // Cover/blind controller
    ];
    
    console.log(`📊 Selected ${this.essential.length} essential drivers for validation:`);
    for (const driver of this.essential) {
      console.log(`  - ${driver}`);
    }
    console.log('');
  }

  async moveNonEssentialDrivers() {
    console.log('📁 Moving non-essential drivers to temporary backup...');
    
    const driversPath = './drivers';
    const backupPath = './drivers_validation_backup';
    
    // Create backup directory
    fs.mkdirSync(backupPath, { recursive: true });
    
    // Get all current drivers
    const allDrivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    // Move non-essential drivers
    for (const driver of allDrivers) {
      if (!this.essential.includes(driver)) {
        const sourcePath = path.join(driversPath, driver);
        const targetPath = path.join(backupPath, driver);
        
        try {
          // Move directory
          fs.renameSync(sourcePath, targetPath);
          console.log(`  📦 Moved to backup: ${driver}`);
          this.moved.push(driver);
        } catch (error) {
          console.log(`  ❌ Failed to move ${driver}: ${error.message}`);
          this.errors.push(`${driver}: ${error.message}`);
        }
      }
    }
    
    console.log(`📊 Moved ${this.moved.length} drivers to validation backup\n`);
  }

  async updateAppJsonForSubset() {
    console.log('📝 Updating app.json for validation subset...');
    
    const appConfig = {
      "main": "app.js",
      "id": "com.dlnraja.ultimate.zigbee.hub",
      "version": "4.0.4-validation",
      "compatibility": ">=8.0.0",
      "category": ["lights", "security"],
      "name": {
        "en": "Ultimate Zigbee Hub (Validation Subset)",
        "fr": "Hub Zigbee Ultime (Sous-ensemble de Validation)", 
        "nl": "Ultieme Zigbee Hub (Validatie Subset)"
      },
      "description": {
        "en": `Comprehensive Zigbee device support - Validation subset with ${this.essential.length} essential drivers`,
        "fr": `Support complet des appareils Zigbee - Sous-ensemble de validation avec ${this.essential.length} pilotes essentiels`,
        "nl": `Uitgebreide Zigbee apparaat ondersteuning - Validatie subset met ${this.essential.length} essentiële drivers`
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
        "en": ["tuya", "zigbee", "smart-home", "iot", "validation", "subset"],
        "fr": ["tuya", "zigbee", "maison-intelligente", "iot", "validation", "sous-ensemble"],
        "nl": ["tuya", "zigbee", "slim-huis", "iot", "validatie", "subset"]
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

    // Write the subset app.json
    fs.writeFileSync('./app.json', JSON.stringify(appConfig, null, 2));
    
    console.log(`📄 Updated app.json for validation subset (${this.essential.length} drivers)`);
  }

  generateReport() {
    console.log('\n📊 VALIDATION SUBSET SUMMARY:');
    console.log(`✅ Essential drivers kept: ${this.essential.length}`);
    console.log(`📦 Drivers moved to backup: ${this.moved.length}`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      for (const error of this.errors) {
        console.log(`  - ${error}`);
      }
    }
    
    console.log('\n📋 ESSENTIAL DRIVERS FOR VALIDATION:');
    for (const driver of this.essential) {
      console.log(`  ✅ ${driver}`);
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      essential: this.essential,
      moved: this.moved,
      errors: this.errors,
      purpose: 'validation_subset'
    };
    
    fs.writeFileSync('./validation_subset_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved: validation_subset_report.json');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Run: homey app validate');
    console.log('2. If validation passes, gradually add more drivers');
    console.log('3. To restore all drivers, run restore script');
  }
}

// Run the subset creation
const creator = new ValidationSubsetCreator();
creator.createValidationSubset().catch(console.error);
