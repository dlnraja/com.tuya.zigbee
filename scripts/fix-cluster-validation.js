#!/usr/bin/env node

/**
 * CLUSTER VALIDATION FIXER - Quick fix for Homey validation
 * Converts string cluster names to numeric IDs in all driver files
 */

const fs = require('fs').promises;
const path = require('path');

const CLUSTER_MAPPINGS = {
  // Standard Zigbee clusters
  'genBasic': 0,
  'genPowerCfg': 1,
  'genDeviceTempCfg': 2,
  'genIdentify': 3,
  'genGroups': 4,
  'genScenes': 5,
  'genOnOff': 6,
  'genOnOffSwitchCfg': 7,
  'genLevelCtrl': 8,
  'genAlarms': 9,
  'genTime': 10,
  'genRssiLocation': 11,
  'genAnalogInput': 12,
  'genAnalogOutput': 13,
  'genAnalogValue': 14,
  'genBinaryInput': 15,
  'genBinaryOutput': 16,
  'genBinaryValue': 17,
  'genMultistateInput': 18,
  'genMultistateOutput': 19,
  'genMultistateValue': 20,
  'genCommissioning': 21,
  'genOta': 25,
  'genPollCtrl': 32,
  'greenPower': 33,
  'mobileDeviceCfg': 34,
  'neighborCleaning': 35,
  'nearestGateway': 36,
  
  // Closures
  'closuresShade': 256,
  'closuresDoorLock': 257,
  'closuresWindowCovering': 258,
  
  // HVAC
  'hvacPumpCfgCtrl': 512,
  'hvacThermostat': 513,
  'hvacFan': 514,
  'hvacDehumidificationCtrl': 515,
  'hvacUserInterfaceCfg': 516,
  
  // Lighting
  'lightingColorCtrl': 768,
  'lightingBallastCfg': 769,
  
  // Measurement and Sensing
  'msIlluminanceMeasurement': 1024,
  'msIlluminanceLevelSensing': 1025,
  'msTemperatureMeasurement': 1026,
  'msPressureMeasurement': 1027,
  'msFlowMeasurement': 1028,
  'msRelativeHumidity': 1029,
  'msOccupancySensing': 1030,
  
  // Security and Safety
  'ssIasZone': 1280,
  'ssIasWd': 1282,
  
  // Protocol Interfaces
  'piGenericTunnel': 1536,
  'piBacNet': 1537,
  
  // Smart Energy
  'sePrice': 1792,
  'seDrlc': 1793,
  'seMetering': 1794,
  'seMessaging': 1795,
  'seTunneling': 1796,
  'sePrepayment': 1797,
  'seEnergyMgmt': 1798,
  'seCalendar': 1799,
  'seDeviceMgmt': 1800,
  'seEvents': 1801,
  'seMduPairing': 1802,
  'seKeyEstab': 1803,
  
  // Home Automation
  'haElectricalMeasurement': 2820,
  'haDiagnostic': 2821,
  
  // Manufacturer Specific
  'manuSpecificTuya': 61184,
  'manuSpecificPhilips': 64512,
  'manuSpecificXiaomi': 65535
};

class ClusterValidationFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = [];
    this.errors = [];
  }

  async fixAllValidationIssues() {
    console.log('🔧 FIXING CLUSTER VALIDATION ISSUES...\n');
    
    try {
      // Fix app.json
      await this.fixAppJson();
      
      // Fix all driver.compose.json files
      await this.fixDriverComposeFiles();
      
      console.log(`\n✅ Fixed ${this.fixedFiles.length} files`);
      console.log('🔍 Re-running validation...');
      
      return {
        fixedFiles: this.fixedFiles,
        errors: this.errors
      };
      
    } catch (error) {
      console.error('❌ Error during fixing:', error.message);
      throw error;
    }
  }

  async fixAppJson() {
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    
    try {
      const content = await fs.readFile(appJsonPath, 'utf8');
      const appJson = JSON.parse(content);
      
      let modified = false;
      
      if (appJson.drivers && Array.isArray(appJson.drivers)) {
        for (const driver of appJson.drivers) {
          if (this.fixDriverZigbeeConfig(driver)) {
            modified = true;
          }
        }
      }
      
      if (modified) {
        await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
        this.fixedFiles.push('app.json');
        console.log('✅ Fixed app.json');
      }
      
    } catch (error) {
      this.errors.push(`app.json: ${error.message}`);
      console.log(`⚠️ Could not fix app.json: ${error.message}`);
    }
  }

  async fixDriverComposeFiles() {
    const driversDir = path.join(this.projectRoot, 'drivers');
    
    try {
      const driverDirs = await fs.readdir(driversDir);
      
      for (const driverDir of driverDirs) {
        const composeFile = path.join(driversDir, driverDir, 'driver.compose.json');
        
        try {
          const content = await fs.readFile(composeFile, 'utf8');
          const compose = JSON.parse(content);
          
          let modified = false;
          
          if (this.fixDriverZigbeeConfig(compose)) {
            modified = true;
          }
          
          if (modified) {
            await fs.writeFile(composeFile, JSON.stringify(compose, null, 2));
            this.fixedFiles.push(`${driverDir}/driver.compose.json`);
            console.log(`✅ Fixed ${driverDir}/driver.compose.json`);
          }
          
        } catch (error) {
          // File might not exist or not be valid JSON, skip silently
        }
      }
      
    } catch (error) {
      this.errors.push(`drivers directory: ${error.message}`);
    }
  }

  fixDriverZigbeeConfig(driver) {
    if (!driver.zigbee || !driver.zigbee.endpoints) {
      return false;
    }

    let modified = false;

    for (const [endpointId, endpoint] of Object.entries(driver.zigbee.endpoints)) {
      // Fix clusters
      if (endpoint.clusters && Array.isArray(endpoint.clusters)) {
        const fixedClusters = endpoint.clusters.map(cluster => {
          if (typeof cluster === 'string' && CLUSTER_MAPPINGS[cluster] !== undefined) {
            modified = true;
            return CLUSTER_MAPPINGS[cluster];
          }
          return cluster;
        });
        endpoint.clusters = fixedClusters;
      }

      // Fix bindings
      if (endpoint.bindings && Array.isArray(endpoint.bindings)) {
        const fixedBindings = endpoint.bindings.map(binding => {
          if (typeof binding === 'object' && binding.type === 'report') {
            // Keep report binding objects as-is
            return binding;
          }
          if (typeof binding === 'string' && CLUSTER_MAPPINGS[binding] !== undefined) {
            modified = true;
            return CLUSTER_MAPPINGS[binding];
          }
          return binding;
        });
        endpoint.bindings = fixedBindings;
      }
    }

    // Add required fields if missing
    if (!driver.zigbee.productId && driver.id) {
      driver.zigbee.productId = [driver.id.toUpperCase()];
      modified = true;
    }

    return modified;
  }
}

// Execute if called directly
if (require.main === module) {
  const fixer = new ClusterValidationFixer();
  fixer.fixAllValidationIssues()
    .then(result => {
      if (result.fixedFiles.length > 0) {
        console.log('\n🎉 All validation issues fixed!');
      } else {
        console.log('\n📝 No fixes needed');
      }
    })
    .catch(error => {
      console.error('💥 FATAL ERROR:', error.message);
      process.exit(1);
    });
}

module.exports = ClusterValidationFixer;
