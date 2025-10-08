// ENRICHISSEMENT BASÉ SUR ISSUES JOHAN BENDZ - PHASE 3
const fs = require('fs').promises;

class JohanIssuesEnrichment {
  constructor() {
    this.discoveredDevices = [
      {
        manufacturerId: '_TZE284_uqfph8ah',
        deviceType: 'roller_shutter_switch',
        model: 'TS0601',
        source: 'Johan Bendz Issue #1286'
      },
      {
        manufacturerId: '_TZE284_myd45weu', 
        deviceType: 'soil_tester_temp_humid',
        model: 'TS0601',
        source: 'Johan Bendz Issue #1280'
      },
      {
        manufacturerId: '_TZE284_n4ttsck2',
        deviceType: 'smoke_detector',
        model: 'TZE284_n4ttsck2',
        source: 'Johan Bendz Issue #1279'
      }
    ];
  }

  async enrichDrivers() {
    console.log('🔍 ENRICHISSEMENT DRIVERS AVEC ISSUES JOHAN BENDZ...');
    
    for (const device of this.discoveredDevices) {
      await this.addToRelevantDriver(device);
    }
  }

  async addToRelevantDriver(device) {
    const driverMapping = {
      'roller_shutter_switch': ['roller_shutter_switch', 'roller_blind_controller'],
      'soil_tester_temp_humid': ['soil_moisture_temperature_sensor', 'soil_tester_temp_humid'],
      'smoke_detector': ['smoke_detector', 'smoke_detector_temp_humidity_advanced']
    };

    const possibleDrivers = driverMapping[device.deviceType] || [];
    
    for (const driverName of possibleDrivers) {
      const driverPath = `drivers/${driverName}/driver.compose.json`;
      
      try {
        const driverData = JSON.parse(await fs.readFile(driverPath, 'utf8'));
        
        if (driverData.zigbee?.manufacturerName) {
          const existing = Array.isArray(driverData.zigbee.manufacturerName) 
            ? driverData.zigbee.manufacturerName 
            : [driverData.zigbee.manufacturerName];
          
          if (!existing.includes(device.manufacturerId)) {
            existing.push(device.manufacturerId);
            driverData.zigbee.manufacturerName = existing;
            
            await fs.writeFile(driverPath, JSON.stringify(driverData, null, 2));
            console.log(`✅ Added ${device.manufacturerId} to ${driverName} (${device.source})`);
          }
        }
      } catch (e) {
        // Driver doesn't exist, skip
      }
    }
  }
}

// Execute enrichment
new JohanIssuesEnrichment().enrichDrivers().catch(console.error);
