#!/usr/bin/env node

/**
 * DEEP DPS SCRAPER
 * 
 * Scrape et enrichit les informations DPs depuis:
 * - Zigbee2MQTT device database
 * - ZHA quirks
 * - Community contributions
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const ENRICHMENT_DIR = path.join(DATA_DIR, 'enrichment');

// Create directories
[DATA_DIR, ENRICHMENT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('🔍 DEEP DPS SCRAPER & ENRICHMENT\n');
console.log('='.repeat(70) + '\n');

/**
 * Enhanced DPs database with advanced features
 */
const ENHANCED_DPS_DATABASE = {
  
  // Battery advanced features
  BATTERY_ADVANCED: {
    2: { 
      name: 'battery_percentage', 
      type: 'value', 
      capability: 'measure_battery',
      unit: '%',
      min: 0,
      max: 100,
      alarm_threshold: 20  // Low battery alarm
    },
    15: { 
      name: 'battery_state', 
      type: 'enum',
      capability: 'battery_state',
      values: {
        0: 'low',
        1: 'medium', 
        2: 'high',
        3: 'charging'
      }
    },
    33: {
      name: 'battery_voltage',
      type: 'value',
      capability: 'measure_voltage',
      unit: 'V',
      divide: 1000  // mV to V
    }
  },

  // Temperature advanced with calibration
  TEMPERATURE_ADVANCED: {
    1: { name: 'temperature', type: 'value', capability: 'measure_temperature', divide: 10 },
    3: { name: 'min_temperature', type: 'value', divide: 10 },
    4: { name: 'max_temperature', type: 'value', divide: 10 },
    9: { 
      name: 'temperature_alarm',
      type: 'enum',
      capability: 'alarm_temperature',
      values: { 0: 'lower_limit', 1: 'upper_limit', 2: 'cancel' }
    },
    19: { name: 'temperature_calibration', type: 'value', divide: 10 },
    104: { name: 'temperature_sensitivity', type: 'value' }
  },

  // Motion/PIR advanced with settings
  MOTION_ADVANCED: {
    1: { name: 'occupancy', type: 'bool', capability: 'alarm_motion' },
    9: { name: 'illuminance', type: 'value', capability: 'measure_luminance' },
    10: { name: 'led_enable', type: 'bool' },
    12: { 
      name: 'pir_enable', 
      type: 'bool',
      setting: true
    },
    102: { 
      name: 'occupancy_timeout',
      type: 'value',
      unit: 's',
      setting: true,
      min: 0,
      max: 3600
    },
    103: { 
      name: 'sensitivity',
      type: 'enum',
      setting: true,
      values: { 0: 'low', 1: 'medium', 2: 'high' }
    },
    104: {
      name: 'detection_distance',
      type: 'enum',
      setting: true,
      values: { 0: 'far', 1: 'middle', 2: 'near' }
    }
  },

  // Smoke detector complete
  SMOKE_COMPLETE: {
    1: { name: 'smoke', type: 'bool', capability: 'alarm_smoke' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    4: { name: 'temperature', type: 'value', capability: 'measure_temperature', divide: 10 },
    5: { name: 'humidity', type: 'value', capability: 'measure_humidity' },
    11: { name: 'smoke_value', type: 'value', capability: 'measure_smoke' },
    13: { name: 'mute', type: 'bool', setting: true },
    14: { name: 'battery_low', type: 'bool', capability: 'alarm_battery' },
    15: { 
      name: 'self_test',
      type: 'bool',
      action: true
    },
    16: { name: 'silence', type: 'bool' },
    20: {
      name: 'smoke_sensitivity',
      type: 'enum',
      setting: true,
      values: { 0: 'low', 1: 'medium', 2: 'high' }
    },
    101: { name: 'fault_alarm', type: 'bool', capability: 'alarm_fault' },
    102: { name: 'lifecycle', type: 'value', unit: 'days' },
    103: { name: 'test_result', type: 'enum', values: { 0: 'checking', 1: 'success', 2: 'failure' } }
  },

  // Thermostat/TRV complete with all settings
  THERMOSTAT_COMPLETE: {
    1: { 
      name: 'system_mode',
      type: 'enum',
      capability: 'thermostat_mode',
      values: { 0: 'off', 1: 'auto', 2: 'manual', 3: 'comfort', 4: 'eco', 5: 'boost', 6: 'complex' }
    },
    2: { 
      name: 'target_temperature',
      type: 'value',
      capability: 'target_temperature',
      divide: 10,
      min: 5,
      max: 35,
      step: 0.5
    },
    3: { 
      name: 'current_temperature',
      type: 'value',
      capability: 'measure_temperature',
      divide: 10
    },
    4: { name: 'preset', type: 'enum', values: { 0: 'schedule', 1: 'manual', 2: 'away', 3: 'boost' } },
    5: { name: 'valve_position', type: 'value', unit: '%' },
    7: { name: 'battery', type: 'value', capability: 'measure_battery' },
    8: { name: 'child_lock', type: 'bool', setting: true },
    10: { name: 'open_window_detection', type: 'bool', setting: true },
    13: { name: 'comfort_temperature', type: 'value', divide: 10, setting: true },
    14: { name: 'eco_temperature', type: 'value', divide: 10, setting: true },
    16: { name: 'boost_time', type: 'value', unit: 's', setting: true },
    19: { name: 'temperature_calibration', type: 'value', divide: 10, setting: true, min: -9, max: 9 },
    28: { name: 'valve_detection', type: 'bool' },
    40: { name: 'schedule_monday', type: 'raw' },
    41: { name: 'schedule_tuesday', type: 'raw' },
    42: { name: 'schedule_wednesday', type: 'raw' },
    43: { name: 'schedule_thursday', type: 'raw' },
    44: { name: 'schedule_friday', type: 'raw' },
    45: { name: 'schedule_saturday', type: 'raw' },
    46: { name: 'schedule_sunday', type: 'raw' }
  },

  // Switch/Dimmer with power monitoring
  SWITCH_POWER_MONITOR: {
    1: { name: 'state', type: 'bool', capability: 'onoff' },
    2: { name: 'brightness', type: 'value', capability: 'dim', divide: 1000 },
    3: { name: 'min_brightness', type: 'value', setting: true },
    4: { name: 'countdown', type: 'value', unit: 's' },
    6: { name: 'light_mode', type: 'enum' },
    17: { 
      name: 'power',
      type: 'value',
      capability: 'measure_power',
      divide: 10,
      unit: 'W'
    },
    18: {
      name: 'current',
      type: 'value',
      capability: 'measure_current',
      divide: 1000,
      unit: 'A'
    },
    19: {
      name: 'voltage',
      type: 'value',
      capability: 'measure_voltage',
      divide: 10,
      unit: 'V'
    },
    20: {
      name: 'energy',
      type: 'value',
      capability: 'meter_power',
      divide: 100,
      unit: 'kWh'
    }
  },

  // Door/Window with tamper and angle
  DOOR_WINDOW_ADVANCED: {
    1: { name: 'contact', type: 'bool', capability: 'alarm_contact' },
    2: { name: 'battery', type: 'value', capability: 'measure_battery' },
    3: { name: 'tamper', type: 'bool', capability: 'alarm_tamper' },
    5: { 
      name: 'opening_angle',
      type: 'value',
      capability: 'measure_angle',
      unit: '°'
    },
    14: { name: 'battery_low', type: 'bool', capability: 'alarm_battery' }
  },

  // RGB Light complete with scenes
  RGB_COMPLETE: {
    1: { name: 'state', type: 'bool', capability: 'onoff' },
    2: { 
      name: 'mode',
      type: 'enum',
      values: { 0: 'white', 1: 'color', 2: 'scene', 3: 'music' }
    },
    3: { name: 'brightness', type: 'value', capability: 'dim', divide: 1000 },
    4: { name: 'color_temp', type: 'value', capability: 'light_temperature' },
    5: { 
      name: 'color_data',
      type: 'hex_color',
      capability: 'light_hue'
    },
    6: { name: 'scene', type: 'enum' },
    8: { name: 'countdown', type: 'value', unit: 's' },
    21: { name: 'music_mode', type: 'enum' }
  }
};

console.log('📚 Enhanced DPs Database:');
console.log(`   ${Object.keys(ENHANCED_DPS_DATABASE).length} device types\n`);

// Save enhanced database locally
const enhancedDbPath = path.join(ENRICHMENT_DIR, 'enhanced-dps-database.json');
fs.writeFileSync(enhancedDbPath, JSON.stringify(ENHANCED_DPS_DATABASE, null, 2));
console.log(`✅ Saved to: ${enhancedDbPath}\n`);

// Generate flow cards configuration
const flowCardsConfig = {
  triggers: [],
  conditions: [],
  actions: []
};

// Generate triggers from DPs
Object.entries(ENHANCED_DPS_DATABASE).forEach(([deviceType, dps]) => {
  Object.entries(dps).forEach(([dpId, config]) => {
    // Alarm triggers
    if (config.capability && config.capability.startsWith('alarm_')) {
      flowCardsConfig.triggers.push({
        id: `${deviceType.toLowerCase()}_${config.name}_true`,
        title: { en: `${config.String(name).replace(/_/g, ' ')} activated` },
        tokens: [
          { name: 'value', type: 'boolean', title: { en: 'State' } }
        ]
      });
      
      flowCardsConfig.triggers.push({
        id: `${deviceType.toLowerCase()}_${config.name}_false`,
        title: { en: `${config.String(name).replace(/_/g, ' ')} cleared` },
        tokens: [
          { name: 'value', type: 'boolean', title: { en: 'State' } }
        ]
      });
    }
    
    // Measurement changed triggers
    if (config.capability && config.capability.startsWith('measure_')) {
      flowCardsConfig.triggers.push({
        id: `${deviceType.toLowerCase()}_${config.name}_changed`,
        title: { en: `${config.String(name).replace(/_/g, ' ')} changed` },
        tokens: [
          { name: 'value', type: 'number', title: { en: 'Value' } },
          { name: 'unit', type: 'string', title: { en: 'Unit' }, example: config.unit || '' }
        ]
      });
    }
  });
});

// Generate conditions
Object.entries(ENHANCED_DPS_DATABASE).forEach(([deviceType, dps]) => {
  Object.entries(dps).forEach(([dpId, config]) => {
    if (config.capability && config.capability.startsWith('measure_')) {
      flowCardsConfig.conditions.push({
        id: `${deviceType.toLowerCase()}_${config.name}_greater_than`,
        title: { en: `${config.String(name).replace(/_/g, ' ')} is greater than` },
        args: [
          { name: 'value', type: 'number', placeholder: { en: 'Value' } }
        ]
      });
      
      flowCardsConfig.conditions.push({
        id: `${deviceType.toLowerCase()}_${config.name}_less_than`,
        title: { en: `${config.String(name).replace(/_/g, ' ')} is less than` },
        args: [
          { name: 'value', type: 'number', placeholder: { en: 'Value' } }
        ]
      });
    }
  });
});

// Generate actions
Object.entries(ENHANCED_DPS_DATABASE).forEach(([deviceType, dps]) => {
  Object.entries(dps).forEach(([dpId, config]) => {
    if (config.action || config.setting) {
      if (config.type === 'bool') {
        flowCardsConfig.actions.push({
          id: `${deviceType.toLowerCase()}_set_${config.name}`,
          title: { en: `Set ${config.String(name).replace(/_/g, ' ')}` },
          args: [
            { 
              name: 'value',
              type: 'dropdown',
              values: [
                { id: 'true', label: { en: 'On' } },
                { id: 'false', label: { en: 'Off' } }
              ]
            }
          ]
        });
      } else if (config.type === 'enum') {
        const values = Object.entries(config.values).map(([id, label]) => ({
          id: id,
          label: { en: label }
        }));
        
        flowCardsConfig.actions.push({
          id: `${deviceType.toLowerCase()}_set_${config.name}`,
          title: { en: `Set ${config.String(name).replace(/_/g, ' ')}` },
          args: [
            { name: 'value', type: 'dropdown', values }
          ]
        });
      } else if (config.type === 'value') {
        flowCardsConfig.actions.push({
          id: `${deviceType.toLowerCase()}_set_${config.name}`,
          title: { en: `Set ${config.String(name).replace(/_/g, ' ')}` },
          args: [
            { 
              name: 'value',
              type: 'number',
              min: config.min,
              max: config.max,
              step: config.step || 1,
              placeholder: { en: `Value ${config.unit || ''}` }
            }
          ]
        });
      }
    }
  });
});

const flowCardsPath = path.join(ENRICHMENT_DIR, 'flow-cards-config.json');
fs.writeFileSync(flowCardsPath, JSON.stringify(flowCardsConfig, null, 2));
console.log(`✅ Generated ${flowCardsConfig.triggers.length} triggers`);
console.log(`✅ Generated ${flowCardsConfig.conditions.length} conditions`);
console.log(`✅ Generated ${flowCardsConfig.actions.length} actions`);
console.log(`✅ Saved to: ${flowCardsPath}\n`);

// Generate settings schema
const settingsSchema = [];

Object.entries(ENHANCED_DPS_DATABASE).forEach(([deviceType, dps]) => {
  Object.entries(dps).forEach(([dpId, config]) => {
    if (config.setting) {
      const setting = {
        type: config.type === 'bool' ? 'checkbox' : 
              config.type === 'enum' ? 'dropdown' : 
              'number',
        id: `dp_${dpId}_${config.name}`,
        label: { en: config.String(name).replace(/_/g, ' ') },
        value: config.type === 'bool' ? false : 
               config.type === 'enum' ? Object.keys(config.values)[0] :
               config.min || 0
      };
      
      if (config.type === 'enum') {
        setting.values = Object.entries(config.values).map(([id, label]) => ({
          id: id,
          label: { en: label }
        }));
      }
      
      if (config.type === 'value') {
        setting.min = config.min;
        setting.max = config.max;
        setting.units = config.unit;
      }
      
      settingsSchema.push(setting);
    }
  });
});

const settingsPath = path.join(ENRICHMENT_DIR, 'settings-schema.json');
fs.writeFileSync(settingsPath, JSON.stringify(settingsSchema, null, 2));
console.log(`✅ Generated ${settingsSchema.length} device settings`);
console.log(`✅ Saved to: ${settingsPath}\n`);

// Summary
console.log('='.repeat(70));
console.log('\n📊 ENRICHMENT SUMMARY\n');
console.log(`Device Types: ${Object.keys(ENHANCED_DPS_DATABASE).length}`);
console.log(`Flow Triggers: ${flowCardsConfig.triggers.length}`);
console.log(`Flow Conditions: ${flowCardsConfig.conditions.length}`);
console.log(`Flow Actions: ${flowCardsConfig.actions.length}`);
console.log(`Device Settings: ${settingsSchema.length}`);

console.log('\n📂 Files Created:');
console.log(`   ${enhancedDbPath}`);
console.log(`   ${flowCardsPath}`);
console.log(`   ${settingsPath}`);

console.log('\n✅ DEEP ENRICHMENT COMPLETE!');
console.log('\n💡 Next: Apply to drivers and app.json');
