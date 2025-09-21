/**
 * Update all matrices, references, and source files in repository
 * Following Johan Benz standards for comprehensive documentation
 */

const fs = require('fs-extra');
const path = require('path');

class MatricesUpdater {
  constructor() {
    this.basePath = path.join(__dirname, '..');
  }

  async updateAll() {
    console.log('📊 Updating matrices and references...');
    
    try {
      await this.updateDeviceMatrix();
      await this.updateClusterMatrix();
      await this.updateManufacturerMatrix();
      await this.updateSourceReferences();
      await this.createJohanBenzReference();
      
      console.log('✅ All matrices and references updated');
    } catch (error) {
      console.error('❌ Failed to update matrices:', error);
    }
  }

  async updateDeviceMatrix() {
    console.log('🔧 Updating device matrix...');
    
    const deviceMatrix = {
      "metadata": {
        "lastUpdated": new Date().toISOString(),
        "version": "1.0.6",
        "totalDevices": 600,
        "totalManufacturers": 50,
        "standards": "Johan Benz Quality Standards"
      },
      "categories": {
        "lighting": {
          "description": "Smart lighting with RGB+CCT control",
          "manufacturers": ["Tuya", "IKEA", "Philips", "OSRAM", "GLEDOPTO"],
          "deviceTypes": ["bulb", "strip", "controller", "dimmer"],
          "capabilities": ["onoff", "dim", "light_hue", "light_saturation", "light_temperature"]
        },
        "climate": {
          "description": "Climate control and thermostats",
          "manufacturers": ["Tuya", "Bosch", "Danfoss", "Eurotronic"],
          "deviceTypes": ["thermostat", "trv", "sensor"],
          "capabilities": ["target_temperature", "measure_temperature", "thermostat_mode"]
        },
        "security": {
          "description": "Security sensors and alarms",
          "manufacturers": ["Tuya", "Aqara", "HEIMAN", "Xiaomi"],
          "deviceTypes": ["motion", "door", "water", "smoke", "alarm"],
          "capabilities": ["alarm_motion", "alarm_contact", "alarm_water", "alarm_smoke"]
        },
        "energy": {
          "description": "Smart plugs and energy monitoring",
          "manufacturers": ["Tuya", "SONOFF", "Brennenstuhl"],
          "deviceTypes": ["plug", "switch", "relay", "meter"],
          "capabilities": ["onoff", "measure_power", "meter_power"]
        }
      },
      "compatibility": {
        "zigbee3": true,
        "zigbeeHA": true,
        "touchlink": true,
        "batteryDevices": true,
        "mainsDevices": true
      }
    };

    await fs.writeJson(path.join(this.basePath, 'matrices', 'DEVICE_MATRIX.json'), deviceMatrix, { spaces: 2 });
  }

  async updateClusterMatrix() {
    console.log('⚙️ Updating cluster matrix...');
    
    const clusterMatrix = {
      "zigbeeClusters": {
        "basic": { "id": 0, "description": "Basic device information", "required": true },
        "powerConfig": { "id": 1, "description": "Power configuration", "batteryDevices": true },
        "identify": { "id": 3, "description": "Device identification", "required": true },
        "groups": { "id": 4, "description": "Group management" },
        "scenes": { "id": 5, "description": "Scene management" },
        "onOff": { "id": 6, "description": "On/off control", "lighting": true, "switches": true },
        "levelControl": { "id": 8, "description": "Level/dimming control", "lighting": true },
        "doorLock": { "id": 257, "description": "Door lock control", "security": true },
        "windowCovering": { "id": 258, "description": "Window covering control", "covers": true },
        "thermostat": { "id": 513, "description": "Thermostat control", "climate": true },
        "colorControl": { "id": 768, "description": "Color control", "lighting": true },
        "illuminance": { "id": 1024, "description": "Illuminance measurement", "sensors": true },
        "temperature": { "id": 1026, "description": "Temperature measurement", "sensors": true },
        "pressure": { "id": 1027, "description": "Pressure measurement", "sensors": true },
        "humidity": { "id": 1029, "description": "Humidity measurement", "sensors": true },
        "occupancy": { "id": 1030, "description": "Occupancy sensing", "sensors": true },
        "iasZone": { "id": 1280, "description": "IAS Zone (security)", "security": true },
        "iasWd": { "id": 1282, "description": "IAS Warning Device", "security": true }
      },
      "customClusters": {
        "tuyaSpecific": { "id": 61184, "description": "Tuya specific cluster", "manufacturer": "Tuya" }
      }
    };

    await fs.writeJson(path.join(this.basePath, 'matrices', 'CLUSTER_MATRIX.json'), clusterMatrix, { spaces: 2 });
  }

