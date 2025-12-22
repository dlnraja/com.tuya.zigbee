'use strict';

/**
 * ManufacturerCatalog - Maps manufacturer names/prefixes to IoT categories,
 * recommended capabilities, and flow cards. Helps keep Tuya/other brands grouped
 * intelligently with optimized feature sets.
 */

const CATEGORY_DEFINITIONS = {
  smart_plug: {
    name: 'Smart Plug / Outlet',
    descriptions: ['Power monitoring', 'Child lock', 'USB ports'],
    capabilities: ['onoff', 'measure_power', 'measure_voltage', 'measure_current', 'meter_power', 'countdown', 'child_lock'],
    flows: ['plug_switched', 'energy_alert', 'child_lock_engaged']
  },
  usb_outlet: {
    name: 'USB Outlet',
    descriptions: ['Multiple USB ports', 'High current'],
    capabilities: ['onoff', 'onoff.usb2', 'measure_current', 'measure_voltage', 'child_lock'],
    flows: ['usb_port_1_changed', 'usb_port_2_changed']
  },
  motion_sensor: {
    name: 'Motion / Radar Sensor',
    descriptions: ['Presence detection', 'Ambient light', 'Battery status'],
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery', 'measure_temperature', 'measure_humidity'],
    flows: ['motion_detected', 'motion_cleared', 'ambient_luminance_changed']
  },
  climate_sensor: {
    name: 'Climate Sensor',
    descriptions: ['Temperature', 'Humidity', 'Air quality'],
    capabilities: ['measure_temperature', 'measure_humidity', 'alarm_temperature', 'measure_battery'],
    flows: ['temperature_changed', 'humidity_changed']
  },
  curtain: {
    name: 'Curtain / Cover',
    descriptions: ['Window covering', 'Motor direction', 'Calibration'],
    capabilities: ['windowcoverings_state', 'windowcoverings_set', 'motor_position', 'motor_direction'],
    flows: ['cover_opened', 'cover_closed', 'motor_direction_changed']
  },
  thermostat: {
    name: 'Thermostat / TRV',
    descriptions: ['Radiator valve', 'Temperature control', 'Schedule'],
    capabilities: ['target_temperature', 'thermostat_mode', 'valve_position', 'measure_temperature', 'measure_battery'],
    flows: ['target_temperature_changed', 'thermostat_mode_changed']
  },
  safety: {
    name: 'Safety Sensor',
    descriptions: ['Smoke, CO, Water, Vibration'],
    capabilities: ['alarm_smoke', 'alarm_co', 'alarm_water', 'alarm_vibration', 'measure_battery'],
    flows: ['alarm_triggered', 'alarm_cleared']
  },
  button: {
    name: 'Button / Remote',
    descriptions: ['Scene control', 'Scene switch'],
    capabilities: ['button.1', 'button.2', 'button.3', 'button.4', 'measure_battery'],
    flows: ['button_single', 'button_double', 'button_hold']
  }
};

const MANUFACTURER_CATEGORIES = {
  '_TZ3000_': 'smart_plug',
  '_TZ3210_': 'smart_plug',
  '_TZ3400_': 'smart_plug',
  '_TZE200_': 'motion_sensor',
  '_TZE204_': 'motion_sensor',
  '_TZE284_': 'motion_sensor',
  '_TYZB01_': 'button',
  '_TYZB02_': 'button',
  '_TYST11_': 'safety',
  '_TYST12_': 'safety',
  'LUMI': 'climate_sensor',
  'Xiaomi': 'climate_sensor',
  'Aqara': 'climate_sensor',
  'IKEA of Sweden': 'curtain',
  'Philips': 'smart_plug',
  'Signify Netherlands B.V.': 'smart_plug',
  'OSRAM': 'curtain',
  'LEDVANCE': 'curtain',
  'Legrand': 'smart_plug',
  'Netatmo': 'climate_sensor',
  'Schneider Electric': 'thermostat',
  'Wiser': 'thermostat',
  'Danfoss': 'thermostat',
  'Eurotronic': 'thermostat',
  'Bosch': 'safety',
  'BOSCH': 'safety',
  'HEIMAN': 'safety',
  'Sonoff': 'smart_plug',
  'SONOFF': 'smart_plug',
  'eWeLink': 'smart_plug',
  'ITEAD': 'smart_plug',
  'innr': 'smart_plug',
  'Innr': 'smart_plug',
  'sengled': 'smart_plug',
  'Sengled': 'smart_plug'
};

const CATEGORY_FLOWS = {
  smart_plug: [
    {
      id: 'flow_plug_switched',
      name: 'Smart plug switched',
      tokens: ['onoff', 'power'],
      description: 'Triggered when the smart plug toggles'
    },
    {
      id: 'flow_energy_alert',
      name: 'Energy threshold reached',
      tokens: ['meter_power'],
      description: 'Triggered when power consumption exceeds threshold'
    }
  ],
  motion_sensor: [
    {
      id: 'flow_motion_detected',
      name: 'Motion detected',
      tokens: ['alarm_motion'],
      description: 'Triggered when motion/radar reports presence'
    },
    {
      id: 'flow_ambient_light',
      name: 'Ambient light changed',
      tokens: ['measure_luminance'],
      description: 'Triggered when ambient light changes significantly'
    }
  ],
  safety: [
    {
      id: 'flow_alarm_triggered',
      name: 'Safety alarm triggered',
      tokens: ['alarm_smoke', 'alarm_water', 'alarm_co', 'alarm_vibration'],
      description: 'Triggered for any safety alarm'
    }
  ],
  button: [
    {
      id: 'flow_button_pressed',
      name: 'Button pressed',
      tokens: ['button.1'],
      description: 'Triggered when a button is pressed'
    }
  ]
};

class ManufacturerCatalog {
  static categorizeManufacturer(name = '') {
    if (!name) return null;
    if (MANUFACTURER_CATEGORIES[name]) return MANUFACTURER_CATEGORIES[name];
    const prefixMatch = Object.keys(MANUFACTURER_CATEGORIES).find(prefix => prefix.endsWith('_') && name.startsWith(prefix));
    return prefixMatch ? MANUFACTURER_CATEGORIES[prefixMatch] : null;
  }

  static getCategoryDefinition(category) {
    return CATEGORY_DEFINITIONS[category] || null;
  }

  static getCategoryCapabilities(category) {
    return this.getCategoryDefinition(category)?.capabilities || [];
  }

  static getCategoryFlows(category) {
    return CATEGORY_FLOWS[category] || [];
  }
}

module.exports = {
  ManufacturerCatalog
};
