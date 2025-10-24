#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * Automated SDK3 Enrichment Generator
 * Generates flow cards and settings for all drivers based on templates
 */

const SENSOR_TEMPLATES = {
  motion: {
    triggers: [
      { id: 'motion_detected', title: 'Motion detected', tokens: ['luminance', 'temperature', 'humidity'] },
      { id: 'motion_cleared', title: 'Motion cleared' }
    ],
    conditions: [
      { id: 'is_motion_detected', title: 'Motion is !{{detected|not detected}}' }
    ],
    actions: [
      { id: 'reset_motion_alarm', title: 'Reset motion alarm' },
      { id: 'set_motion_timeout', title: 'Set motion timeout', args: ['timeout'] }
    ],
    settings: [
      { id: 'motion_timeout', type: 'number', label: 'Motion Auto-Reset Timeout (s)', value: 60, min: 5, max: 600 },
      { id: 'enable_motion_logging', type: 'checkbox', label: 'Enable Motion Event Logging', value: false }
    ]
  },
  
  contact: {
    triggers: [
      { id: 'contact_opened', title: 'Contact opened' },
      { id: 'contact_closed', title: 'Contact closed' }
    ],
    conditions: [
      { id: 'is_contact_open', title: 'Contact is !{{open|closed}}' }
    ],
    settings: [
      { id: 'enable_contact_logging', type: 'checkbox', label: 'Enable Contact Event Logging', value: false }
    ]
  },
  
  temperature: {
    conditions: [
      { id: 'temperature_above', title: 'Temperature is !{{above|below}} threshold', args: ['threshold'] },
    ],
    triggers: [
      { id: 'temperature_threshold_exceeded', title: 'Temperature threshold exceeded', tokens: ['temperature'] }
    ],
    settings: [
      { id: 'temperature_calibration', type: 'number', label: 'Temperature Calibration (°C)', value: 0, min: -9, max: 9 },
      { id: 'temperature_threshold', type: 'number', label: 'Temperature Threshold (°C)', value: 25, min: 0, max: 50 }
    ]
  },
  
  humidity: {
    conditions: [
      { id: 'humidity_above', title: 'Humidity is !{{above|below}} threshold', args: ['threshold'] }
    ],
    triggers: [
      { id: 'humidity_threshold_exceeded', title: 'Humidity threshold exceeded', tokens: ['humidity'] }
    ],
    settings: [
      { id: 'humidity_threshold', type: 'number', label: 'Humidity Threshold (%)', value: 70, min: 0, max: 100 }
    ]
  },
  
  battery: {
    triggers: [
      { id: 'battery_low', title: 'Battery low', tokens: ['battery_level'] }
    ],
    settings: [
      { id: 'battery_low_threshold', type: 'number', label: 'Low Battery Threshold (%)', value: 20, min: 5, max: 50 },
      { id: 'battery_notification', type: 'checkbox', label: 'Enable Battery Notifications', value: true }
    ]
  }
};

const LIGHT_TEMPLATES = {
  basic: {
    triggers: [
      { id: 'light_turned_on', title: 'Light turned on' },
      { id: 'light_turned_off', title: 'Light turned off' }
    ],
    conditions: [
      { id: 'is_light_on', title: 'Light is !{{on|off}}' }
    ],
    actions: [
      { id: 'toggle_light', title: 'Toggle light' },
      { id: 'set_brightness', title: 'Set brightness', args: ['brightness'] }
    ],
    settings: [
      { id: 'power_on_behavior', type: 'dropdown', label: 'Power-On Behavior', value: 'last_state', values: ['last_state', 'on', 'off'] },
      { id: 'default_brightness', type: 'number', label: 'Default Brightness (%)', value: 100, min: 1, max: 100 }
    ]
  },
  
  color: {
    actions: [
      { id: 'set_color', title: 'Set color', args: ['color'] },
      { id: 'set_scene', title: 'Set scene', args: ['scene'] }
    ],
    settings: [
      { id: 'default_color', type: 'string', label: 'Default Color (hex)', value: '#FFFFFF' },
      { id: 'transition_time', type: 'number', label: 'Transition Time (ms)', value: 500, min: 0, max: 5000 }
    ]
  },
  
  temperature: {
    actions: [
      { id: 'set_temperature', title: 'Set color temperature', args: ['temperature'] }
    ],
    settings: [
      { id: 'default_temperature', type: 'number', label: 'Default Temperature (K)', value: 4000, min: 2700, max: 6500 }
    ]
  }
};