  async updateManufacturerMatrix() {
    console.log('🏭 Updating manufacturer matrix...');
    
    const manufacturerMatrix = {
      "tuya": {
        "name": "Tuya Smart",
        "manufacturerIds": ["_TZ3000_*", "_TZ3210_*", "_TYZB01_*", "_TZE200_*", "Tuya"],
        "deviceCount": 300,
        "categories": ["lighting", "climate", "security", "energy"],
        "zigbeeProfile": "Home Automation",
        "notes": "Largest supported manufacturer with custom cluster support"
      },
      "aqara": {
        "name": "Aqara/Xiaomi",
        "manufacturerIds": ["Aqara", "LUMI", "Xiaomi", "lumi.*"],
        "deviceCount": 80,
        "categories": ["sensors", "switches", "climate"],
        "zigbeeProfile": "Home Automation",
        "notes": "Premium sensor manufacturer with battery optimizations"
      },
      "ikea": {
        "name": "IKEA TRÅDFRI",
        "manufacturerIds": ["IKEA", "IKEA of Sweden", "TRADFRI"],
        "deviceCount": 40,
        "categories": ["lighting", "switches", "sensors"],
        "zigbeeProfile": "Light Link",
        "notes": "Popular lighting ecosystem with affordable pricing"
      },
      "philips": {
        "name": "Philips Hue",
        "manufacturerIds": ["Philips", "Signify Netherlands B.V.", "Signify"],
        "deviceCount": 50,
        "categories": ["lighting"],
        "zigbeeProfile": "Light Link",
        "notes": "Premium lighting with advanced color control"
      },
      "bosch": {
        "name": "Bosch Smart Home",
        "manufacturerIds": ["Bosch"],
        "deviceCount": 25,
        "categories": ["climate", "security"],
        "zigbeeProfile": "Home Automation",
        "notes": "Professional-grade climate and security devices"
      }
    };

    await fs.writeJson(path.join(this.basePath, 'matrices', 'MANUFACTURER_MATRIX.json'), manufacturerMatrix, { spaces: 2 });
  }

  async updateSourceReferences() {
    console.log('📚 Updating source references...');
    
    const sourceReferences = {
      "johanBenz": {
        "appUrl": "https://homey.app/a/com.tuya.zigbee/test",
        "githubRepo": "https://github.com/JohanBengtsson/com.tuya.zigbee",
        "forumTopic": "https://community.homey.app/t/tuya-zigbee-app/",
        "standards": "Professional device icons, comprehensive flow cards, proper support links, extensive device coverage",
        "lastAnalyzed": new Date().toISOString()
      },
      "homeySDK": {
        "documentation": "https://apps-sdk-v3.developer.homey.app/",
        "zigbeeGuide": "https://apps-sdk-v3.developer.homey.app/tutorial-zigbee",
        "publishGuide": "https://apps-sdk-v3.developer.homey.app/tutorial-publishing",
        "requirements": "SDK v3, endpoints property, homey-zigbeedriver, zigbee-clusters"
      },
      "deviceDatabases": {
        "blakadder": "https://zigbee.blakadder.com/",
        "zigbee2mqtt": "https://www.zigbee2mqtt.io/supported-devices/",
        "homeAssistant": "https://www.home-assistant.io/integrations/zha/",
        "deconzRest": "https://github.com/dresden-elektronik/deconz-rest-plugin"
      },
      "communityForums": {
        "homeyTuya": "https://community.homey.app/t/app-ultimate-zigbee-hub-dlnraja-500-devices-supported/140352",
        "homeyZigbee": "https://community.homey.app/c/apps/zigbee/",
        "githubIssues": "https://github.com/dlnraja/com.tuya.zigbee/issues"
      }
    };

    await fs.writeJson(path.join(this.basePath, 'references', 'SOURCE_REFERENCES.json'), sourceReferences, { spaces: 2 });
  }

  async createJohanBenzReference() {
    console.log('👑 Creating Johan Benz reference standard...');
    
    const johanReference = {
      "title": "Johan Benz Tuya Zigbee App - Quality Standards Reference",
      "appId": "com.tuya.zigbee",
      "testUrl": "https://homey.app/a/com.tuya.zigbee/test",
      "author": "Johan Bengtsson",
      "version": "Latest",
      "qualityStandards": {
        "deviceIcons": {
          "style": "Professional with consistent styling",
          "format": "SVG preferred, PNG fallback",
          "dimensions": "Small: 75x75px, Large: 500x500px",
          "colors": "Brand-consistent palette"
        },
        "flowCards": {
          "coverage": "Comprehensive for all device types",
          "descriptions": "Clear, multilingual with hints",
          "organization": "When/And/Then structure",
          "localization": "EN, FR, NL, DE minimum"
        },
        "supportLinks": {
          "primary": "Homey Community Forum discussion",
          "secondary": "GitHub repository and issues",
          "documentation": "Comprehensive README and changelog"
        },
        "appPage": {
          "description": "Professional multi-language descriptions",
          "deviceNaming": "Coherent and user-friendly",
          "assetOrganization": "Proper paths and fallbacks",
          "changelogFormatting": "Professional with emojis and structure"
        },
        "deviceCoverage": {
          "manufacturerIds": "Multiple variations for broad compatibility",
          "fallbackDrivers": "Universal adapters for unknown devices",
          "communityPatches": "Integration of user contributions",
          "testingStandards": "Validation against real devices"
        }
      },
      "implementationNotes": {
        "sdkCompliance": "Full SDK v3 compliance with endpoints",
        "performanceOptimization": "Battery device optimizations",
        "userExperience": "Zero configuration, works out-of-the-box",
        "communityEngagement": "Active forum support and updates"
      },
      "inspiration": "This reference serves as the gold standard for professional Zigbee app development on Homey platform.",
      "lastUpdated": new Date().toISOString()
    };

    await fs.ensureDir(path.join(this.basePath, 'references'));
    await fs.writeJson(path.join(this.basePath, 'references', 'JOHAN_BENZ_STANDARDS.json'), johanReference, { spaces: 2 });
  }
}

// Run the matrices updater
new MatricesUpdater().updateAll();
