#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * COMPLETE FLOWS BY CAPABILITY
 * Analyse chaque driver et génère flows complets basés sur TOUTES ses capabilities
 */

// Flow cards par capability - COMPLET
const FLOW_CARDS_BY_CAPABILITY = {
  
  // MOTION / PRESENCE
  'alarm_motion': {
    triggers: [
      {
        id: 'motion_detected',
        title: { en: 'Motion detected', fr: 'Mouvement détecté' },
        hint: { en: 'When motion is detected by the sensor', fr: 'Quand mouvement détecté' },
        tokens: [
          { name: 'luminance', type: 'number', title: { en: 'Luminance', fr: 'Luminosité' }, example: 2650 },
          { name: 'temperature', type: 'number', title: { en: 'Temperature', fr: 'Température' }, example: 21.5 },
          { name: 'humidity', type: 'number', title: { en: 'Humidity', fr: 'Humidité' }, example: 65 }
        ]
      },
      {
        id: 'motion_cleared',
        title: { en: 'Motion cleared', fr: 'Mouvement terminé' },
        hint: { en: 'When motion alarm is cleared', fr: 'Quand alarme mouvement effacée' }
      }
    ],
    conditions: [
      {
        id: 'is_motion_detected',
        title: { en: 'Motion is !{{detected|not detected}}', fr: 'Mouvement !{{détecté|non détecté}}' }
      }
    ],
    actions: [
      {
        id: 'reset_motion_alarm',
        title: { en: 'Reset motion alarm', fr: 'Réinitialiser alarme mouvement' }
      }
    ]
  },
  
  // CONTACT SENSORS
  'alarm_contact': {
    triggers: [
      {
        id: 'contact_opened',
        title: { en: 'Contact opened', fr: 'Contact ouvert' },
        hint: { en: 'Door or window opened', fr: 'Porte ou fenêtre ouverte' }
      },
      {
        id: 'contact_closed',
        title: { en: 'Contact closed', fr: 'Contact fermé' },
        hint: { en: 'Door or window closed', fr: 'Porte ou fenêtre fermée' }
      }
    ],
    conditions: [
      {
        id: 'is_contact_open',
        title: { en: 'Contact is !{{open|closed}}', fr: 'Contact !{{ouvert|fermé}}' }
      }
    ]
  },
  
  // SMOKE DETECTOR
  'alarm_smoke': {
    triggers: [
      {
        id: 'smoke_detected',
        title: { en: 'Smoke detected', fr: 'Fumée détectée' },
        hint: { en: 'CRITICAL: Smoke alarm triggered', fr: 'CRITIQUE: Alarme fumée déclenchée' }
      },
      {
        id: 'smoke_cleared',
        title: { en: 'Smoke cleared', fr: 'Fumée dissipée' }
      }
    ],
    conditions: [
      {
        id: 'is_smoke_detected',
        title: { en: 'Smoke is !{{detected|not detected}}', fr: 'Fumée !{{détectée|non détectée}}' }
      }
    ]
  },
  
  // CO DETECTOR
  'alarm_co': {
    triggers: [
      {
        id: 'co_detected',
        title: { en: 'CO detected', fr: 'CO détecté' },
        hint: { en: 'CRITICAL: Carbon monoxide detected', fr: 'CRITIQUE: Monoxyde de carbone détecté' }
      }
    ]
  },
  
  // GAS DETECTOR
  'alarm_gas': {
    triggers: [
      {
        id: 'gas_detected',
        title: { en: 'Gas detected', fr: 'Gaz détecté' },
        hint: { en: 'CRITICAL: Gas leak detected', fr: 'CRITIQUE: Fuite de gaz détectée' }
      }
    ]
  },
  
  // WATER LEAK
  'alarm_water': {
    triggers: [
      {
        id: 'water_leak_detected',
        title: { en: 'Water leak detected', fr: 'Fuite d\'eau détectée' },
        hint: { en: 'Water leak sensor triggered', fr: 'Capteur fuite d\'eau déclenché' }
      }
    ]
  },
  
  // GENERIC ALARM (SOS, etc.)
  'alarm_generic': {
    triggers: [
      {
        id: 'alarm_triggered',
        title: { en: 'Alarm triggered', fr: 'Alarme déclenchée' },
        hint: { en: 'Generic alarm activated', fr: 'Alarme générique activée' }
      }
    ],
    conditions: [
      {
        id: 'is_alarm_active',
        title: { en: 'Alarm is !{{active|inactive}}', fr: 'Alarme !{{active|inactive}}' }
      }
    ]
  },
  
  // LOCK
  'locked': {
    triggers: [
      {
        id: 'lock_locked',
        title: { en: 'Lock locked', fr: 'Serrure verrouillée' }
      },
      {
        id: 'lock_unlocked',
        title: { en: 'Lock unlocked', fr: 'Serrure déverrouillée' }
      }
    ],
    conditions: [
      {
        id: 'is_locked',
        title: { en: 'Lock is !{{locked|unlocked}}', fr: 'Serrure !{{verrouillée|déverrouillée}}' }
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
  
  // TEMPERATURE
  'measure_temperature': {
    triggers: [
      {
        id: 'temperature_changed',
        title: { en: 'Temperature changed', fr: 'Température changée' },
        tokens: [
          { name: 'temperature', type: 'number', title: { en: 'Temperature', fr: 'Température' }, example: 21.5 }
        ]
      }
    ],
    conditions: [
      {
        id: 'temperature_above',
        title: { en: 'Temperature is !{{above|below}} threshold', fr: 'Température !{{au-dessus|en-dessous}} seuil' },
        args: [
          { type: 'number', name: 'threshold', placeholder: { en: 'Temperature (°C)', fr: 'Température (°C)' }, min: -40, max: 80 }
        ]
      }
    ]
  },
  
  // HUMIDITY
  'measure_humidity': {
    triggers: [
      {
        id: 'humidity_changed',
        title: { en: 'Humidity changed', fr: 'Humidité changée' },
        tokens: [
          { name: 'humidity', type: 'number', title: { en: 'Humidity', fr: 'Humidité' }, example: 65 }
        ]
      }
    ],
    conditions: [
      {
        id: 'humidity_above',
        title: { en: 'Humidity is !{{above|below}} threshold', fr: 'Humidité !{{au-dessus|en-dessous}} seuil' },
        args: [
          { type: 'number', name: 'threshold', placeholder: { en: 'Humidity (%)', fr: 'Humidité (%)' }, min: 0, max: 100 }
        ]
      }
    ]
  },
  
  // LUMINANCE
  'measure_luminance': {
    conditions: [
      {
        id: 'luminance_above',
        title: { en: 'Luminance is !{{above|below}} threshold', fr: 'Luminosité !{{au-dessus|en-dessous}} seuil' },
        args: [
          { type: 'number', name: 'threshold', placeholder: { en: 'Luminance (lux)', fr: 'Luminosité (lux)' }, min: 0, max: 10000 }
        ]
      }
    ]
  },
  
  // CO2
  'measure_co2': {
    triggers: [
      {
        id: 'co2_warning',
        title: { en: 'CO₂ warning level', fr: 'CO₂ niveau alerte' },
        hint: { en: 'CO₂ exceeded 1000ppm', fr: 'CO₂ dépassé 1000ppm' }
      },
      {
        id: 'co2_critical',
        title: { en: 'CO₂ critical level', fr: 'CO₂ niveau critique' },
        hint: { en: 'CO₂ exceeded 2000ppm', fr: 'CO₂ dépassé 2000ppm' }
      }
    ],
    conditions: [
      {
        id: 'co2_above',
        title: { en: 'CO₂ is !{{above|below}} threshold', fr: 'CO₂ !{{au-dessus|en-dessous}} seuil' },
        args: [
          { type: 'number', name: 'threshold', placeholder: { en: 'CO₂ (ppm)', fr: 'CO₂ (ppm)' }, min: 400, max: 5000 }
        ]
      }
    ]
  },
  
  // POWER
  'measure_power': {
    triggers: [
      {
        id: 'power_threshold_exceeded',
        title: { en: 'Power threshold exceeded', fr: 'Seuil puissance dépassé' },
        tokens: [
          { name: 'power', type: 'number', title: { en: 'Power (W)', fr: 'Puissance (W)' }, example: 2500 }
        ]
      }
    ],
    conditions: [
      {
        id: 'power_above',
        title: { en: 'Power is !{{above|below}} threshold', fr: 'Puissance !{{au-dessus|en-dessous}} seuil' },
        args: [
          { type: 'number', name: 'threshold', placeholder: { en: 'Power (W)', fr: 'Puissance (W)' }, min: 0, max: 5000 }
        ]
      }
    ]
  },
  
  // BATTERY
  'measure_battery': {
    triggers: [
      {
        id: 'battery_low',
        title: { en: 'Battery low', fr: 'Batterie faible' },
        hint: { en: 'Battery below threshold', fr: 'Batterie sous seuil' },
        tokens: [
          { name: 'battery_level', type: 'number', title: { en: 'Battery Level', fr: 'Niveau Batterie' }, example: 15 }
        ]
      }
    ]
  },
  
  // ONOFF (Lights, Plugs, Switches)
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
        title: { en: 'Device is !{{on|off}}', fr: 'Appareil !{{allumé|éteint}}' }
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
        title: { en: 'Toggle on/off', fr: 'Basculer' }
      }
    ]
  },
  
  // DIM (Dimmers, Lights)
  'dim': {
    triggers: [
      {
        id: 'brightness_changed',
        title: { en: 'Brightness changed', fr: 'Luminosité changée' },
        tokens: [
          { name: 'brightness', type: 'number', title: { en: 'Brightness', fr: 'Luminosité' }, example: 75 }
        ]
      }
    ],
    actions: [
      {
        id: 'set_brightness',
        title: { en: 'Set brightness', fr: 'Régler luminosité' },
        args: [
          { type: 'range', name: 'brightness', min: 0, max: 1, step: 0.01, label: { en: 'Brightness', fr: 'Luminosité' } }
        ]
      }
    ]
  },
  
  // WINDOWCOVERINGS (Curtains, Blinds)
  'windowcoverings_state': {
    triggers: [
      {
        id: 'curtain_opened',
        title: { en: 'Curtain opened', fr: 'Rideau ouvert' }
      },
      {
        id: 'curtain_closed',
        title: { en: 'Curtain closed', fr: 'Rideau fermé' }
      }
    ],
    actions: [
      {
        id: 'open_curtain',
        title: { en: 'Open curtain', fr: 'Ouvrir rideau' }
      },
      {
        id: 'close_curtain',
        title: { en: 'Fermer rideau', fr: 'Fermer rideau' }
      },
      {
        id: 'stop_curtain',
        title: { en: 'Stop curtain', fr: 'Arrêter rideau' }
      }
    ]
  }
};

