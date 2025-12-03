#!/usr/bin/env node
/**
 * HYBRID DRIVER ENRICHMENT - PART 2
 *
 * Configurations pour les drivers manquants dans PART 1
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

const ZCL_CLUSTERS = {
  BASIC: 0, POWER_CONFIGURATION: 1, IDENTIFY: 3, GROUPS: 4, SCENES: 5,
  ON_OFF: 6, LEVEL_CONTROL: 8, COLOR_CONTROL: 768, WINDOW_COVERING: 258,
  THERMOSTAT: 513, FAN_CONTROL: 514, IAS_ZONE: 1280, IAS_WD: 1282,
  TEMPERATURE_MEASUREMENT: 1026, RELATIVE_HUMIDITY: 1029, PRESSURE_MEASUREMENT: 1027,
  ILLUMINANCE_MEASUREMENT: 1024, OCCUPANCY_SENSING: 1030,
  ELECTRICAL_MEASUREMENT: 2820, METERING: 1794, TUYA_SPECIFIC: 61184
};

const DRIVER_CAPABILITIES = {
  // BUTTONS
  bulb_white: {
    capabilities: ['onoff', 'dim'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL] },
    tuya: { dps: { state: 1, brightness: 2 } }
  },

  button_wireless: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { action: 1, battery: 3 } },
    energy: { batteries: ['CR2032', 'CR2450'] }
  },

  button_wireless_2: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.SCENES, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { action_1: 1, action_2: 2, battery: 10 } },
    energy: { batteries: ['CR2032', 'CR2450'] }
  },

  button_wireless_3: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.SCENES, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { action_1: 1, action_2: 2, action_3: 3, battery: 10 } },
    energy: { batteries: ['CR2032', 'CR2450'] }
  },

  button_wireless_6: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.SCENES, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { action_1: 1, action_2: 2, action_3: 3, action_4: 4, action_5: 5, action_6: 6, battery: 10 } },
    energy: { batteries: ['CR2450', 'AAA'] }
  },

  button_wireless_8: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.SCENES, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { action_1: 1, action_2: 2, action_3: 3, action_4: 4, action_5: 5, action_6: 6, action_7: 7, action_8: 8, battery: 10 } },
    energy: { batteries: ['AAA', 'CR2450'] }
  },

  // DOORBELL & DOOR
  doorbell: {
    capabilities: ['alarm_generic', 'measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { ring: 1, volume: 5, melody: 21, battery: 15 } },
    energy: { batteries: ['18650', 'USB'] }
  },

  door_controller: {
    capabilities: ['locked', 'alarm_contact', 'measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { lock_state: 1, contact: 2, battery: 4 } },
    energy: { batteries: ['AA', 'AAA'] }
  },

  // GATEWAY
  gateway_zigbee_bridge: {
    capabilities: ['onoff'],
    zcl: { clusters: [ZCL_CLUSTERS.BASIC], bindings: [] },
    tuya: { dps: {} }
  },

  generic_tuya: {
    capabilities: ['measure_battery', 'measure_temperature', 'measure_humidity', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.BASIC, ZCL_CLUSTERS.TUYA_SPECIFIC], bindings: [] },
    tuya: { dps: { battery: 4, temperature: 1, humidity: 2 } },
    energy: { batteries: ['CR2032', 'AAA', 'AA'] }
  },

  // HVAC
  hvac_air_conditioner: {
    capabilities: ['onoff', 'target_temperature', 'measure_temperature', 'thermostat_mode', 'fan_speed'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.THERMOSTAT, ZCL_CLUSTERS.FAN_CONTROL], bindings: [ZCL_CLUSTERS.THERMOSTAT] },
    tuya: { dps: { state: 1, mode: 2, target_temp: 4, current_temp: 3, fan_speed: 5 } }
  },

  hvac_dehumidifier: {
    capabilities: ['onoff', 'target_humidity', 'measure_humidity', 'fan_speed'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.RELATIVE_HUMIDITY, ZCL_CLUSTERS.FAN_CONTROL], bindings: [ZCL_CLUSTERS.ON_OFF] },
    tuya: { dps: { state: 1, target_humidity: 2, current_humidity: 3, fan_speed: 4 } }
  },

  // LED CONTROLLERS
  led_controller_cct: {
    capabilities: ['onoff', 'dim', 'light_temperature'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL] },
    tuya: { dps: { state: 1, brightness: 2, color_temp: 3 } }
  },

  led_controller_rgb: {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_mode'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL] },
    tuya: { dps: { state: 1, mode: 2, brightness: 3, hsv: 5, scene: 6 } }
  },

  led_strip_advanced: {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL] },
    tuya: { dps: { state: 1, mode: 2, brightness: 3, color_temp: 4, hsv: 5, scene: 6, speed: 7, music_sync: 101 } }
  },

  led_strip_rgbw: {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.COLOR_CONTROL] },
    tuya: { dps: { state: 1, mode: 2, brightness: 3, color_temp: 4, hsv: 5, white_brightness: 21 } }
  },

  // MODULE
  module_mini_switch: {
    capabilities: ['onoff'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF], bindings: [ZCL_CLUSTERS.ON_OFF] },
    tuya: { dps: { switch: 1 } }
  },

  // RAIN SENSOR
  rain_sensor: {
    capabilities: ['alarm_water', 'measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.IAS_ZONE, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { rain_detected: 1, rain_intensity: 2, battery: 4 } },
    energy: { batteries: ['AAA', 'AA'] }
  },

  // SCENE SWITCHES
  scene_switch_1: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.SCENES, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { scene_1: 1, battery: 10 } },
    energy: { batteries: ['CR2032'] }
  },

  scene_switch_2: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.SCENES, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { scene_1: 1, scene_2: 2, battery: 10 } },
    energy: { batteries: ['CR2032', 'CR2450'] }
  },

  scene_switch_3: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.SCENES, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { scene_1: 1, scene_2: 2, scene_3: 3, battery: 10 } },
    energy: { batteries: ['CR2032', 'CR2450'] }
  },

  scene_switch_4: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.SCENES, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { scene_1: 1, scene_2: 2, scene_3: 3, scene_4: 4, battery: 10 } },
    energy: { batteries: ['CR2450', 'AAA'] }
  },

  scene_switch_6: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.SCENES, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { scene_1: 1, scene_2: 2, scene_3: 3, scene_4: 4, scene_5: 5, scene_6: 6, battery: 10 } },
    energy: { batteries: ['CR2450', 'AAA'] }
  },

  // SHUTTER
  shutter_roller_controller: {
    capabilities: ['windowcoverings_state', 'windowcoverings_set', 'dim'],
    zcl: { clusters: [ZCL_CLUSTERS.WINDOW_COVERING, ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL], bindings: [ZCL_CLUSTERS.WINDOW_COVERING] },
    tuya: { dps: { state: 1, position: 2, motor_direction: 5 } }
  },

  // SMART DEVICES
  smart_heater: {
    capabilities: ['onoff', 'target_temperature', 'measure_temperature', 'measure_power'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.THERMOSTAT, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.THERMOSTAT] },
    tuya: { dps: { state: 1, target_temp: 2, current_temp: 3, power: 19 } }
  },

  smart_rcbo: {
    capabilities: ['onoff', 'measure_power', 'measure_voltage', 'measure_current', 'meter_power', 'alarm_generic'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT, ZCL_CLUSTERS.METERING], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT] },
    tuya: { dps: { state: 1, power: 19, voltage: 20, current: 18, energy: 17, trip: 26, leakage: 27 } }
  },

  // SWITCH PLUGS
  switch_plug_1: {
    capabilities: ['onoff', 'measure_power', 'meter_power'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT, ZCL_CLUSTERS.METERING], bindings: [ZCL_CLUSTERS.ON_OFF] },
    tuya: { dps: { switch: 1, power: 19, voltage: 20, current: 18, energy: 17 } }
  },

  switch_plug_2: {
    capabilities: ['onoff', 'onoff.1', 'measure_power', 'meter_power'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT, ZCL_CLUSTERS.METERING], bindings: [ZCL_CLUSTERS.ON_OFF] },
    tuya: { dps: { switch_1: 1, switch_2: 2, power: 19, energy: 17 } },
    capabilitiesOptions: { 'onoff': { title: { en: 'Outlet 1' } }, 'onoff.1': { title: { en: 'Outlet 2' } } }
  },

  // WALL SWITCHES 5-8 GANG
  switch_wall_5gang: {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3', 'onoff.4'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF], bindings: [ZCL_CLUSTERS.ON_OFF] },
    tuya: { dps: { switch_1: 1, switch_2: 2, switch_3: 3, switch_4: 4, switch_5: 5 } },
    capabilitiesOptions: {
      'onoff': { title: { en: 'Switch 1' } }, 'onoff.1': { title: { en: 'Switch 2' } },
      'onoff.2': { title: { en: 'Switch 3' } }, 'onoff.3': { title: { en: 'Switch 4' } },
      'onoff.4': { title: { en: 'Switch 5' } }
    }
  },

  switch_wall_6gang: {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3', 'onoff.4', 'onoff.5'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF], bindings: [ZCL_CLUSTERS.ON_OFF] },
    tuya: { dps: { switch_1: 1, switch_2: 2, switch_3: 3, switch_4: 4, switch_5: 5, switch_6: 6 } },
    capabilitiesOptions: {
      'onoff': { title: { en: 'Switch 1' } }, 'onoff.1': { title: { en: 'Switch 2' } },
      'onoff.2': { title: { en: 'Switch 3' } }, 'onoff.3': { title: { en: 'Switch 4' } },
      'onoff.4': { title: { en: 'Switch 5' } }, 'onoff.5': { title: { en: 'Switch 6' } }
    }
  },

  switch_wall_7gang: {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3', 'onoff.4', 'onoff.5', 'onoff.6'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF], bindings: [ZCL_CLUSTERS.ON_OFF] },
    tuya: { dps: { switch_1: 1, switch_2: 2, switch_3: 3, switch_4: 4, switch_5: 5, switch_6: 6, switch_7: 7 } },
    capabilitiesOptions: {
      'onoff': { title: { en: 'Switch 1' } }, 'onoff.1': { title: { en: 'Switch 2' } },
      'onoff.2': { title: { en: 'Switch 3' } }, 'onoff.3': { title: { en: 'Switch 4' } },
      'onoff.4': { title: { en: 'Switch 5' } }, 'onoff.5': { title: { en: 'Switch 6' } },
      'onoff.6': { title: { en: 'Switch 7' } }
    }
  },

  switch_wall_8gang: {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3', 'onoff.4', 'onoff.5', 'onoff.6', 'onoff.7'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF], bindings: [ZCL_CLUSTERS.ON_OFF] },
    tuya: { dps: { switch_1: 1, switch_2: 2, switch_3: 3, switch_4: 4, switch_5: 5, switch_6: 6, switch_7: 7, switch_8: 8 } },
    capabilitiesOptions: {
      'onoff': { title: { en: 'Switch 1' } }, 'onoff.1': { title: { en: 'Switch 2' } },
      'onoff.2': { title: { en: 'Switch 3' } }, 'onoff.3': { title: { en: 'Switch 4' } },
      'onoff.4': { title: { en: 'Switch 5' } }, 'onoff.5': { title: { en: 'Switch 6' } },
      'onoff.6': { title: { en: 'Switch 7' } }, 'onoff.7': { title: { en: 'Switch 8' } }
    }
  },

  switch_wireless: {
    capabilities: ['measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION] },
    tuya: { dps: { action: 1, battery: 3 } },
    energy: { batteries: ['CR2032'] }
  },

  // THERMOSTAT 4CH
  thermostat_4ch: {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3', 'target_temperature', 'measure_temperature'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.THERMOSTAT], bindings: [ZCL_CLUSTERS.THERMOSTAT] },
    tuya: { dps: { system_mode: 1, target_temp: 2, current_temp: 3, relay_1: 101, relay_2: 102, relay_3: 103, relay_4: 104 } },
    capabilitiesOptions: {
      'onoff': { title: { en: 'Zone 1' } }, 'onoff.1': { title: { en: 'Zone 2' } },
      'onoff.2': { title: { en: 'Zone 3' } }, 'onoff.3': { title: { en: 'Zone 4' } }
    }
  },

  // USB OUTLET
  usb_outlet_advanced: {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'measure_power', 'meter_power'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.ELECTRICAL_MEASUREMENT, ZCL_CLUSTERS.METERING], bindings: [ZCL_CLUSTERS.ON_OFF] },
    tuya: { dps: { outlet_1: 1, outlet_2: 2, usb: 7, power: 19, energy: 17 } },
    capabilitiesOptions: {
      'onoff': { title: { en: 'Outlet 1' } }, 'onoff.1': { title: { en: 'Outlet 2' } },
      'onoff.2': { title: { en: 'USB' } }
    }
  },

  // VALVE
  valve_single: {
    capabilities: ['onoff', 'measure_battery', 'alarm_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.POWER_CONFIGURATION], bindings: [ZCL_CLUSTERS.ON_OFF] },
    tuya: { dps: { valve_state: 1, battery: 15 } },
    energy: { batteries: ['AA'] }
  },

  // UNIVERSAL
  zigbee_universal: {
    capabilities: ['onoff', 'dim', 'measure_temperature', 'measure_humidity', 'measure_battery'],
    zcl: { clusters: [ZCL_CLUSTERS.BASIC, ZCL_CLUSTERS.ON_OFF, ZCL_CLUSTERS.LEVEL_CONTROL, ZCL_CLUSTERS.TEMPERATURE_MEASUREMENT, ZCL_CLUSTERS.RELATIVE_HUMIDITY, ZCL_CLUSTERS.POWER_CONFIGURATION, ZCL_CLUSTERS.TUYA_SPECIFIC], bindings: [] },
    tuya: { dps: { switch: 1, brightness: 2, temperature: 3, humidity: 4, battery: 15 } },
    energy: { batteries: ['CR2032', 'AAA', 'AA', 'USB'] }
  }
};

// Enrichment function
function enrichDriver(driverId) {
  const driverPath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(driverPath)) return { success: false, reason: 'not_found' };

  const config = DRIVER_CAPABILITIES[driverId];
  if (!config) return { success: false, reason: 'no_config' };

  try {
    const driver = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    let modified = false;

    // Add capabilities
    if (config.capabilities) {
      const existingCaps = new Set(driver.capabilities || []);
      for (const cap of config.capabilities) {
        if (!existingCaps.has(cap)) {
          if (!driver.capabilities) driver.capabilities = [];
          driver.capabilities.push(cap);
          modified = true;
        }
      }
    }

    // Update ZCL clusters
    if (config.zcl && driver.zigbee) {
      const endpoint = driver.zigbee.endpoints?.['1'] || {};
      const existingClusters = new Set(endpoint.clusters || []);

      for (const cluster of config.zcl.clusters) {
        if (!existingClusters.has(cluster)) {
          if (!endpoint.clusters) endpoint.clusters = [];
          endpoint.clusters.push(cluster);
          modified = true;
        }
      }

      if (config.zcl.bindings && config.zcl.bindings.length > 0) {
        const existingBindings = new Set(endpoint.bindings || []);
        for (const binding of config.zcl.bindings) {
          if (!existingBindings.has(binding)) {
            if (!endpoint.bindings) endpoint.bindings = [];
            endpoint.bindings.push(binding);
            modified = true;
          }
        }
      }

      if (!driver.zigbee.endpoints) driver.zigbee.endpoints = {};
      driver.zigbee.endpoints['1'] = endpoint;
    }

    // Add energy batteries
    if (config.energy && config.energy.batteries) {
      if (!driver.energy) driver.energy = {};
      driver.energy.batteries = config.energy.batteries;
      modified = true;
    }

    // Add capabilitiesOptions
    if (config.capabilitiesOptions) {
      if (!driver.capabilitiesOptions) driver.capabilitiesOptions = {};
      for (const [cap, opts] of Object.entries(config.capabilitiesOptions)) {
        if (!driver.capabilitiesOptions[cap]) {
          driver.capabilitiesOptions[cap] = opts;
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2) + '\n');
      return { success: true, modified: true };
    }
    return { success: true, modified: false };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// Main
console.log('🔧 HYBRID DRIVER ENRICHMENT - PART 2');
console.log('=====================================\n');

let enriched = 0, unchanged = 0, errors = 0;

for (const driverId of Object.keys(DRIVER_CAPABILITIES)) {
  const result = enrichDriver(driverId);
  if (result.success && result.modified) {
    console.log(`✅ ${driverId}: enrichi`);
    enriched++;
  } else if (result.success) {
    console.log(`⏭️  ${driverId}: déjà complet`);
    unchanged++;
  } else {
    console.log(`❌ ${driverId}: ${result.reason}`);
    errors++;
  }
}

console.log('\n' + '='.repeat(40));
console.log(`✅ Enrichis: ${enriched}`);
console.log(`⏭️  Inchangés: ${unchanged}`);
console.log(`❌ Erreurs: ${errors}`);
console.log('='.repeat(40));
