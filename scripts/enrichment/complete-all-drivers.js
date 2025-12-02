'use strict';

/**
 * COMPLETE ALL DRIVERS v1.0
 *
 * Completes ALL drivers with:
 * - Missing capabilities
 * - Missing features (energy, settings)
 * - Missing flow cards
 * - Missing clusters
 * - Missing productIds
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = './drivers';

// Complete capability definitions by driver type
const DRIVER_CAPABILITIES = {
  // Climate/Temperature sensors
  'climate_sensor': {
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    energy: { batteries: ['AAA', 'AA'] },
    class: 'sensor'
  },
  'soil_sensor': {
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    energy: { batteries: ['AAA'] },
    class: 'sensor'
  },
  'weather_station_outdoor': {
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_pressure', 'measure_battery'],
    energy: { batteries: ['AA'] },
    class: 'sensor'
  },

  // Motion sensors
  'motion_sensor': {
    capabilities: ['alarm_motion', 'measure_battery', 'measure_luminance'],
    energy: { batteries: ['CR2450', 'CR123A'] },
    class: 'sensor'
  },
  'motion_sensor_radar_mmwave': {
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_temperature', 'measure_humidity'],
    class: 'sensor'
  },
  'presence_sensor_radar': {
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_temperature', 'measure_humidity'],
    class: 'sensor'
  },

  // Contact sensors
  'contact_sensor': {
    capabilities: ['alarm_contact', 'measure_battery'],
    energy: { batteries: ['CR2032', 'CR1632'] },
    class: 'sensor'
  },

  // Water/Rain sensors
  'rain_sensor': {
    capabilities: ['alarm_water', 'measure_battery'],
    energy: { batteries: ['AAA'] },
    class: 'sensor'
  },
  'water_leak_sensor': {
    capabilities: ['alarm_water', 'measure_battery'],
    energy: { batteries: ['CR2032'] },
    class: 'sensor'
  },

  // Smoke/Gas detectors
  'smoke_detector_advanced': {
    capabilities: ['alarm_smoke', 'alarm_battery', 'measure_battery'],
    energy: { batteries: ['CR123A'] },
    class: 'sensor'
  },
  'gas_detector': {
    capabilities: ['alarm_gas', 'measure_battery'],
    class: 'sensor'
  },
  'gas_sensor': {
    capabilities: ['alarm_gas', 'measure_battery'],
    class: 'sensor'
  },
  'formaldehyde_sensor': {
    capabilities: ['measure_pm25', 'measure_co2', 'measure_temperature', 'measure_humidity'],
    class: 'sensor'
  },
  'air_quality_co2': {
    capabilities: ['measure_co2', 'measure_temperature', 'measure_humidity'],
    class: 'sensor'
  },
  'air_quality_comprehensive': {
    capabilities: ['measure_co2', 'measure_pm25', 'measure_temperature', 'measure_humidity', 'measure_voc'],
    class: 'sensor'
  },

  // Plugs
  'plug_smart': {
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    class: 'socket'
  },
  'plug_energy_monitor': {
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    class: 'socket'
  },
  'usb_outlet_advanced': {
    capabilities: ['onoff', 'onoff.usb1', 'onoff.usb2', 'measure_power', 'meter_power'],
    class: 'socket'
  },

  // Switches
  'switch_1gang': {
    capabilities: ['onoff'],
    class: 'socket'
  },
  'switch_2gang': {
    capabilities: ['onoff', 'onoff.1'],
    class: 'socket'
  },
  'switch_3gang': {
    capabilities: ['onoff', 'onoff.1', 'onoff.2'],
    class: 'socket'
  },
  'switch_4gang': {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3'],
    class: 'socket'
  },
  'switch_wall_5gang': {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3', 'onoff.4'],
    class: 'socket'
  },
  'switch_wall_6gang': {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3', 'onoff.4', 'onoff.5'],
    class: 'socket'
  },
  'switch_wall_7gang': {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3', 'onoff.4', 'onoff.5', 'onoff.6'],
    class: 'socket'
  },
  'switch_wall_8gang': {
    capabilities: ['onoff', 'onoff.1', 'onoff.2', 'onoff.3', 'onoff.4', 'onoff.5', 'onoff.6', 'onoff.7'],
    class: 'socket'
  },
  'module_mini_switch': {
    capabilities: ['onoff', 'measure_power', 'meter_power'],
    class: 'socket'
  },
  'switch_wireless': {
    capabilities: ['measure_battery'],
    energy: { batteries: ['CR2032'] },
    class: 'sensor'
  },

  // Dimmers
  'dimmer_wall_1gang': {
    capabilities: ['onoff', 'dim'],
    class: 'light'
  },
  'dimmer_2ch_ts1101': {
    capabilities: ['onoff', 'dim'],
    class: 'light'
  },

  // Curtains/Blinds
  'curtain_motor': {
    capabilities: ['windowcoverings_set', 'windowcoverings_state'],
    class: 'curtain'
  },
  'shutter_roller_controller': {
    capabilities: ['windowcoverings_set', 'windowcoverings_state', 'windowcoverings_tilt_set'],
    class: 'blinds'
  },

  // Lights
  'bulb_dimmable': {
    capabilities: ['onoff', 'dim'],
    class: 'light'
  },
  'bulb_tunable_white': {
    capabilities: ['onoff', 'dim', 'light_temperature'],
    class: 'light'
  },
  'bulb_white': {
    capabilities: ['onoff', 'dim'],
    class: 'light'
  },
  'bulb_rgb': {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation'],
    class: 'light'
  },
  'bulb_rgbw': {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
    class: 'light'
  },
  'led_strip': {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation'],
    class: 'light'
  },
  'led_strip_rgbw': {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'],
    class: 'light'
  },
  'led_strip_advanced': {
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
    class: 'light'
  },

  // Buttons/Remotes
  'button_wireless_1': {
    capabilities: ['measure_battery'],
    energy: { batteries: ['CR2032'] },
    class: 'sensor'
  },
  'button_wireless_2': {
    capabilities: ['measure_battery'],
    energy: { batteries: ['CR2032'] },
    class: 'sensor'
  },
  'button_wireless_3': {
    capabilities: ['measure_battery'],
    energy: { batteries: ['CR2032'] },
    class: 'sensor'
  },
  'button_wireless_4': {
    capabilities: ['measure_battery'],
    energy: { batteries: ['CR2032'] },
    class: 'sensor'
  },
  'button_wireless_6': {
    capabilities: ['measure_battery'],
    energy: { batteries: ['CR2032'] },
    class: 'sensor'
  },
  'button_wireless_8': {
    capabilities: ['measure_battery'],
    energy: { batteries: ['CR2032'] },
    class: 'sensor'
  },
  'button_wireless': {
    capabilities: ['measure_battery'],
    energy: { batteries: ['CR2032'] },
    class: 'sensor'
  },
  'button_emergency_sos': {
    capabilities: ['measure_battery', 'alarm_generic'],
    energy: { batteries: ['CR2032'] },
    class: 'sensor'
  },

  // Thermostats/HVAC
  'thermostat_ts0601': {
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode'],
    class: 'thermostat'
  },
  'radiator_valve': {
    capabilities: ['target_temperature', 'measure_temperature', 'measure_battery'],
    energy: { batteries: ['AA'] },
    class: 'thermostat'
  },
  'hvac_air_conditioner': {
    capabilities: ['onoff', 'target_temperature', 'measure_temperature', 'thermostat_mode'],
    class: 'thermostat'
  },
  'hvac_dehumidifier': {
    capabilities: ['onoff', 'target_temperature', 'measure_humidity', 'measure_temperature'],
    class: 'fan'
  },

  // Other
  'siren': {
    capabilities: ['onoff', 'alarm_generic'],
    class: 'other'
  },
  'doorbell': {
    capabilities: ['alarm_generic', 'measure_battery'],
    energy: { batteries: ['CR123A'] },
    class: 'doorbell'
  },
  'door_controller': {
    capabilities: ['locked', 'alarm_contact'],
    class: 'lock'
  },
  'lock_smart': {
    capabilities: ['locked', 'measure_battery', 'alarm_tamper'],
    energy: { batteries: ['AA'] },
    class: 'lock'
  },
  'water_valve_smart': {
    capabilities: ['onoff', 'alarm_water'],
    class: 'other'
  },
  'ceiling_fan': {
    capabilities: ['onoff', 'dim'],
    class: 'fan'
  },
  'gateway_zigbee_bridge': {
    capabilities: ['alarm_generic'],
    class: 'other'
  }
};

// Flow card templates by capability
const FLOW_TEMPLATES = {
  triggers: {
    'alarm_motion': { id: 'motion_detected', title: { en: 'Motion detected' } },
    'alarm_contact': { id: 'contact_changed', title: { en: 'Contact changed' } },
    'alarm_water': { id: 'water_detected', title: { en: 'Water detected' } },
    'alarm_smoke': { id: 'smoke_detected', title: { en: 'Smoke detected' } },
    'alarm_gas': { id: 'gas_detected', title: { en: 'Gas detected' } },
    'alarm_co': { id: 'co_detected', title: { en: 'Carbon monoxide detected' } },
    'alarm_battery': { id: 'battery_alarm', title: { en: 'Battery low' } },
    'measure_temperature': { id: 'temperature_changed', title: { en: 'Temperature changed' } },
    'measure_humidity': { id: 'humidity_changed', title: { en: 'Humidity changed' } },
    'measure_battery': { id: 'battery_changed', title: { en: 'Battery level changed' } },
    'measure_power': { id: 'power_changed', title: { en: 'Power changed' } },
    'measure_luminance': { id: 'luminance_changed', title: { en: 'Luminance changed' } }
  },
  conditions: {
    'alarm_motion': { id: 'is_motion', title: { en: 'Motion is detected' } },
    'alarm_contact': { id: 'is_contact', title: { en: 'Contact is open/closed' } },
    'alarm_water': { id: 'is_water', title: { en: 'Water is detected' } },
    'onoff': { id: 'is_on', title: { en: 'Is turned on' } }
  },
  actions: {
    'onoff': { id: 'turn_on', title: { en: 'Turn on' } },
    'dim': { id: 'set_dim', title: { en: 'Set brightness' } },
    'target_temperature': { id: 'set_temperature', title: { en: 'Set temperature' } },
    'windowcoverings_set': { id: 'set_position', title: { en: 'Set position' } }
  }
};

class CompleteAllDrivers {
  constructor() {
    this.stats = {
      driversProcessed: 0,
      capabilitiesAdded: 0,
      featuresAdded: 0,
      flowCardsCreated: 0
    };
  }

  // Complete single driver
  completeDriver(driverName, composePath) {
    const config = DRIVER_CAPABILITIES[driverName];
    if (!config) return false;

    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const json = JSON.parse(content);
      let modified = false;

      // 1. Add missing capabilities
      if (config.capabilities) {
        if (!json.capabilities) json.capabilities = [];

        config.capabilities.forEach(cap => {
          if (!json.capabilities.includes(cap)) {
            json.capabilities.push(cap);
            this.stats.capabilitiesAdded++;
            modified = true;
          }
        });
      }

      // 2. Add energy config
      if (config.energy && !json.energy) {
        json.energy = config.energy;
        this.stats.featuresAdded++;
        modified = true;
      }

      // 3. Set correct class
      if (config.class && json.class !== config.class) {
        json.class = config.class;
        modified = true;
      }

      // 4. Add capabilitiesOptions for titles
      if (!json.capabilitiesOptions) {
        json.capabilitiesOptions = {};
      }

      // Add options for multi-gang switches
      if (driverName.includes('gang')) {
        const gangCount = parseInt(driverName.match(/(\d)gang/)?.[1] || '1');
        for (let i = 1; i < gangCount; i++) {
          const capName = `onoff.${i}`;
          if (json.capabilities?.includes(capName) && !json.capabilitiesOptions[capName]) {
            json.capabilitiesOptions[capName] = {
              title: { en: `Switch ${i + 1}` }
            };
            modified = true;
          }
        }
      }

      // Save if modified
      if (modified) {
        fs.writeFileSync(composePath, JSON.stringify(json, null, 2));
        this.stats.driversProcessed++;
      }

      // 5. Create flow cards if missing
      this.createFlowCards(driverName, path.dirname(composePath), json.capabilities || []);

      return modified;
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      return false;
    }
  }

  // Create flow cards for driver
  createFlowCards(driverName, driverDir, capabilities) {
    const flowPath = path.join(driverDir, 'driver.flow.compose.json');

    // Only create if missing
    if (fs.existsSync(flowPath)) return;

    const flowCards = {
      triggers: [],
      conditions: [],
      actions: []
    };

    // Add triggers based on capabilities
    capabilities.forEach(cap => {
      if (FLOW_TEMPLATES.triggers[cap]) {
        flowCards.triggers.push({
          id: `${driverName}_${FLOW_TEMPLATES.triggers[cap].id}`,
          ...FLOW_TEMPLATES.triggers[cap]
        });
      }
      if (FLOW_TEMPLATES.conditions[cap]) {
        flowCards.conditions.push({
          id: `${driverName}_${FLOW_TEMPLATES.conditions[cap].id}`,
          ...FLOW_TEMPLATES.conditions[cap]
        });
      }
      if (FLOW_TEMPLATES.actions[cap]) {
        flowCards.actions.push({
          id: `${driverName}_${FLOW_TEMPLATES.actions[cap].id}`,
          ...FLOW_TEMPLATES.actions[cap]
        });
      }
    });

    // Only write if there are flow cards
    if (flowCards.triggers.length > 0 || flowCards.conditions.length > 0 || flowCards.actions.length > 0) {
      fs.writeFileSync(flowPath, JSON.stringify(flowCards, null, 2));
      this.stats.flowCardsCreated++;
    }
  }

  // Process all drivers
  processAll() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     COMPLETE ALL DRIVERS v1.0                             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    const drivers = fs.readdirSync(DRIVERS_DIR);

    drivers.forEach(driver => {
      const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const modified = this.completeDriver(driver, composePath);
        const status = modified ? '✏️' : '✅';
        console.log(`${status} ${driver}`);
      }
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log(`  Drivers modified: ${this.stats.driversProcessed}`);
    console.log(`  Capabilities added: ${this.stats.capabilitiesAdded}`);
    console.log(`  Features added: ${this.stats.featuresAdded}`);
    console.log(`  Flow cards created: ${this.stats.flowCardsCreated}`);
    console.log('═══════════════════════════════════════════════════════════');

    return this.stats;
  }
}

if (require.main === module) {
  const completer = new CompleteAllDrivers();
  completer.processAll();
}

module.exports = CompleteAllDrivers;