const SWITCH_TEMPLATES = {
  basic: {
    triggers: [
      { id: 'switch_turned_on', title: 'Switch turned on' },
      { id: 'switch_turned_off', title: 'Switch turned off' }
    ],
    conditions: [
      { id: 'is_switch_on', title: 'Switch is !{{on|off}}' }
    ],
    actions: [
      { id: 'toggle_switch', title: 'Toggle switch' }
    ],
    settings: [
      { id: 'switch_mode', type: 'dropdown', label: 'Switch Mode', value: 'toggle', values: ['toggle', 'momentary'] },
      { id: 'power_on_state', type: 'dropdown', label: 'Power-On State', value: 'last', values: ['last', 'on', 'off'] }
    ]
  },
  
  wireless: {
    triggers: [
      { id: 'button_pressed', title: 'Button pressed' },
      { id: 'button_double_pressed', title: 'Button double-pressed' },
      { id: 'button_long_pressed', title: 'Button long-pressed' }
    ],
    settings: [
      { id: 'enable_double_press', type: 'checkbox', label: 'Enable Double-Press Detection', value: false },
      { id: 'double_press_timeout', type: 'number', label: 'Double-Press Window (ms)', value: 500, min: 200, max: 2000 },
      { id: 'enable_long_press', type: 'checkbox', label: 'Enable Long-Press Detection', value: false },
      { id: 'long_press_duration', type: 'number', label: 'Long-Press Duration (ms)', value: 1000, min: 500, max: 3000 }
    ]
  }
};

const PLUG_TEMPLATES = {
  basic: {
    triggers: [
      { id: 'plug_turned_on', title: 'Plug turned on' },
      { id: 'plug_turned_off', title: 'Plug turned off' }
    ],
    conditions: [
      { id: 'is_plug_on', title: 'Plug is !{{on|off}}' }
    ],
    actions: [
      { id: 'toggle_plug', title: 'Toggle plug' }
    ],
    settings: [
      { id: 'power_on_state', type: 'dropdown', label: 'Power-On State', value: 'last', values: ['last', 'on', 'off'] },
      { id: 'enable_led', type: 'checkbox', label: 'Enable LED Indicator', value: true }
    ]
  },
  
  energy: {
    triggers: [
      { id: 'power_threshold_exceeded', title: 'Power threshold exceeded', tokens: ['power', 'current', 'voltage'] },
      { id: 'energy_threshold_exceeded', title: 'Energy threshold exceeded', tokens: ['energy'] }
    ],
    conditions: [
      { id: 'power_above', title: 'Power is !{{above|below}} threshold', args: ['threshold'] },
      { id: 'current_above', title: 'Current is !{{above|below}} threshold', args: ['threshold'] }
    ],
    actions: [
      { id: 'reset_energy_meter', title: 'Reset energy meter' }
    ],
    settings: [
      { id: 'power_threshold', type: 'number', label: 'Power Threshold (W)', value: 2000, min: 1, max: 5000 },
      { id: 'overload_protection', type: 'checkbox', label: 'Enable Overload Protection', value: true },
      { id: 'overload_limit', type: 'number', label: 'Overload Limit (W)', value: 2500, min: 1, max: 5000 }
    ]
  }
};

function determineTemplates(driver) {
  const templates = [];
  const caps = driver.capabilities || [];
  
  // Sensor templates
  if (caps.includes('alarm_motion')) templates.push('sensor_motion');
  if (caps.includes('alarm_contact')) templates.push('sensor_contact');
  if (caps.includes('measure_temperature')) templates.push('sensor_temperature');
  if (caps.includes('measure_humidity')) templates.push('sensor_humidity');
  if (driver.energy?.batteries) templates.push('sensor_battery');
  
  // Light templates
  if (caps.includes('onoff') && driver.class === 'light') {
    templates.push('light_basic');
    if (caps.includes('light_hue')) templates.push('light_color');
    if (caps.includes('light_temperature')) templates.push('light_temperature');
  }
  
  // Switch templates
  if (driver.category === 'SWITCHES') {
    if (driver.subcategory === 'WIRELESS' || driver.subcategory === 'EMERGENCY') {
      templates.push('switch_wireless');
    } else {
      templates.push('switch_basic');
    }
  }
  
  // Plug templates
  if (driver.category === 'PLUGS') {
    templates.push('plug_basic');
    if (driver.subcategory === 'ENERGY') templates.push('plug_energy');
  }
  
  return templates;
}

