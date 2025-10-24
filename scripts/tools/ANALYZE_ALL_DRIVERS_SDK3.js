#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * Analyze all drivers and categorize them for SDK3 enrichment
 */

const DRIVER_CATEGORIES = {
  SENSORS: {
    keywords: ['sensor', 'detector', 'monitor', 'quality'],
    subcategories: {
      MOTION: ['motion', 'pir', 'occupancy'],
      CONTACT: ['contact', 'door', 'window'],
      CLIMATE: ['temp', 'humidity', 'climate', 'co2', 'formaldehyde'],
      SAFETY: ['gas', 'co', 'smoke', 'water', 'leak'],
      LIGHT: ['lux', 'luminance', 'illumination']
    }
  },
  LIGHTS: {
    keywords: ['bulb', 'light', 'led', 'strip', 'lamp'],
    subcategories: {
      COLOR: ['rgb', 'color', 'rgbcct'],
      WHITE: ['white', 'ambiance', 'cct'],
      DIMMER: ['dimmer', 'dim'],
      STRIP: ['strip']
    }
  },
  SWITCHES: {
    keywords: ['switch', 'button'],
    subcategories: {
      WALL: ['wall_switch', '1gang', '2gang', '3gang', '4gang', '5gang', '6gang'],
      WIRELESS: ['wireless', 'scene', 'remote'],
      EMERGENCY: ['sos', 'emergency', 'panic']
    }
  },
  PLUGS: {
    keywords: ['plug', 'socket', 'outlet'],
    subcategories: {
      ENERGY: ['energy', 'power', 'monitoring'],
      EXTENSION: ['extension', 'multi'],
      SMART: ['smart', 'wifi']
    }
  },
  CLIMATE: {
    keywords: ['thermostat', 'hvac', 'radiator', 'fan', 'heater'],
    subcategories: {
      THERMOSTAT: ['thermostat', 'trv'],
      FAN: ['fan', 'ventilator'],
      HVAC: ['hvac', 'air']
    }
  },
  SECURITY: {
    keywords: ['lock', 'alarm', 'siren', 'camera', 'doorbell'],
    subcategories: {
      LOCKS: ['lock', 'fingerprint'],
      ALARMS: ['alarm', 'siren', 'chime'],
      CAMERAS: ['camera', 'doorbell']
    }
  },
  CURTAINS: {
    keywords: ['curtain', 'blind', 'shade', 'roller'],
    subcategories: {
      MOTOR: ['motor', 'controller'],
      SWITCH: ['switch']
    }
  },
  CONTROLLERS: {
    keywords: ['controller', 'gateway', 'hub', 'bridge'],
    subcategories: {
      GATEWAY: ['gateway', 'hub', 'bridge'],
      CONTROLLER: ['controller', 'module']
    }
  },
  VALVES: {
    keywords: ['valve', 'irrigation'],
    subcategories: {
      WATER: ['water', 'irrigation'],
      GAS: ['gas']
    }
  }
};

async function analyzeDriver(driverPath) {
  const driverName = path.basename(driverPath);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  try {
    const composeData = await fs.readFile(composePath, 'utf8');
    const compose = JSON.parse(composeData);
    
    return {
      name: driverName,
      displayName: compose.name?.en || driverName,
      class: compose.class || 'unknown',
      capabilities: compose.capabilities || [],
      energy: compose.energy || null,
      settings: compose.settings || [],
      hasFlows: false, // We'll check this
      category: null,
      subcategory: null,
      priority: 0
    };
  } catch (err) {
    console.error(`❌ Error reading ${driverName}:`, err.message);
    return null;
  }
}

function categorizeDriver(driver) {
  const nameLower = driver.name.toLowerCase();
  
  // Check each category
  for (const [catName, catData] of Object.entries(DRIVER_CATEGORIES)) {
    // Check if driver name contains category keywords
    const matchesCategory = catData.keywords.some(kw => nameLower.includes(kw));
    
    if (matchesCategory) {
      driver.category = catName;
      
      // Check subcategories
      for (const [subName, subKeywords] of Object.entries(catData.subcategories)) {
        if (subKeywords.some(kw => nameLower.includes(kw))) {
          driver.subcategory = subName;
          break;
        }
      }
      
      break;
    }
  }
  
  // Assign priority based on category and capabilities
  driver.priority = calculatePriority(driver);
  
  return driver;
}

function calculatePriority(driver) {
  let priority = 0;
  
  // High priority categories
  if (driver.category === 'SENSORS' && driver.capabilities.includes('alarm_motion')) priority += 50;
  if (driver.category === 'SENSORS' && driver.capabilities.includes('alarm_contact')) priority += 45;
  if (driver.category === 'SECURITY') priority += 40;
  if (driver.category === 'LIGHTS') priority += 35;
  if (driver.category === 'SWITCHES' && driver.subcategory === 'EMERGENCY') priority += 50;
  if (driver.category === 'PLUGS' && driver.subcategory === 'ENERGY') priority += 30;
  if (driver.category === 'CLIMATE') priority += 25;
  
  // Bonus for battery devices (more settings needed)
  if (driver.energy?.batteries) priority += 10;
  
  // Bonus for multiple capabilities
  priority += Math.min(driver.capabilities.length * 2, 20);
  
  return priority;
}