async function analyzeDriverCapabilities(driverPath, driverName) {
  try {
    const composePath = path.join(driverPath, 'driver.compose.json');
    const composeData = await fs.readFile(composePath, 'utf8');
    const compose = JSON.parse(composeData);
    
    const capabilities = compose.capabilities || [];
    const applicableFlows = {
      triggers: [],
      conditions: [],
      actions: []
    };
    
    // Collect all flows from capabilities
    for (const cap of capabilities) {
      const flowDef = FLOW_CARDS_BY_CAPABILITY[cap];
      if (flowDef) {
        if (flowDef.triggers) {
          flowDef.triggers.forEach(t => {
            applicableFlows.triggers.push({
              ...t,
              capability: cap,
              driver: driverName
            });
          });
        }
        if (flowDef.conditions) {
          flowDef.conditions.forEach(c => {
            applicableFlows.conditions.push({
              ...c,
              capability: cap,
              driver: driverName
            });
          });
        }
        if (flowDef.actions) {
          flowDef.actions.forEach(a => {
            applicableFlows.actions.push({
              ...a,
              capability: cap,
              driver: driverName
            });
          });
        }
      }
    }
    
    return {
      driver: driverName,
      capabilities: capabilities,
      flows: applicableFlows,
      totalFlows: applicableFlows.triggers.length + applicableFlows.conditions.length + applicableFlows.actions.length
    };
    
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('🔍 ANALYZING ALL DRIVERS BY CAPABILITY\n');
  
  const driversDir = path.join(__dirname, '../..', 'drivers');
  const folders = await fs.readdir(driversDir);
  
  const analysis = [];
  
  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    process.stdout.write(`\r[${i+1}/${folders.length}] ${folder}...`);
    
    const driverPath = path.join(driversDir, folder);
    const stats = await fs.stat(driverPath);
    
    if (stats.isDirectory()) {
      const result = await analyzeDriverCapabilities(driverPath, folder);
      if (result && result.totalFlows > 0) {
        analysis.push(result);
      }
    }
  }
  
  console.log('\n\n✅ ANALYSIS COMPLETE!\n');
  
  // Sort by totalFlows
  analysis.sort((a, b) => b.totalFlows - a.totalFlows);
  
  // Statistics
  const totalTriggers = analysis.reduce((sum, d) => sum + d.flows.triggers.length, 0);
  const totalConditions = analysis.reduce((sum, d) => sum + d.flows.conditions.length, 0);
  const totalActions = analysis.reduce((sum, d) => sum + d.flows.actions.length, 0);
  
  console.log(`📊 Statistics:`);
  console.log(`  Drivers analyzed: ${analysis.length}`);
  console.log(`  Total triggers: ${totalTriggers}`);
  console.log(`  Total conditions: ${totalConditions}`);
  console.log(`  Total actions: ${totalActions}`);
  console.log(`  Total flows: ${totalTriggers + totalConditions + totalActions}`);
  
  console.log(`\n🏆 Top 10 drivers by flow count:`);
  analysis.slice(0, 10).forEach((d, i) => {
    console.log(`  ${i+1}. ${d.driver} - ${d.totalFlows} flows (${d.capabilities.length} capabilities)`);
  });
  
  // Save full analysis
  const resultsPath = path.join(__dirname, '../../reports/CAPABILITY_BASED_FLOWS_ANALYSIS.json');
  await fs.writeFile(resultsPath, JSON.stringify(analysis, null, 2));
  console.log(`\n📄 Full analysis: ${resultsPath}`);
  
  // Collect ALL unique flow cards
  const allFlowCards = {
    triggers: new Map(),
    conditions: new Map(),
    actions: new Map()
  };
  
  analysis.forEach(d => {
    d.flows.triggers.forEach(t => allFlowCards.triggers.set(t.id, t));
    d.flows.conditions.forEach(c => allFlowCards.conditions.set(c.id, c));
    d.flows.actions.forEach(a => allFlowCards.actions.set(a.id, a));
  });
  
  console.log(`\n📝 Unique flow cards to add to app.json:`);
  console.log(`  Triggers: ${allFlowCards.triggers.size}`);
  console.log(`  Conditions: ${allFlowCards.conditions.size}`);
  console.log(`  Actions: ${allFlowCards.actions.size}`);
  console.log(`  Total: ${allFlowCards.triggers.size + allFlowCards.conditions.size + allFlowCards.actions.size}`);
}

main().catch(console.error);
