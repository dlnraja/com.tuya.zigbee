#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * FIX TITLEFORMATTED WARNINGS
 * Ajoute titleFormatted à tous les flow cards pour éviter les warnings
 */

const FLOWS_TO_FIX = {
  triggers: [
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
    'light_scene_activated'
  ],
  conditions: [
    'any_safety_alarm_active',
    'is_armed',
    'anyone_home',
    'room_occupied',
    'air_quality_good',
    'climate_optimal',
    'all_entries_secured',
    'is_consuming_power',
    'natural_light_sufficient'
  ],
  actions: [
    'emergency_shutdown',
    'trigger_full_security_protocol',
    'adaptive_lighting_control',
    'improve_air_quality',
    'smart_climate_optimization',
    'secure_home_protocol',
    'load_shedding_protocol',
    'circadian_lighting'
  ]
};

function generateTitleFormatted(title, args) {
  // Si le titre contient !{{}} (negation syntax), on crée titleFormatted
  if (title.en && title.en.includes('!{{')) {
    // Extract the !{{option1|option2}} pattern
    const match = title.en.match(/!\{\{([^|]+)\|([^}]+)\}\}/);
    if (match) {
      // Pour les conditions avec négation, on utilise [[arg]] syntax
      return {
        en: title.String(en).replace(/!\{\{([^|]+)\|([^}]+)\}\}/, '[[$1|$2]]'),
        fr: title.fr ? title.String(fr).replace(/!\{\{([^|]+)\|([^}]+)\}\}/, '[[$1|$2]]') : undefined
      };
    }
  }
  
  // Sinon, titleFormatted = title
  return title;
}

async function main() {
  console.log('🔧 FIXING TITLEFORMATTED WARNINGS\n');
  
  // Load app.json
  const appJsonPath = path.join(__dirname, '../..', 'app.json');
  const appJsonData = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(appJsonData);
  
  let fixed = 0;
  
  // Fix triggers
  FLOWS_TO_FIX.triggers.forEach(triggerId => {
    const trigger = appJson.flow.triggers.find(t => t.id === triggerId);
    if (trigger && !trigger.titleFormatted) {
      trigger.titleFormatted = generateTitleFormatted(trigger.title, trigger.args);
      fixed++;
      console.log(`  ✅ Fixed trigger: ${triggerId}`);
    }
  });
  
  // Fix conditions
  FLOWS_TO_FIX.conditions.forEach(conditionId => {
    const condition = appJson.flow.conditions.find(c => c.id === conditionId);
    if (condition && !condition.titleFormatted) {
      condition.titleFormatted = generateTitleFormatted(condition.title, condition.args);
      fixed++;
      console.log(`  ✅ Fixed condition: ${conditionId}`);
    }
  });
  
  // Fix actions
  FLOWS_TO_FIX.actions.forEach(actionId => {
    const action = appJson.flow.actions.find(a => a.id === actionId);
    if (action && !action.titleFormatted) {
      action.titleFormatted = generateTitleFormatted(action.title, action.args);
      fixed++;
      console.log(`  ✅ Fixed action: ${actionId}`);
    }
  });
  
  // Write updated app.json
  await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log('\n\n✅ TITLEFORMATTED WARNINGS FIXED!\n');
  console.log(`📊 Statistics:`);
  console.log(`  Total fixed: ${fixed}/28`);
  console.log(`  Triggers: ${FLOWS_TO_FIX.triggers.length}`);
  console.log(`  Conditions: ${FLOWS_TO_FIX.conditions.length}`);
  console.log(`  Actions: ${FLOWS_TO_FIX.actions.length}`);
  console.log('\n✅ Validation should now pass without warnings!');
}

main().catch(console.error);