function generateSDK3Recommendations(driver) {
  const recommendations = {
    flows: {
      triggers: [],
      conditions: [],
      actions: []
    },
    settings: [],
    capabilities: []
  };
  
  // Generate recommendations based on category and capabilities
  
  // SENSORS
  if (driver.category === 'SENSORS') {
    if (driver.capabilities.includes('alarm_motion')) {
      recommendations.flows.triggers.push('motion_detected', 'motion_cleared');
      recommendations.flows.conditions.push('is_motion_detected');
      recommendations.flows.actions.push('reset_motion_alarm', 'set_motion_timeout');
      recommendations.settings.push('motion_timeout', 'motion_sensitivity', 'enable_motion_logging');
    }
    
    if (driver.capabilities.includes('alarm_contact')) {
      recommendations.flows.triggers.push('contact_opened', 'contact_closed');
      recommendations.flows.conditions.push('is_contact_open');
      recommendations.settings.push('enable_contact_logging');
    }
    
    if (driver.capabilities.includes('measure_temperature')) {
      recommendations.flows.conditions.push('temperature_above', 'temperature_below');
      recommendations.flows.triggers.push('temperature_threshold_exceeded');
      recommendations.settings.push('temperature_calibration', 'temperature_threshold');
    }
    
    if (driver.capabilities.includes('measure_humidity')) {
      recommendations.flows.conditions.push('humidity_above', 'humidity_below');
      recommendations.flows.triggers.push('humidity_threshold_exceeded');
      recommendations.settings.push('humidity_threshold');
    }
    
    if (driver.capabilities.includes('measure_co2')) {
      recommendations.flows.conditions.push('co2_above');
      recommendations.flows.triggers.push('co2_warning', 'co2_critical');
      recommendations.settings.push('co2_warning_threshold', 'co2_critical_threshold');
    }
  }
  
  // LIGHTS
  if (driver.category === 'LIGHTS') {
    recommendations.flows.triggers.push('light_turned_on', 'light_turned_off');
    recommendations.flows.conditions.push('is_light_on');
    recommendations.flows.actions.push('set_brightness', 'toggle_light');
    
    if (driver.capabilities.includes('light_hue')) {
      recommendations.flows.actions.push('set_color', 'set_scene');
      recommendations.settings.push('default_color', 'transition_time');
    }
    
    if (driver.capabilities.includes('light_temperature')) {
      recommendations.flows.actions.push('set_temperature');
      recommendations.settings.push('default_temperature', 'min_temperature', 'max_temperature');
    }
    
    recommendations.settings.push('power_on_behavior', 'default_brightness');
  }
  
  // SWITCHES
  if (driver.category === 'SWITCHES') {
    if (driver.subcategory === 'EMERGENCY') {
      recommendations.flows.triggers.push('button_pressed', 'button_double_pressed', 'button_long_pressed');
      recommendations.flows.actions.push('test_button');
      recommendations.settings.push('enable_double_press', 'double_press_timeout', 'enable_logging');
    } else {
      recommendations.flows.triggers.push('switch_turned_on', 'switch_turned_off', 'switch_toggled');
      recommendations.flows.conditions.push('is_switch_on');
      recommendations.settings.push('switch_mode', 'enable_interlock');
    }
  }
  
  // PLUGS
  if (driver.category === 'PLUGS') {
    recommendations.flows.triggers.push('plug_turned_on', 'plug_turned_off');
    recommendations.flows.conditions.push('is_plug_on');
    recommendations.flows.actions.push('toggle_plug', 'set_timer');
    
    if (driver.subcategory === 'ENERGY') {
      recommendations.flows.triggers.push('power_threshold_exceeded', 'energy_threshold_exceeded');
      recommendations.flows.conditions.push('power_above', 'current_above');
      recommendations.settings.push('power_threshold', 'overload_protection', 'energy_reset_day');
    }
    
    recommendations.settings.push('power_on_state', 'enable_led');
  }
  
  // CLIMATE
  if (driver.category === 'CLIMATE') {
    recommendations.flows.triggers.push('target_temperature_changed', 'mode_changed');
    recommendations.flows.conditions.push('target_temperature_above', 'is_heating', 'is_cooling');
    recommendations.flows.actions.push('set_target_temperature', 'set_mode');
    recommendations.settings.push('temperature_offset', 'min_setpoint', 'max_setpoint', 'hysteresis');
  }
  
  // SECURITY
  if (driver.category === 'SECURITY') {
    if (driver.subcategory === 'ALARMS') {
      recommendations.flows.triggers.push('alarm_triggered', 'alarm_cleared');
      recommendations.flows.actions.push('trigger_alarm', 'stop_alarm', 'test_alarm');
      recommendations.settings.push('alarm_duration', 'alarm_volume', 'enable_siren');
    }
    
    if (driver.subcategory === 'LOCKS') {
      recommendations.flows.triggers.push('lock_locked', 'lock_unlocked', 'lock_jammed');
      recommendations.flows.conditions.push('is_locked');
      recommendations.flows.actions.push('lock', 'unlock');
      recommendations.settings.push('auto_lock_timeout', 'enable_notifications');
    }
  }
  
  // CURTAINS
  if (driver.category === 'CURTAINS') {
    recommendations.flows.triggers.push('curtain_opened', 'curtain_closed', 'curtain_stopped');
    recommendations.flows.conditions.push('is_curtain_open', 'position_above');
    recommendations.flows.actions.push('open_curtain', 'close_curtain', 'stop_curtain', 'set_position');
    recommendations.settings.push('reverse_direction', 'calibration_mode', 'open_close_time');
  }
  
  // Battery settings for all battery devices
  if (driver.energy?.batteries) {
    recommendations.flows.triggers.push('battery_low');
    recommendations.settings.push('battery_low_threshold', 'battery_notification');
  }
  
  return recommendations;
}

