// CYCLE 2/10: UNBRANDING COMPLET DES DRIVERS
const fs = require('fs').promises;

class Cycle2Unbranding {
  constructor() {
    this.brandedDrivers = [
      { old: 'dimmer_switch_moes_timer', new: 'dimmer_switch_timer_module' },
      { old: 'energy_monitoring_plug_nedis', new: 'energy_monitoring_plug_advanced' },
      { old: 'led_strip_woodupp', new: 'led_strip_advanced' },
      { old: 'motion_sensor_hobeian', new: 'motion_sensor_zigbee_204z' },
      { old: 'switch_4gang_girier', new: 'switch_4gang_battery_cr2032' },
      { old: 'temp_sensor_owon', new: 'temperature_sensor_advanced' },
      { old: 'temperature_humidity_sensor_ewelink', new: 'temp_humid_sensor_leak_detector' },
      { old: 'temperature_sensor_ewelink', new: 'temperature_sensor_leak_combo' },
      { old: 'water_leak_detector_ewelink', new: 'water_leak_detector_sq510a' }
    ];
  }

  async executeCycle2Unbranding() {
    console.log('🏷️ CYCLE 2/10: UNBRANDING DRIVERS...');
    
    for (const driver of this.brandedDrivers) {
      await this.unbrandDriver(driver);
    }
    
    console.log('✅ UNBRANDING COMPLETE');
  }

  async unbrandDriver(driver) {
    const oldPath = `drivers/${driver.old}`;
    const newPath = `drivers/${driver.new}`;
    
    try {
      // Check if old driver exists
      await fs.access(oldPath);
      
      // Check if new path already exists
      try {
        await fs.access(newPath);
        console.log(`⚠️ ${driver.new} already exists, skipping rename`);
        return;
      } catch (e) {
        // Good, new path doesn't exist
      }
      
      // Rename directory
      await fs.rename(oldPath, newPath);
      console.log(`✅ Renamed: ${driver.old} → ${driver.new}`);
      
      // Update driver.compose.json ID
      await this.updateDriverId(newPath, driver.new);
      
    } catch (e) {
      console.log(`⚠️ Could not unbrand ${driver.old}: ${e.message}`);
    }
  }

  async updateDriverId(driverPath, newId) {
    const composePath = `${driverPath}/driver.compose.json`;
    
    try {
      const data = JSON.parse(await fs.readFile(composePath, 'utf8'));
      data.id = newId;
      
      // Also update the name to be more generic
      if (data.name && data.name.en) {
        data.name.en = data.name.en.replace(/MOES|Nedis|WoodUpp|HOBEIAN|GIRIER|Owon|EweLink/gi, '').trim();
        data.name.en = data.name.en.replace(/\s+/g, ' '); // Clean multiple spaces
      }
      
      await fs.writeFile(composePath, JSON.stringify(data, null, 2));
      console.log(`  ↳ Updated driver ID and name for ${newId}`);
      
    } catch (e) {
      console.log(`  ↳ Could not update compose file: ${e.message}`);
    }
  }
}

if (require.main === module) {
  new Cycle2Unbranding().executeCycle2Unbranding().catch(console.error);
}

module.exports = Cycle2Unbranding;
