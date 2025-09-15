const fs = require('fs');
const path = require('path');

class AppJsonRegenerator {
  constructor() {
    this.discoveredDrivers = [];
  }

  async regenerateAppJson() {
    console.log('🔄 Regenerating app.json from driver structure...\n');

    // 1. Scan drivers folder structure
    await this.scanDriversStructure();

    // 2. Generate new app.json
    await this.generateAppJson();

    console.log(`✅ app.json regenerated with ${this.discoveredDrivers.length} drivers`);
  }

  async scanDriversStructure() {
    console.log('🔍 Scanning drivers structure...');
    
    const driversPath = './drivers';
    if (!fs.existsSync(driversPath)) {
      throw new Error('Drivers directory not found');
    }

    const categories = fs.readdirSync(driversPath, { withFileTypes: true });

    for (const category of categories) {
      if (!category.isDirectory()) continue;

      const categoryPath = path.join(driversPath, category.name);
      const drivers = fs.readdirSync(categoryPath, { withFileTypes: true });

      for (const driver of drivers) {
        if (!driver.isDirectory()) continue;

        const driverPath = path.join(categoryPath, driver.name);
        const composeFile = path.join(driverPath, 'driver.compose.json');

        if (fs.existsSync(composeFile)) {
          try {
            const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
            const driverInfo = {
              id: config.id || driver.name,
              category: category.name,
              path: `${category.name}/${driver.name}`,
              config: config
            };
            
            this.discoveredDrivers.push(driverInfo);
            console.log(`  📁 Found: ${driverInfo.id} (${category.name})`);
          } catch (error) {
            console.log(`  ⚠️ Invalid compose file: ${driverPath}`);
          }
        }
      }
    }

    console.log(`📊 Discovered ${this.discoveredDrivers.length} drivers total\n`);
  }

  async generateAppJson() {
    console.log('📝 Generating new app.json...');

    const baseAppConfig = {
      "main": "app.js",
      "id": "com.dlnraja.ultimate.zigbee.hub",
      "version": "4.0.2",
      "compatibility": ">=8.0.0",
      "category": ["lights", "security"],
      "name": {
        "en": "Ultimate Zigbee Hub",
        "fr": "Hub Zigbee Ultime", 
        "nl": "Ultieme Zigbee Hub"
      },
      "description": {
        "en": "Comprehensive Zigbee device support for Homey with advanced features and AI-enhanced drivers",
        "fr": "Support complet des appareils Zigbee pour Homey avec fonctionnalités avancées et pilotes améliorés par IA",
        "nl": "Uitgebreide Zigbee apparaat ondersteuning voor Homey met geavanceerde functies en AI-verbeterde drivers"
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

    // Sort drivers by category and ID for consistent ordering
    const sortedDrivers = this.discoveredDrivers.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.id.localeCompare(b.id);
    });

    // Convert to driver array (just IDs since drivers are in folders)
    baseAppConfig.drivers = sortedDrivers.map(driver => driver.path);

    // Add flow definitions
    baseAppConfig.flow = {
      "triggers": [
        {
          "id": "device_data_received",
          "title": {
            "en": "Device data received",
            "fr": "Données de l'appareil reçues",
            "nl": "Apparaatgegevens ontvangen"
          },
          "args": [
            {
              "name": "device",
              "type": "device",
              "filter": "driver_id=tuya_generic_fallback"
            }
          ],
          "tokens": [
            {
              "name": "datapoint",
              "type": "string",
              "title": {
                "en": "Datapoint",
                "fr": "Point de données", 
                "nl": "Datapunt"
              }
            },
            {
              "name": "value",
              "type": "string", 
              "title": {
                "en": "Value",
                "fr": "Valeur",
                "nl": "Waarde"
              }
            }
          ]
        }
      ],
      "conditions": [
        {
          "id": "device_has_capability",
          "title": {
            "en": "Device has capability",
            "fr": "L'appareil a la capacité",
            "nl": "Apparaat heeft functionaliteit"
          },
          "args": [
            {
              "name": "device",
              "type": "device"
            },
            {
              "name": "capability",
              "type": "autocomplete",
              "placeholder": {
                "en": "Select capability",
                "fr": "Sélectionner la capacité",
                "nl": "Selecteer functionaliteit"
              }
            }
          ]
        }
      ],
      "actions": [
        {
          "id": "set_generic_value",
          "title": {
            "en": "Set generic value",
            "fr": "Définir la valeur générique",
            "nl": "Generieke waarde instellen"
          },
          "args": [
            {
              "name": "device",
              "type": "device",
              "filter": "driver_id=tuya_generic_fallback"
            },
            {
              "name": "datapoint",
              "type": "number",
              "min": 1,
              "max": 255,
              "placeholder": {
                "en": "Datapoint ID",
                "fr": "ID du point de données",
                "nl": "Datapunt ID"
              }
            },
            {
              "name": "value",
              "type": "text",
              "placeholder": {
                "en": "Value",
                "fr": "Valeur", 
                "nl": "Waarde"
              }
            }
          ]
        }
      ]
    };

    // Add category statistics to description
    const categoryStats = {};
    for (const driver of sortedDrivers) {
      categoryStats[driver.category] = (categoryStats[driver.category] || 0) + 1;
    }

    const statsText = Object.entries(categoryStats)
      .map(([cat, count]) => `${count} ${cat}`)
      .join(', ');

    baseAppConfig.description.en += ` | Includes: ${statsText} drivers`;
    baseAppConfig.description.fr += ` | Comprend: ${statsText} pilotes`;
    baseAppConfig.description.nl += ` | Bevat: ${statsText} drivers`;

    // Write the new app.json
    fs.writeFileSync('./app.json', JSON.stringify(baseAppConfig, null, 2));
    
    console.log('📄 New app.json structure:');
    console.log(`  - ${sortedDrivers.length} drivers total`);
    for (const [category, count] of Object.entries(categoryStats)) {
      console.log(`  - ${category}: ${count} drivers`);
    }
  }
}

// Run the regeneration
const regenerator = new AppJsonRegenerator();
regenerator.regenerateAppJson().catch(console.error);