function generateFlowCards(driver, templates) {
  const flows = {
    triggers: [],
    conditions: [],
    actions: []
  };
  
  templates.forEach(templateName => {
    const [category, type] = templateName.split('_');
    let template = null;
    
    if (category === 'sensor') template = SENSOR_TEMPLATES[type];
    else if (category === 'light') template = LIGHT_TEMPLATES[type];
    else if (category === 'switch') template = SWITCH_TEMPLATES[type];
    else if (category === 'plug') template = PLUG_TEMPLATES[type];
    
    if (template) {
      if (template.triggers) flows.triggers.push(...template.triggers);
      if (template.conditions) flows.conditions.push(...template.conditions);
      if (template.actions) flows.actions.push(...template.actions);
    }
  });
  
  // Add driver-specific filters
  flows.triggers.forEach(t => {
    if (!t.args) t.args = [];
    t.args.unshift({
      type: 'device',
      name: 'device',
      filter: `driver_id=${driver.name}`
    });
  });
  
  flows.conditions.forEach(c => {
    if (!c.args) c.args = [];
    c.args.unshift({
      type: 'device',
      name: 'device',
      filter: `driver_id=${driver.name}`
    });
  });
  
  flows.actions.forEach(a => {
    if (!a.args) a.args = [];
    a.args.unshift({
      type: 'device',
      name: 'device',
      filter: `driver_id=${driver.name}`
    });
  });
  
  return flows;
}

function generateSettings(driver, templates) {
  const settings = [];
  
  templates.forEach(templateName => {
    const [category, type] = templateName.split('_');
    let template = null;
    
    if (category === 'sensor') template = SENSOR_TEMPLATES[type];
    else if (category === 'light') template = LIGHT_TEMPLATES[type];
    else if (category === 'switch') template = SWITCH_TEMPLATES[type];
    else if (category === 'plug') template = PLUG_TEMPLATES[type];
    
    if (template && template.settings) {
      settings.push(...template.settings);
    }
  });
  
  // Group settings
  const grouped = {
    type: 'group',
    label: { en: 'SDK3 Advanced Settings', fr: 'Paramètres Avancés SDK3' },
    children: settings
  };
  
  return [grouped];
}

async function enrichDriver(driverPath, driver) {
  const templates = determineTemplates(driver);
  if (templates.length === 0) {
    console.log(`  ⏭️  Skipping ${driver.name} (no applicable templates)`);
    return false;
  }
  
  console.log(`  🔧 Enriching ${driver.name} with templates: ${templates.join(', ')}`);
  
  // Generate flows and settings
  const flows = generateFlowCards(driver, templates);
  const settings = generateSettings(driver, templates);
  
  // Update driver.compose.json
  const composePath = path.join(driverPath, 'driver.compose.json');
  const composeData = await fs.readFile(composePath, 'utf8');
  let compose = JSON.parse(composeData);
  
  // Add settings if not present
  if (!compose.settings || compose.settings.length === 0) {
    compose.settings = settings;
  } else {
    // Merge with existing
    compose.settings.push(...settings);
  }
  
  await fs.writeFile(composePath, JSON.stringify(compose, null, 2));
  
  return {
    driver: driver.name,
    templates: templates,
    flows_added: {
      triggers: flows.triggers.length,
      conditions: flows.conditions.length,
      actions: flows.actions.length
    },
    settings_added: settings[0].children.length
  };
}

async function main() {
  console.log('🚀 Starting automated SDK3 enrichment...\n');
  
  // Load analysis
  const analysisPath = path.join(__dirname, '../../reports/SDK3_DRIVERS_DETAILED.json');
  const analysisData = await fs.readFile(analysisPath, 'utf8');
  const allDrivers = JSON.parse(analysisData);
  
  // Filter top 30 priority drivers
  const topDrivers = allDrivers
    .filter(d => d.priority >= 30)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 30);
  
  console.log(`📊 Processing ${topDrivers.length} top-priority drivers\n`);
  
  const results = [];
  const driversDir = path.join(__dirname, '../..', 'drivers');
  
  for (const driver of topDrivers) {
    const driverPath = path.join(driversDir, driver.name);
    const result = await enrichDriver(driverPath, driver);
    if (result) results.push(result);
  }
  
  // Summary
  console.log(`\n✅ ENRICHMENT COMPLETE\n`);
  console.log(`Drivers enriched: ${results.length}`);
  console.log(`Total flows: ${results.reduce((sum, r) => sum + r.flows_added.triggers + r.flows_added.conditions + r.flows_added.actions, 0)}`);
  console.log(`Total settings: ${results.reduce((sum, r) => sum + r.settings_added, 0)}`);
  
  // Save results
  const resultsPath = path.join(__dirname, '../../reports/SDK3_ENRICHMENT_RESULTS.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);
}

main().catch(console.error);
