#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * ADD MISSING CRITICAL FLOWS
 * Adds important flows identified by coherence validation
 */

const MISSING_FLOWS = {
  triggers: [
    {
      id: 'gas_detected',
      title: { en: 'Gas detected', fr: 'Gaz détecté' },
      hint: { en: 'CRITICAL: Gas leak detected', fr: 'CRITIQUE: Fuite de gaz détectée' },
      tokens: [
        { name: 'severity', type: 'string', title: { en: 'Severity', fr: 'Gravité' }, example: 'critical' }
      ],
      filter: 'capabilities=alarm_gas'
    },
    {
      id: 'tamper_detected',
      title: { en: 'Tamper detected', fr: 'Effraction détectée' },
      hint: { en: 'Device tamper alarm triggered', fr: 'Alarme effraction appareil déclenchée' },
      filter: 'capabilities=alarm_tamper'
    },
    {
      id: 'voltage_changed',
      title: { en: 'Voltage changed', fr: 'Voltage changé' },
      tokens: [
        { name: 'voltage', type: 'number', title: { en: 'Voltage (V)', fr: 'Voltage (V)' }, example: 230 }
      ],
      filter: 'capabilities=measure_voltage'
    },
    {
      id: 'door_bell_pressed',
      title: { en: 'Doorbell pressed', fr: 'Sonnette pressée' },
      hint: { en: 'Someone pressed the doorbell', fr: 'Quelqu\'un a sonné' },
      tokens: [
        { name: 'timestamp', type: 'string', title: { en: 'Time', fr: 'Heure' }, example: '14:30' }
      ],
      filter: 'capabilities=alarm_generic&class=doorbell'
    }
  ],
  
  conditions: [
    {
      id: 'voltage_above',
      title: { en: 'Voltage is !{{above|below}} threshold', fr: 'Voltage !{{au-dessus|en-dessous}} seuil' },
      args: [
        { type: 'device', name: 'device', filter: 'capabilities=measure_voltage' },
        { type: 'number', name: 'threshold', placeholder: { en: 'Voltage (V)', fr: 'Voltage (V)' }, min: 0, max: 300 }
      ]
    },
    {
      id: 'is_tampered',
      title: { en: 'Device is !{{tampered|not tampered}}', fr: 'Appareil !{{effracté|non effracté}}' },
      args: [
        { type: 'device', name: 'device', filter: 'capabilities=alarm_tamper' }
      ]
    },
    {
      id: 'curtain_position_above',
      title: { en: 'Curtain position is !{{above|below}} threshold', fr: 'Position rideau !{{au-dessus|en-dessous}} seuil' },
      args: [
        { type: 'device', name: 'device', filter: 'capabilities=windowcoverings_set' },
        { type: 'range', name: 'position', min: 0, max: 1, step: 0.01, label: { en: 'Position', fr: 'Position' } }
      ]
    }
  ],
  
  actions: [
    {
      id: 'set_curtain_position',
      title: { en: 'Set curtain position', fr: 'Régler position rideau' },
      hint: { en: 'Set curtain to specific position (0=closed, 1=open)', fr: 'Régler rideau position précise (0=fermé, 1=ouvert)' },
      args: [
        { type: 'device', name: 'device', filter: 'capabilities=windowcoverings_set' },
        { type: 'range', name: 'position', min: 0, max: 1, step: 0.01, label: { en: 'Position', fr: 'Position' } }
      ]
    },
    {
      id: 'set_target_temperature',
      title: { en: 'Set target temperature', fr: 'Régler température cible' },
      args: [
        { type: 'device', name: 'device', filter: 'capabilities=target_temperature' },
        { type: 'number', name: 'temperature', placeholder: { en: 'Temperature (°C)', fr: 'Température (°C)' }, min: 5, max: 35, step: 0.5 }
      ]
    },
    {
      id: 'set_fan_speed',
      title: { en: 'Set fan speed', fr: 'Régler vitesse ventilateur' },
      args: [
        { type: 'device', name: 'device', filter: 'capabilities=fan_speed' },
        { type: 'range', name: 'speed', min: 0, max: 1, step: 0.01, label: { en: 'Speed', fr: 'Vitesse' } }
      ]
    },
    {
      id: 'flash_lights',
      title: { en: 'Flash lights', fr: 'Faire clignoter lumières' },
      hint: { en: 'Flash lights for notification/alert', fr: 'Clignoter lumières pour notification/alerte' },
      args: [
        { type: 'device', name: 'device', filter: 'capabilities=onoff' },
        { type: 'number', name: 'times', placeholder: { en: 'Times', fr: 'Fois' }, min: 1, max: 10 }
      ]
    }
  ]
};

async function main() {
  console.log('🔧 ADDING MISSING CRITICAL FLOWS\n');
  
  // Load app.json
  const appJsonPath = path.join(__dirname, '../..', 'app.json');
  const appJsonData = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(appJsonData);
  
  let stats = {
    triggers_added: 0,
    conditions_added: 0,
    actions_added: 0,
    skipped: 0
  };
  
  // Add triggers
  MISSING_FLOWS.triggers.forEach(trigger => {
    const exists = appJson.flow.triggers.find(t => t.id === trigger.id);
    if (!exists) {
      // Add device arg
      if (!trigger.args) {
        trigger.args = [];
      }
      if (!trigger.args.some(a => a.type === 'device')) {
        trigger.args.unshift({
          type: 'device',
          name: 'device',
          filter: trigger.filter || 'driver_uri=homey:app:com.dlnraja.tuya.zigbee'
        });
      }
      delete trigger.filter; // Remove our temporary filter property
      
      appJson.flow.triggers.push(trigger);
      stats.triggers_added++;
      console.log(`  ✅ Trigger: ${trigger.id}`);
    } else {
      stats.skipped++;
    }
  });
  
  // Add conditions
  MISSING_FLOWS.conditions.forEach(condition => {
    const exists = appJson.flow.conditions.find(c => c.id === condition.id);
    if (!exists) {
      appJson.flow.conditions.push(condition);
      stats.conditions_added++;
      console.log(`  ✅ Condition: ${condition.id}`);
    } else {
      stats.skipped++;
    }
  });
  
  // Add actions
  MISSING_FLOWS.actions.forEach(action => {
    const exists = appJson.flow.actions.find(a => a.id === action.id);
    if (!exists) {
      appJson.flow.actions.push(action);
      stats.actions_added++;
      console.log(`  ✅ Action: ${action.id}`);
    } else {
      stats.skipped++;
    }
  });
  
  // Write updated app.json
  await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log('\n\n✅ CRITICAL FLOWS ADDED!\n');
  console.log(`📊 Statistics:`);
  console.log(`  Triggers added: ${stats.triggers_added}`);
  console.log(`  Conditions added: ${stats.conditions_added}`);
  console.log(`  Actions added: ${stats.actions_added}`);
  console.log(`  Skipped (already exist): ${stats.skipped}`);
  console.log(`\n  Total new flows: ${stats.triggers_added + stats.conditions_added + stats.actions_added}`);
  console.log(`\n  Total flows in app.json: ${appJson.flow.triggers.length + appJson.flow.conditions.length + appJson.flow.actions.length}`);
}

main().catch(console.error);
