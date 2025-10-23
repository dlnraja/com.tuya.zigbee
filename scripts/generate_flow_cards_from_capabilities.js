#!/usr/bin/env node
'use strict';

/**
 * GENERATE FLOW CARDS FROM CAPABILITIES
 * 
 * Automatically generates flow cards based on device capabilities
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Generating flow cards from device capabilities...\n');

// Flow card templates based on capabilities
const CAPABILITY_FLOWS = {
  // Alarm capabilities (triggers)
  'alarm_motion': {
    triggers: [
      {
        id: 'alarm_motion_true',
        title: { en: 'Motion detected', fr: 'Mouvement détecté' }
      },
      {
        id: 'alarm_motion_false',
        title: { en: 'No motion', fr: 'Aucun mouvement' }
      }
    ]
  },
  
  'alarm_contact': {
    triggers: [
      {
        id: 'alarm_contact_true',
        title: { en: 'Contact alarm activated', fr: 'Alarme de contact activée' }
      },
      {
        id: 'alarm_contact_false',
        title: { en: 'Contact alarm deactivated', fr: 'Alarme de contact désactivée' }
      }
    ]
  },
  
  'alarm_water': {
    triggers: [
      {
        id: 'alarm_water_true',
        title: { en: 'Water leak detected', fr: 'Fuite d\'eau détectée' }
      },
      {
        id: 'alarm_water_false',
        title: { en: 'No water leak', fr: 'Aucune fuite d\'eau' }
      }
    ]
  },
  
  'alarm_smoke': {
    triggers: [
      {
        id: 'alarm_smoke_true',
        title: { en: 'Smoke detected', fr: 'Fumée détectée' }
      }
    ]
  },
  
  'alarm_co': {
    triggers: [
      {
        id: 'alarm_co_true',
        title: { en: 'Carbon monoxide detected', fr: 'Monoxyde de carbone détecté' }
      }
    ]
  },
  
  'alarm_co2': {
    triggers: [
      {
        id: 'alarm_co2_true',
        title: { en: 'CO2 alarm triggered', fr: 'Alarme CO2 déclenchée' }
      }
    ]
  },
  
  // Boolean capabilities (triggers + conditions + actions)
  'onoff': {
    triggers: [
      {
        id: 'turned_on',
        title: { en: 'Turned on', fr: 'Allumé' }
      },
      {
        id: 'turned_off',
        title: { en: 'Turned off', fr: 'Éteint' }
      }
    ],
    conditions: [
      {
        id: 'is_on',
        title: { en: 'Is turned !{{on|off}}', fr: 'Est !{{allumé|éteint}}' }
      }
    ],
    actions: [
      {
        id: 'turn_on',
        title: { en: 'Turn on', fr: 'Allumer' }
      },
      {
        id: 'turn_off',
        title: { en: 'Turn off', fr: 'Éteindre' }
      },
      {
        id: 'toggle',
        title: { en: 'Toggle on or off', fr: 'Basculer' }
      }
    ]
  },
  
  'locked': {
    triggers: [
      {
        id: 'locked',
        title: { en: 'Locked', fr: 'Verrouillé' }
      },
      {
        id: 'unlocked',
        title: { en: 'Unlocked', fr: 'Déverrouillé' }
      }
    ],
    conditions: [
      {
        id: 'is_locked',
        title: { en: 'Is !{{locked|unlocked}}', fr: 'Est !{{verrouillé|déverrouillé}}' }
      }
    ],
    actions: [
      {
        id: 'lock',
        title: { en: 'Lock', fr: 'Verrouiller' }
      },
      {
        id: 'unlock',
        title: { en: 'Unlock', fr: 'Déverrouiller' }
      }
    ]
  },
  
  // Measure capabilities (triggers with tokens)
  'measure_temperature': {
    triggers: [
      {
        id: 'measure_temperature_changed',
        title: { en: 'Temperature changed', fr: 'Température changée' },
        tokens: [
          {
            name: 'temperature',
            type: 'number',
            title: { en: 'Temperature', fr: 'Température' },
            example: 20.5
          }
        ]
      }
    ]
  },
  
  'measure_humidity': {
    triggers: [
      {
        id: 'measure_humidity_changed',
        title: { en: 'Humidity changed', fr: 'Humidité changée' },
        tokens: [
          {
            name: 'humidity',
            type: 'number',
            title: { en: 'Humidity', fr: 'Humidité' },
            example: 65
          }
        ]
      }
    ]
  },
  
  'measure_power': {
    triggers: [
      {
        id: 'measure_power_changed',
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
    ]
  },
  
  'measure_voltage': {
    triggers: [
      {
        id: 'measure_voltage_changed',
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
    ]
  },
  
  'measure_current': {
    triggers: [
      {
        id: 'measure_current_changed',
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
    ]
  },
  
  // Dim capability
  'dim': {
    triggers: [
      {
        id: 'dim_changed',
        title: { en: 'Brightness changed', fr: 'Luminosité changée' },
        tokens: [
          {
            name: 'dim',
            type: 'number',
            title: { en: 'Brightness', fr: 'Luminosité' },
            example: 0.75
          }
        ]
      }
    ],
    actions: [
      {
        id: 'set_dim',
        title: { en: 'Set brightness to...', fr: 'Régler la luminosité à...' },
        args: [
          {
            name: 'brightness',
            type: 'range',
            min: 0,
            max: 1,
            step: 0.01,
            label: '%',
            labelMultiplier: 100,
            title: { en: 'Brightness', fr: 'Luminosité' }
          }
        ]
      }
    ]
  },
  
  // Target temperature
  'target_temperature': {
    triggers: [
      {
        id: 'target_temperature_changed',
        title: { en: 'Target temperature changed', fr: 'Température cible changée' },
        tokens: [
          {
            name: 'temperature',
            type: 'number',
            title: { en: 'Temperature', fr: 'Température' },
            example: 21
          }
        ]
      }
    ],
    actions: [
      {
        id: 'set_target_temperature',
        title: { en: 'Set temperature to...', fr: 'Régler la température à...' },
        args: [
          {
            name: 'temperature',
            type: 'number',
            min: 5,
            max: 35,
            step: 0.5,
            title: { en: 'Temperature', fr: 'Température' }
          }
        ]
      }
    ]
  },
  
  // Window coverings position
  'windowcoverings_set': {
    triggers: [
      {
        id: 'windowcoverings_set_changed',
        title: { en: 'Position changed', fr: 'Position changée' },
        tokens: [
          {
            name: 'position',
            type: 'number',
            title: { en: 'Position', fr: 'Position' },
            example: 0.5
          }
        ]
      }
    ],
    actions: [
      {
        id: 'set_windowcoverings_set',
        title: { en: 'Set position to...', fr: 'Régler la position à...' },
        args: [
          {
            name: 'position',
            type: 'range',
            min: 0,
            max: 1,
            step: 0.01,
            label: '%',
            labelMultiplier: 100,
            title: { en: 'Position', fr: 'Position' }
          }
        ]
      },
      {
        id: 'windowcoverings_open',
        title: { en: 'Open', fr: 'Ouvrir' }
      },
      {
        id: 'windowcoverings_close',
        title: { en: 'Close', fr: 'Fermer' }
      }
    ]
  }
};

function generateFlowCards(driverId, capabilities) {
  const flows = {
    triggers: [],
    conditions: [],
    actions: []
  };
  
  // Generate flows from capabilities
  for (const cap of capabilities) {
    if (CAPABILITY_FLOWS[cap]) {
      const templates = CAPABILITY_FLOWS[cap];
      
      if (templates.triggers) {
        for (const trigger of templates.triggers) {
          flows.triggers.push({
            ...trigger,
            id: `${driverId}_${trigger.id}`
          });
        }
      }
      
      if (templates.conditions) {
        for (const condition of templates.conditions) {
          flows.conditions.push({
            ...condition,
            id: `${driverId}_${condition.id}`
          });
        }
      }
      
      if (templates.actions) {
        for (const action of templates.actions) {
          flows.actions.push({
            ...action,
            id: `${driverId}_${action.id}`
          });
        }
      }
    }
  }
  
  return flows;
}

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

let generated = 0;
let skipped = 0;

for (const driverId of drivers) {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  const flowPath = path.join(driversDir, driverId, 'driver.flow.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  // Skip if already has flow file
  if (fs.existsSync(flowPath)) {
    skipped++;
    continue;
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
  const capabilities = compose.capabilities || [];
  
  if (capabilities.length === 0) continue;
  
  const flows = generateFlowCards(driverId, capabilities);
  
  // Only create if we have at least one flow card
  if (flows.triggers.length > 0 || flows.conditions.length > 0 || flows.actions.length > 0) {
    const flowCompose = {};
    
    if (flows.triggers.length > 0) flowCompose.triggers = flows.triggers;
    if (flows.conditions.length > 0) flowCompose.conditions = flows.conditions;
    if (flows.actions.length > 0) flowCompose.actions = flows.actions;
    
    fs.writeFileSync(flowPath, JSON.stringify(flowCompose, null, 2));
    
    console.log(`✅ ${driverId}`);
    console.log(`   Triggers: ${flows.triggers.length}, Conditions: ${flows.conditions.length}, Actions: ${flows.actions.length}`);
    
    generated++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Flow files generated: ${generated}`);
console.log(`⏭️  Skipped (already exist): ${skipped}`);
console.log(`📦 Total drivers: ${drivers.length}\n`);

console.log('🎉 Flow cards generated! Run build_complete_app_json.js to rebuild app.json\n');
