#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * SCRIPT DE CONVERSION MASSIVE VERS SYSTÈME HYBRIDE
 * Convertit TOUS les drivers vers BaseHybridDevice/SensorDevice/PlugDevice/ButtonDevice
 */

// Mapping type → classe de base
const TYPE_TO_CLASS = {
  // Sensors
  'motion_sensor': 'SensorDevice',
  'temperature_sensor': 'SensorDevice',
  'humidity_sensor': 'SensorDevice',
  'contact_sensor': 'SensorDevice',
  'water_leak': 'SensorDevice',
  'presence_sensor': 'SensorDevice',
  'climate': 'SensorDevice',
  'air_quality': 'SensorDevice',
  'vibration': 'SensorDevice',
  
  // Plugs
  'plug': 'PlugDevice',
  'usb_outlet': 'PlugDevice',
  'outlet': 'PlugDevice',
  
  // Buttons
  'button': 'ButtonDevice',
  'scene_controller': 'ButtonDevice',
  'sound_controller': 'ButtonDevice',
  'doorbell': 'ButtonDevice',
  
  // Switches (déjà fait)
  'switch_wall': 'SwitchDevice',
  'switch_basic': 'SwitchDevice',
  'switch_hybrid': 'SwitchDevice',
  
  // Autres (BaseHybridDevice directement)
  'curtain': 'BaseHybridDevice',
  'valve': 'BaseHybridDevice',
  'thermostat': 'BaseHybridDevice',
  'radiator_valve': 'BaseHybridDevice',
  'hvac': 'BaseHybridDevice',
};

// Drivers à convertir
const DRIVERS_TO_CONVERT = [
  { path: 'air_quality_monitor', type: 'SensorDevice' },
  { path: 'button_shortcut', type: 'ButtonDevice' },
  { path: 'button_wireless', type: 'ButtonDevice' },
  { path: 'contact_sensor_vibration', type: 'SensorDevice' },
  { path: 'curtain_motor', type: 'BaseHybridDevice' },
  { path: 'doorbell_button', type: 'ButtonDevice' },
  { path: 'hvac_air_conditioner', type: 'BaseHybridDevice' },
  { path: 'hvac_dehumidifier', type: 'BaseHybridDevice' },
  { path: 'radiator_valve_smart', type: 'BaseHybridDevice' },
  { path: 'scene_controller_wireless', type: 'ButtonDevice' },
  { path: 'sound_controller', type: 'ButtonDevice' },
  { path: 'switch_hybrid_1gang', type: 'SwitchDevice' },
  { path: 'switch_hybrid_2gang', type: 'SwitchDevice' },
  { path: 'switch_hybrid_2gang_alt', type: 'SwitchDevice' },
  { path: 'switch_hybrid_3gang', type: 'SwitchDevice' },
  { path: 'switch_hybrid_4gang', type: 'SwitchDevice' },
  { path: 'switch_internal_1gang', type: 'SwitchDevice' },
  { path: 'switch_wireless_4button_alt', type: 'ButtonDevice' },
  { path: 'thermostat_advanced', type: 'BaseHybridDevice' },
  { path: 'thermostat_smart', type: 'BaseHybridDevice' },
  { path: 'thermostat_temperature_control', type: 'BaseHybridDevice' },
  { path: 'usb_outlet_1gang', type: 'PlugDevice' },
  { path: 'usb_outlet_2port', type: 'PlugDevice' },
  { path: 'usb_outlet_3gang', type: 'PlugDevice' },
  { path: 'water_valve_smart_hybrid', type: 'BaseHybridDevice' },
];