async function main() {
  console.log('🔍 Analyzing all drivers for SDK3 enrichment...\n');
  
  const driversDir = path.join(__dirname, '../..', 'drivers');
  const driverFolders = await fs.readdir(driversDir);
  
  const allDrivers = [];
  
  for (const folder of driverFolders) {
    const driverPath = path.join(driversDir, folder);
    const stats = await fs.stat(driverPath);
    
    if (stats.isDirectory()) {
      const driver = await analyzeDriver(driverPath);
      if (driver) {
        categorizeDriver(driver);
        driver.sdk3_recommendations = generateSDK3Recommendations(driver);
        allDrivers.push(driver);
      }
    }
  }
  
  // Sort by priority
  allDrivers.sort((a, b) => b.priority - a.priority);
  
  // Generate report
  const report = {
    total_drivers: allDrivers.length,
    analyzed: new Date().toISOString(),
    categories: {},
    top_priority: allDrivers.slice(0, 30),
    recommendations_summary: {
      total_triggers: 0,
      total_conditions: 0,
      total_actions: 0,
      total_settings: 0
    }
  };
  
  // Categorize
  for (const driver of allDrivers) {
    const cat = driver.category || 'UNCATEGORIZED';
    if (!report.categories[cat]) {
      report.categories[cat] = {
        count: 0,
        drivers: []
      };
    }
    report.categories[cat].count++;
    report.categories[cat].drivers.push({
      name: driver.name,
      displayName: driver.displayName,
      subcategory: driver.subcategory,
      priority: driver.priority,
      capabilities: driver.capabilities.length,
      recommendations: {
        triggers: driver.sdk3_recommendations.flows.triggers.length,
        conditions: driver.sdk3_recommendations.flows.conditions.length,
        actions: driver.sdk3_recommendations.flows.actions.length,
        settings: driver.sdk3_recommendations.settings.length
      }
    });
    
    // Sum totals
    report.recommendations_summary.total_triggers += driver.sdk3_recommendations.flows.triggers.length;
    report.recommendations_summary.total_conditions += driver.sdk3_recommendations.flows.conditions.length;
    report.recommendations_summary.total_actions += driver.sdk3_recommendations.flows.actions.length;
    report.recommendations_summary.total_settings += driver.sdk3_recommendations.settings.length;
  }
  
  // Save full report
  const reportPath = path.join(__dirname, '../../reports/SDK3_DRIVERS_ANALYSIS.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Save detailed drivers data
  const driversPath = path.join(__dirname, '../../reports/SDK3_DRIVERS_DETAILED.json');
  await fs.writeFile(driversPath, JSON.stringify(allDrivers, null, 2));
  
  // Print summary
  console.log('📊 ANALYSIS COMPLETE\n');
  console.log(`Total Drivers: ${report.total_drivers}`);
  console.log(`\nCategories:`);
  for (const [cat, data] of Object.entries(report.categories)) {
    console.log(`  ${cat}: ${data.count} drivers`);
  }
  console.log(`\n📈 SDK3 Recommendations:`);
  console.log(`  Triggers: ${report.recommendations_summary.total_triggers}`);
  console.log(`  Conditions: ${report.recommendations_summary.total_conditions}`);
  console.log(`  Actions: ${report.recommendations_summary.total_actions}`);
  console.log(`  Settings: ${report.recommendations_summary.total_settings}`);
  
  console.log(`\n🎯 Top 10 Priority Drivers:`);
  for (let i = 0; i < Math.min(10, report.top_priority.length); i++) {
    const d = report.top_priority[i];
    console.log(`  ${i+1}. ${d.displayName} (${d.category}/${d.subcategory}) - Priority: ${d.priority}`);
  }
  
  console.log(`\n✅ Reports saved:`);
  console.log(`  - ${reportPath}`);
  console.log(`  - ${driversPath}`);
}

main().catch(console.error);
