#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * FIX ALL TITLEFORMATTED WARNINGS
 * Adds titleFormatted to all flow cards that are missing it
 */

const MISSING_TITLEFORMATTED = [
  // Triggers
  'safety_alarm_triggered',
  'security_breach_detected',
  'sos_button_emergency',
  'presence_detected_smart',
  'no_presence_timeout',
  'air_quality_warning',
  'temperature_comfort_zone',
  'entry_state_changed',
  'entry_left_open_alert',
  'power_consumption_spike',
  'light_scene_activated',
  
  // Conditions
  'any_safety_alarm_active',
  'is_armed',
  'anyone_home',
  'room_occupied',
  'air_quality_good',
  'climate_optimal',
  'all_entries_secured',
  'is_consuming_power',
  'natural_light_sufficient',
  
  // Actions
  'emergency_shutdown',
  'trigger_full_security_protocol',
  'adaptive_lighting_control',
  'improve_air_quality',
  'smart_climate_optimization',
  'secure_home_protocol',
  'load_shedding_protocol',
  'circadian_lighting'
];

async function fixTitleFormatted() {
  console.log('🔧 FIXING TITLEFORMATTED WARNINGS\n');
  
  const appJsonPath = path.join(__dirname, '../..', 'app.json');
  const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf8'));
  
  let fixed = 0;
  
  // Fix triggers
  if (appJson.flow && appJson.flow.triggers) {
    for (const trigger of appJson.flow.triggers) {
      if (MISSING_TITLEFORMATTED.includes(trigger.id) && !trigger.titleFormatted) {
        trigger.titleFormatted = trigger.title;
        fixed++;
        console.log(`  ✅ Fixed trigger: ${trigger.id}`);
      }
    }
  }
  
  // Fix conditions
  if (appJson.flow && appJson.flow.conditions) {
    for (const condition of appJson.flow.conditions) {
      if (MISSING_TITLEFORMATTED.includes(condition.id) && !condition.titleFormatted) {
        condition.titleFormatted = condition.title;
        fixed++;
        console.log(`  ✅ Fixed condition: ${condition.id}`);
      }
    }
  }
  
  // Fix actions
  if (appJson.flow && appJson.flow.actions) {
    for (const action of appJson.flow.actions) {
      if (MISSING_TITLEFORMATTED.includes(action.id) && !action.titleFormatted) {
        action.titleFormatted = action.title;
        fixed++;
        console.log(`  ✅ Fixed action: ${action.id}`);
      }
    }
  }
  
  // Save
  await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log(`\n📊 SUMMARY\n`);
  console.log(`Total fixed: ${fixed} flow cards`);
  console.log(`Expected warnings: 28`);
  console.log(`Status: ${fixed === 28 ? '✅ ALL FIXED' : `⚠️ ${28 - fixed} remaining`}`);
  
  console.log('\n✅ app.json updated successfully!');
}

fixTitleFormatted().catch(console.error);
