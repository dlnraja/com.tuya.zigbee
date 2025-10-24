#!/usr/bin/env node
'use strict';

/**
 * UPDATE ENERGY FLOW CARDS
 * 
 * Adds missing energy flow cards to existing driver.flow.compose.json files
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔋 Updating Energy Flow Cards in existing files...\n');

// Energy flow card templates
const ENERGY_FLOW_TEMPLATES = {
  'measure_power': [
    {
      id_suffix: 'measure_power_changed',
      trigger: {
        title: { en: 'Power changed', fr: 'Puissance changée' },
        tokens: [
          {
            name: 'power',
            type: 'number',
            title: { en: 'Power', fr: 'Puissance' },
            example: 100
          }
        ]
      }
    }
  ],
  
  'meter_power': [
    {
      id_suffix: 'meter_power_changed',
      trigger: {
        title: { en: 'Energy consumption changed', fr: 'Consommation énergétique changée' },
        tokens: [
          {
            name: 'meter_power',
            type: 'number',
            title: { en: 'Energy (kWh)', fr: 'Énergie (kWh)' },
            example: 1.5
          }
        ]
      }
    }
  ],
  
  'measure_voltage': [
    {
      id_suffix: 'measure_voltage_changed',
      trigger: {
        title: { en: 'Voltage changed', fr: 'Tension changée' },
        tokens: [
          {
            name: 'voltage',
            type: 'number',
            title: { en: 'Voltage', fr: 'Tension' },
            example: 230
          }
        ]
      }
    }
  ],
  
  'measure_current': [
    {
      id_suffix: 'measure_current_changed',
      trigger: {
        title: { en: 'Current changed', fr: 'Courant changé' },
        tokens: [
          {
            name: 'current',
            type: 'number',
            title: { en: 'Current', fr: 'Courant' },
            example: 0.5
          }
        ]
      }
    }
  ],
  
  'measure_battery': [
    {
      id_suffix: 'measure_battery_changed',
      trigger: {
        title: { en: 'Battery level changed', fr: 'Niveau batterie changé' },
        tokens: [
          {
            name: 'battery',
            type: 'number',
            title: { en: 'Battery (%)', fr: 'Batterie (%)' },
            example: 75
          }
        ]
      }
    }
  ],
  
  'alarm_battery': [
    {
      id_suffix: 'alarm_battery_true',
      trigger: {
        title: { en: 'Battery low', fr: 'Batterie faible' }
      }
    },
    {
      id_suffix: 'alarm_battery_false',
      trigger: {
        title: { en: 'Battery OK', fr: 'Batterie OK' }
      }
    }
  ]
};

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

let updated = 0;
let triggersAdded = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  const flowPath = path.join(driversDir, driverId, 'driver.flow.compose.json');
  
  if (!fs.existsSync(composePath) || !fs.existsSync(flowPath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    const flows = JSON.parse(fs.readFileSync(flowPath, 'utf-8'));
    
    const capabilities = compose.capabilities || [];
    
    // Get energy capabilities
    const energyCaps = capabilities.filter(cap => ENERGY_FLOW_TEMPLATES[cap]);
    
    if (energyCaps.length === 0) continue;
    
    // Ensure triggers array exists
    if (!flows.triggers) flows.triggers = [];
    
    const existingTriggerIds = flows.triggers.map(t => t.id);
    let addedCount = 0;
    
    // Add missing energy triggers
    for (const cap of energyCaps) {
      const templates = ENERGY_FLOW_TEMPLATES[cap];
      
      for (const template of templates) {
        const triggerId = `${driverId}_${template.id_suffix}`;
        
        if (!existingTriggerIds.includes(triggerId)) {
          flows.triggers.push({
            id: triggerId,
            ...template.trigger
          });
          
          addedCount++;
          triggersAdded++;
        }
      }
    }
    
    if (addedCount > 0) {
      fs.writeFileSync(flowPath, JSON.stringify(flows, null, 2));
      
      console.log(`✅ ${driverId}`);
      console.log(`   Capabilities: ${energyCaps.join(', ')}`);
      console.log(`   Added ${addedCount} energy triggers\n`);
      
      updated++;
    }
    
  } catch (err) {
    console.error(`❌ ${driverId}: ${err.message}`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Drivers updated: ${updated}`);
console.log(`🔋 Energy triggers added: ${triggersAdded}`);
console.log(`📦 Total drivers: ${drivers.length}\n`);

console.log('🎉 Energy flow cards added! Run homey app build to rebuild\n');