function convertDeviceFile(driverPath, targetClass) {
  const devicePath = path.join(__dirname, '..', 'drivers', driverPath, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    console.log(`⚠️  Device file not found: ${driverPath}`);
    return false;
  }
  
  let content = fs.readFileSync(devicePath, 'utf8');
  
  // Backup original
  fs.writeFileSync(devicePath + '.backup', content, 'utf8');
  
  // 1. Replace import
  const importRegex = /const\s+{\s*ZigBeeDevice\s*}\s*=\s*require\(['"]homey-zigbeedriver['"]\);?/g;
  content = content.replace(importRegex, `const ${targetClass} = require('../../lib/${targetClass}');`);
  
  // 2. Replace extends
  const extendsRegex = /extends\s+ZigBeeDevice/g;
  content = content.replace(extendsRegex, `extends ${targetClass}`);
  
  // 3. Add super.onNodeInit() if missing
  if (!content.includes('await super.onNodeInit()') && !content.includes('super.onNodeInit()')) {
    // Find onNodeInit method
    const onNodeInitRegex = /async\s+onNodeInit\s*\([^)]*\)\s*{/;
    content = content.replace(onNodeInitRegex, (match) => {
      return `${match}\n    // Initialize hybrid base (power detection)\n    await super.onNodeInit();\n`;
    });
  }
  
  fs.writeFileSync(devicePath, content, 'utf8');
  console.log(`✅ Converted: ${driverPath} → ${targetClass}`);
  return true;
}

function addHybridConfigToCompose(driverPath) {
  const composePath = path.join(__dirname, '..', 'drivers', driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  Compose file not found: ${driverPath}`);
    return false;
  }
  
  let compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  
  // Backup
  fs.writeFileSync(composePath + '.backup', JSON.stringify(compose, null, 2), 'utf8');
  
  // Add measure_battery if missing
  if (!compose.capabilities) compose.capabilities = [];
  if (!compose.capabilities.includes('measure_battery')) {
    compose.capabilities.push('measure_battery');
  }
  
  // Add energy.batteries if missing
  if (!compose.energy) compose.energy = {};
  if (!compose.energy.batteries) {
    compose.energy.batteries = ['CR2032', 'CR2450', 'CR2477', 'AAA', 'AA', 'CR123A', 'INTERNAL'];
  }
  if (!compose.energy.approximation) {
    compose.energy.approximation = { usageConstant: 0.5 };
  }
  
  // Add capabilitiesOptions for battery if missing
  if (!compose.capabilitiesOptions) compose.capabilitiesOptions = {};
  if (!compose.capabilitiesOptions.measure_battery) {
    compose.capabilitiesOptions.measure_battery = {
      title: { en: 'Battery', fr: 'Batterie' },
      preventInsights: false
    };
  }
  
  // Add settings if missing
  if (!compose.settings) compose.settings = [];
  
  const hasSettings = compose.settings.some(s => s.id === 'power_source');
  if (!hasSettings) {
    compose.settings.push(
      {
        id: 'power_source',
        type: 'dropdown',
        label: { en: 'Power Source', fr: "Source d'Alimentation" },
        value: 'auto',
        values: [
          { id: 'auto', label: { en: 'Auto Detect', fr: 'Détection Auto' } },
          { id: 'ac', label: { en: 'AC Mains', fr: 'Secteur AC' } },
          { id: 'dc', label: { en: 'DC Source', fr: 'Source DC' } },
          { id: 'battery', label: { en: 'Battery', fr: 'Batterie' } }
        ]
      },
      {
        id: 'battery_type',
        type: 'dropdown',
        label: { en: 'Battery Type', fr: 'Type de Batterie' },
        value: 'auto',
        values: [
          { id: 'auto', label: { en: 'Auto Detect', fr: 'Détection Auto' } },
          { id: 'CR2032', label: { en: 'CR2032 (3V)', fr: 'CR2032 (3V)' } },
          { id: 'CR2450', label: { en: 'CR2450 (3V)', fr: 'CR2450 (3V)' } },
          { id: 'AAA', label: { en: 'AAA (1.5V)', fr: 'AAA (1.5V)' } },
          { id: 'AA', label: { en: 'AA (1.5V)', fr: 'AA (1.5V)' } },
          { id: 'INTERNAL', label: { en: 'Rechargeable', fr: 'Rechargeable' } }
        ]
      }
    );
  }
  
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
  console.log(`✅ Updated compose: ${driverPath}`);
  return true;
}

// Main execution
console.log('🚀 CONVERSION MASSIVE VERS SYSTÈME HYBRIDE\n');
console.log(`Total drivers à convertir: ${DRIVERS_TO_CONVERT.length}\n`);

let successCount = 0;
let failCount = 0;

DRIVERS_TO_CONVERT.forEach(({ path, type }) => {
  console.log(`\n📦 Converting: ${path} → ${type}`);
  
  try {
    const deviceConverted = convertDeviceFile(path, type);
    const composeUpdated = addHybridConfigToCompose(path);
    
    if (deviceConverted && composeUpdated) {
      successCount++;
      console.log(`✅ SUCCESS: ${path}`);
    } else {
      failCount++;
      console.log(`⚠️  PARTIAL: ${path}`);
    }
  } catch (err) {
    failCount++;
    console.error(`❌ ERROR: ${path}`, err.message);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\nConversions reussies: ${successCount}/${DRIVERS_TO_CONVERT.length}`);
console.log(`Echecs: ${failCount}/${DRIVERS_TO_CONVERT.length}\n`);
console.log('N\'oubliez pas de: homey app build\n');
