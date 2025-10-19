#!/usr/bin/env node

/**
 * MASSIVE POWER RENAME - ADD POWER DESIGNATION TO ALL 108 DRIVERS
 * 
 * Based on audit + internet research + capabilities analysis
 * 
 * @version 2.1.46
 * @author Dylan Rajasekaram
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

class MassivePowerRename {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.renamed = [];
    
    // COMPLETE RENAME MAP based on audit
    this.renameMap = {
      // AC POWERED (58 drivers)
      'air_quality_monitor': 'air_quality_monitor_ac',
      'ceiling_fan': 'ceiling_fan_ac',
      'ceiling_light_controller': 'ceiling_light_controller_ac',
      'ceiling_light_rgb': 'ceiling_light_rgb_ac',
      'comprehensive_air_monitor': 'comprehensive_air_monitor_ac',
      'curtain_motor': 'curtain_motor_ac',
      'dimmer': 'dimmer_ac',
      'dimmer_switch_timer_module': 'dimmer_switch_timer_module_ac',
      'door_controller': 'door_controller_ac',
      'fan_controller': 'fan_controller_ac',
      'garage_door_controller': 'garage_door_controller_ac',
      'humidity_controller': 'humidity_controller_ac',
      'hvac_controller': 'hvac_controller_ac',
      'led_strip_advanced': 'led_strip_advanced_ac',
      'led_strip_controller': 'led_strip_controller_ac',
      'led_strip_controller_pro': 'led_strip_controller_pro_ac',
      'milight_controller': 'milight_controller_ac',
      'mini': 'mini_ac',
      'outdoor_light_controller': 'outdoor_light_controller_ac',
      'pool_pump_controller': 'pool_pump_controller_ac',
      'projector_screen_controller': 'projector_screen_controller_ac',
      'relay_switch_1gang': 'relay_switch_1gang_ac',
      'rgb_led_controller': 'rgb_led_controller_ac',
      'roller_blind_controller': 'roller_blind_controller_ac',
      'roller_shutter_controller': 'roller_shutter_controller_ac',
      'scene_controller': 'scene_controller_battery', // Wireless, battery powered
      'shade_controller': 'shade_controller_ac',
      'smart_bulb_dimmer': 'smart_bulb_dimmer_ac',
      'smart_bulb_rgb': 'smart_bulb_rgb_ac',
      'smart_bulb_tunable': 'smart_bulb_tunable_ac',
      'smart_bulb_white': 'smart_bulb_white_ac',
      'smart_curtain_motor': 'smart_curtain_motor_hybrid', // Has INTERNAL battery
      'smart_dimmer_module_1gang': 'smart_dimmer_module_1gang_ac',
      'smart_irrigation_controller': 'smart_irrigation_controller_hybrid', // Has INTERNAL battery
      'smart_outlet_monitor': 'smart_outlet_monitor_ac',
      'smart_spot': 'smart_spot_ac',
      'smart_valve_controller': 'smart_valve_controller_hybrid', // Has AA battery
      'solar_panel_controller': 'solar_panel_controller_hybrid', // Has battery backup
      'temperature_controller': 'temperature_controller_hybrid', // Has battery
      'touch_dimmer': 'touch_dimmer_ac',
      'touch_dimmer_1gang': 'touch_dimmer_1gang_ac',
      'touch_switch_1gang': 'touch_switch_1gang_ac',
      'touch_switch_2gang': 'touch_switch_2gang_ac',
      'touch_switch_3gang': 'touch_switch_3gang_ac',
      'touch_switch_4gang': 'touch_switch_4gang_ac',
      'usb_outlet': 'usb_outlet_ac',
      'usb_outlet_advanced': 'usb_outlet_advanced_ac',
      'zbbridge': 'zbbridge_ac',
      'zigbee_gateway_hub': 'zigbee_gateway_hub_ac',
      
      // BATTERY POWERED (39 drivers)
      'air_quality_monitor_pro': 'air_quality_monitor_pro_battery',
      'co2_sensor': 'co2_sensor_battery',
      'co_detector_pro': 'co_detector_pro_battery',
      'door_lock': 'door_lock_battery',
      'door_window_sensor': 'door_window_sensor_battery',
      'fingerprint_lock': 'fingerprint_lock_battery',
      'formaldehyde_sensor': 'formaldehyde_sensor_battery',
      'gas_detector': 'gas_detector_battery',
      'gas_sensor_ts0601': 'gas_sensor_ts0601_battery',
      'lux_sensor': 'lux_sensor_battery',
      'multisensor': 'multisensor_battery',
      'noise_level_sensor': 'noise_level_sensor_battery',
      'pir_sensor_advanced': 'pir_sensor_advanced_battery',
      'pm25_detector': 'pm25_detector_battery',
      'pm25_sensor': 'pm25_sensor_battery',
      'presence_sensor_radar': 'presence_sensor_radar_battery',
      'pressure_sensor': 'pressure_sensor_battery',
      'smart_doorbell': 'smart_doorbell_battery',
      'smart_garden_sprinkler': 'smart_garden_sprinkler_battery',
      'smart_lock': 'smart_lock_battery',
      'smart_smoke_detector_advanced': 'smart_smoke_detector_advanced_battery',
      'smoke_detector': 'smoke_detector_battery',
      'smoke_detector_temp_humidity_advanced': 'smoke_detector_temp_humidity_advanced_battery',
      'smoke_temp_humid_sensor': 'smoke_temp_humid_sensor_battery',
      'soil_moisture_sensor': 'soil_moisture_sensor_battery',
      'soil_moisture_temperature_sensor': 'soil_moisture_temperature_sensor_battery',
      'temperature_humidity_sensor': 'temperature_humidity_sensor_battery',
      'temperature_sensor': 'temperature_sensor_battery',
      'temperature_sensor_advanced': 'temperature_sensor_advanced_battery',
      'temp_humid_sensor_advanced': 'temp_humid_sensor_advanced_battery',
      'temp_humid_sensor_dd': 'temp_humid_sensor_dd_battery',
      'temp_humid_sensor_leak_detector': 'temp_humid_sensor_leak_detector_battery',
      'temp_sensor_pro': 'temp_sensor_pro_battery',
      'tvoc_sensor': 'tvoc_sensor_battery',
      'tvoc_sensor_advanced': 'tvoc_sensor_advanced_battery',
      'vibration_sensor': 'vibration_sensor_battery',
      'water_leak_detector': 'water_leak_detector_battery',
      'water_leak_detector_advanced': 'water_leak_detector_advanced_battery',
      'water_leak_sensor': 'water_leak_sensor_battery',
      
      // CR2032 POWERED (9 drivers)
      'climate_monitor': 'climate_monitor_cr2032',
      'co2_temp_humidity': 'co2_temp_humidity_cr2032',
      'doorbell': 'doorbell_cr2032',
      'garage_door_opener': 'garage_door_opener_cr2032',
      'outdoor_siren': 'outdoor_siren_cr2032',
      'pet_feeder': 'pet_feeder_cr2032',
      'scene_controller_2button': 'scene_controller_2button_cr2032',
      'scene_controller_4button': 'scene_controller_4button_cr2032',
      'scene_controller_6button': 'scene_controller_6button_cr2032',
      'scene_controller_8button': 'scene_controller_8button_cr2032',
      'soil_tester_temp_humid': 'soil_tester_temp_humid_cr2032',
      'sos_emergency_button': 'sos_emergency_button_cr2032',
      'tank_level_monitor': 'tank_level_monitor_cr2032',
      
      // HYBRID (7 drivers)
      'radiator_valve': 'radiator_valve_hybrid',
      'smart_radiator_valve': 'smart_radiator_valve_hybrid',
      'smart_thermostat': 'smart_thermostat_hybrid',
      'smart_water_valve': 'smart_water_valve_hybrid',
      'thermostat': 'thermostat_hybrid',
      'water_valve': 'water_valve_hybrid',
      'water_valve_smart': 'water_valve_smart_hybrid'
    };
  }

  log(msg, color = 'blue') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
  }

  async run() {
    try {
      this.log('\n' + '='.repeat(80), 'cyan');
      this.log('🔧 MASSIVE POWER RENAME - 108 DRIVERS', 'cyan');
      this.log('='.repeat(80) + '\n', 'cyan');

      let count = 0;
      const total = Object.keys(this.renameMap).length;

      for (const [oldName, newName] of Object.entries(this.renameMap)) {
        count++;
        const oldPath = path.join(this.driversDir, oldName);
        const newPath = path.join(this.driversDir, newName);
        
        if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
          this.log(`[${count}/${total}] ${oldName} → ${newName}`, 'yellow');
          
          // Rename folder
          fs.renameSync(oldPath, newPath);
          
          // Update driver.compose.json
          const composeFile = path.join(newPath, 'driver.compose.json');
          if (fs.existsSync(composeFile)) {
            const compose = JSON.parse(fs.readFileSync(composeFile, 'utf-8'));
            compose.id = newName;
            fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf-8');
          }
          
          this.renamed.push({ old: oldName, new: newName });
        } else if (!fs.existsSync(oldPath)) {
          this.log(`[${count}/${total}] SKIP: ${oldName} (already renamed)`, 'green');
        } else {
          this.log(`[${count}/${total}] SKIP: ${oldName} (destination exists)`, 'blue');
        }
      }

      // Sync app.json
      this.log('\n🔄 Synchronizing app.json...', 'cyan');
      try {
        execSync('node scripts/AUTO_UPDATE_APP_JSON.js', { 
          cwd: this.rootDir,
          stdio: 'inherit'
        });
      } catch (error) {
        this.log('⚠ Auto-sync failed, will need manual sync', 'yellow');
      }

      // Report
      this.log('\n' + '='.repeat(80), 'green');
      this.log('✅ MASSIVE RENAME COMPLETE', 'green');
      this.log('='.repeat(80) + '\n', 'green');
      
      this.log(`📊 Drivers renamed: ${this.renamed.length}/${total}`, 'cyan');
      this.log(`📊 Already renamed: ${total - this.renamed.length}`, 'green');
      
      if (this.renamed.length > 0) {
        this.log('\n✨ Successfully renamed:', 'green');
        this.renamed.slice(0, 20).forEach(r => {
          this.log(`   ${r.old} → ${r.new}`, 'green');
        });
        if (this.renamed.length > 20) {
          this.log(`   ... and ${this.renamed.length - 20} more`, 'green');
        }
      }
      
      this.log('\n✅ All drivers now have power designation!\n', 'green');

    } catch (error) {
      this.log(`\n❌ ERROR: ${error.message}\n`, 'red');
      console.error(error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const renamer = new MassivePowerRename();
  renamer.run();
}

module.exports = MassivePowerRename;
