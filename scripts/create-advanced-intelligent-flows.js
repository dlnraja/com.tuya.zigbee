#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * CREATE ADVANCED INTELLIGENT FLOW CARDS
 * Basé sur l'analyse du projet et best practices Homey
 */

const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow');
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

console.log('🚀 CREATING ADVANCED INTELLIGENT FLOW CARDS\n');
console.log('═'.repeat(80));

let created = 0;

// Analyse des drivers
const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() && !d.startsWith('.')
);

console.log(`\n📦 Found ${drivers.length} drivers\n`);

// ═══════════════════════════════════════════════════════════════════
// ADVANCED FLOW TEMPLATES
// ═══════════════════════════════════════════════════════════════════

const ADVANCED_FLOWS = {
  
  // ───────────────────────────────────────────────────────────────
  // GRADUAL/FADE ACTIONS (pour bulbs et dimmers)
  // ───────────────────────────────────────────────────────────────
  
  fade_to_brightness: (driverName) => ({
    type: 'action',
    card: {
      title: { en: 'Fade to brightness', fr: 'Fondu vers luminosité' },
      titleFormatted: { 
        en: 'Fade to [[brightness]]% in [[duration]] seconds',
        fr: 'Fondu vers [[brightness]]% en [[duration]] secondes'
      },
      hint: { 
        en: 'Gradually change brightness over time',
        fr: 'Changer progressivement la luminosité'
      },
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
        { 
          type: 'range', 
          name: 'brightness', 
          min: 0, 
          max: 100, 
          step: 1,
          label: { en: 'Target brightness (%)', fr: 'Luminosité cible (%)' }
        },
        { 
          type: 'number', 
          name: 'duration', 
          min: 0, 
          max: 3600,
          placeholder: { en: 'Duration (seconds)', fr: 'Durée (secondes)' }
        }
      ]
    }
  }),

  fade_in: (driverName) => ({
    type: 'action',
    card: {
      title: { en: 'Fade in', fr: 'Apparition progressive' },
      titleFormatted: { 
        en: 'Fade in over [[duration]] seconds',
        fr: 'Apparition en [[duration]] secondes'
      },
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
        { 
          type: 'number', 
          name: 'duration', 
          min: 1, 
          max: 60,
          value: 3,
          placeholder: { en: 'Duration (seconds)', fr: 'Durée (secondes)' }
        }
      ]
    }
  }),

  fade_out: (driverName) => ({
    type: 'action',
    card: {
      title: { en: 'Fade out', fr: 'Disparition progressive' },
      titleFormatted: { 
        en: 'Fade out over [[duration]] seconds',
        fr: 'Disparition en [[duration]] secondes'
      },
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
        { 
          type: 'number', 
          name: 'duration', 
          min: 1, 
          max: 60,
          value: 3,
          placeholder: { en: 'Duration (seconds)', fr: 'Durée (secondes)' }
        }
      ]
    }
  }),

  // ───────────────────────────────────────────────────────────────
  // TIMED ACTIONS (auto-off après X temps)
  // ───────────────────────────────────────────────────────────────

  turn_on_for: (driverName) => ({
    type: 'action',
    card: {
      title: { en: 'Turn on for duration', fr: 'Allumer pour une durée' },
      titleFormatted: { 
        en: 'Turn on for [[duration]] minutes',
        fr: 'Allumer pour [[duration]] minutes'
      },
      hint: { 
        en: 'Turn on then automatically turn off after duration',
        fr: 'Allumer puis éteindre automatiquement après la durée'
      },
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
        { 
          type: 'number', 
          name: 'duration', 
          min: 1, 
          max: 1440,
          placeholder: { en: 'Minutes', fr: 'Minutes' }
        }
      ]
    }
  }),

  turn_off_after: (driverName) => ({
    type: 'action',
    card: {
      title: { en: 'Turn off after delay', fr: 'Éteindre après délai' },
      titleFormatted: { 
        en: 'Turn off after [[delay]] seconds',
        fr: 'Éteindre après [[delay]] secondes'
      },
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
        { 
          type: 'number', 
          name: 'delay', 
          min: 1, 
          max: 3600,
          placeholder: { en: 'Delay (seconds)', fr: 'Délai (secondes)' }
        }
      ]
    }
  }),

  // ───────────────────────────────────────────────────────────────
  // SMART CONDITIONS (avec historique)
  // ───────────────────────────────────────────────────────────────

  was_on_for: (driverName) => ({
    type: 'condition',
    card: {
      title: { en: 'Was on for duration', fr: 'Était allumé pendant' },
      titleFormatted: { 
        en: 'Was on for at least [[duration]] minutes',
        fr: 'Était allumé pendant au moins [[duration]] minutes'
      },
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
        { 
          type: 'number', 
          name: 'duration', 
          min: 1, 
          max: 1440,
          placeholder: { en: 'Minutes', fr: 'Minutes' }
        }
      ]
    }
  }),

  was_off_for: (driverName) => ({
    type: 'condition',
    card: {
      title: { en: 'Was off for duration', fr: 'Était éteint pendant' },
      titleFormatted: { 
        en: 'Was off for at least [[duration]] minutes',
        fr: 'Était éteint pendant au moins [[duration]] minutes'
      },
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
        { 
          type: 'number', 
          name: 'duration', 
          min: 1, 
          max: 1440,
          placeholder: { en: 'Minutes', fr: 'Minutes' }
        }
      ]
    }
  }),

  // ───────────────────────────────────────────────────────────────
  // ADVANCED TRIGGERS (patterns complexes)
  // ───────────────────────────────────────────────────────────────

  turned_on_after_off: (driverName) => ({
    type: 'trigger',
    card: {
      title: { en: 'Turned on after being off', fr: 'Allumé après extinction' },
      titleFormatted: { 
        en: 'Turned on after being off for [[duration]] minutes',
        fr: 'Allumé après [[duration]] minutes d\'extinction'
      },
      tokens: [
        { name: 'off_duration', type: 'number', title: { en: 'Off duration (min)', fr: 'Durée extinction (min)' } }
      ],
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
        { 
          type: 'number', 
          name: 'duration', 
          min: 0, 
          max: 1440,
          placeholder: { en: 'Minimum minutes', fr: 'Minutes minimum' }
        }
      ]
    }
  }),

  state_changed_rapidly: (driverName) => ({
    type: 'trigger',
    card: {
      title: { en: 'State changed rapidly', fr: 'État changé rapidement' },
      hint: { 
        en: 'Triggers when state changes multiple times in short period',
        fr: 'Déclenché quand l\'état change plusieurs fois en peu de temps'
      },
      tokens: [
        { name: 'change_count', type: 'number', title: { en: 'Number of changes', fr: 'Nombre de changements' } }
      ],
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` }
      ]
    }
  }),

  // ───────────────────────────────────────────────────────────────
  // BATCH/GROUP ACTIONS (multi-channel)
  // ───────────────────────────────────────────────────────────────

  turn_all_channels_on: (driverName) => ({
    type: 'action',
    card: {
      title: { en: 'Turn all channels on', fr: 'Allumer tous les canaux' },
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` }
      ]
    }
  }),

  turn_all_channels_off: (driverName) => ({
    type: 'action',
    card: {
      title: { en: 'Turn all channels off', fr: 'Éteindre tous les canaux' },
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` }
      ]
    }
  }),

  toggle_all_channels: (driverName) => ({
    type: 'action',
    card: {
      title: { en: 'Toggle all channels', fr: 'Basculer tous les canaux' },
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` }
      ]
    }
  }),

  // ───────────────────────────────────────────────────────────────
  // ENERGY/POWER MONITORING ADVANCED
  // ───────────────────────────────────────────────────────────────

  power_trend_increasing: (driverName) => ({
    type: 'trigger',
    card: {
      title: { en: 'Power trend increasing', fr: 'Tendance puissance croissante' },
      hint: { 
        en: 'Power consumption has been increasing steadily',
        fr: 'La consommation augmente régulièrement'
      },
      tokens: [
        { name: 'power', type: 'number', title: { en: 'Current power (W)', fr: 'Puissance actuelle (W)' } },
        { name: 'trend', type: 'number', title: { en: 'Trend (%)', fr: 'Tendance (%)' } }
      ],
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` }
      ]
    }
  }),

  power_trend_decreasing: (driverName) => ({
    type: 'trigger',
    card: {
      title: { en: 'Power trend decreasing', fr: 'Tendance puissance décroissante' },
      hint: { 
        en: 'Power consumption has been decreasing steadily',
        fr: 'La consommation diminue régulièrement'
      },
      tokens: [
        { name: 'power', type: 'number', title: { en: 'Current power (W)', fr: 'Puissance actuelle (W)' } },
        { name: 'trend', type: 'number', title: { en: 'Trend (%)', fr: 'Tendance (%)' } }
      ],
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` }
      ]
    }
  }),

  energy_exceeded_daily: (driverName) => ({
    type: 'trigger',
    card: {
      title: { en: 'Daily energy limit exceeded', fr: 'Limite énergie journalière dépassée' },
      titleFormatted: { 
        en: 'Daily energy exceeded [[limit]] kWh',
        fr: 'Énergie journalière a dépassé [[limit]] kWh'
      },
      tokens: [
        { name: 'energy', type: 'number', title: { en: 'Energy today (kWh)', fr: 'Énergie aujourd\'hui (kWh)' } }
      ],
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
        { 
          type: 'number', 
          name: 'limit', 
          min: 0.1, 
          max: 100,
          step: 0.1,
          placeholder: { en: 'Limit (kWh)', fr: 'Limite (kWh)' }
        }
      ]
    }
  }),

  // ───────────────────────────────────────────────────────────────
  // MAINTENANCE & HEALTH
  // ───────────────────────────────────────────────────────────────

  battery_health_degraded: (driverName) => ({
    type: 'trigger',
    card: {
      title: { en: 'Battery health degraded', fr: 'Santé batterie dégradée' },
      hint: { 
        en: 'Battery discharge rate is faster than normal',
        fr: 'La batterie se décharge plus vite que normal'
      },
      tokens: [
        { name: 'battery', type: 'number', title: { en: 'Battery (%)', fr: 'Batterie (%)' } },
        { name: 'health', type: 'string', title: { en: 'Health status', fr: 'État santé' } }
      ],
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` }
      ]
    }
  }),

  device_offline: (driverName) => ({
    type: 'trigger',
    card: {
      title: { en: 'Device went offline', fr: 'Appareil hors ligne' },
      hint: { 
        en: 'Device has not communicated for extended period',
        fr: 'L\'appareil n\'a pas communiqué pendant longtemps'
      },
      tokens: [
        { name: 'offline_duration', type: 'number', title: { en: 'Offline duration (min)', fr: 'Durée hors ligne (min)' } }
      ],
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` }
      ]
    }
  }),

  device_back_online: (driverName) => ({
    type: 'trigger',
    card: {
      title: { en: 'Device back online', fr: 'Appareil de retour en ligne' },
      tokens: [
        { name: 'was_offline_duration', type: 'number', title: { en: 'Was offline (min)', fr: 'Était hors ligne (min)' } }
      ],
      args: [
        { type: 'device', name: 'device', filter: `driver_id=${driverName}` }
      ]
    }
  })
};

// ═══════════════════════════════════════════════════════════════════
// INTELLIGENCE: Appliquer les flows selon les capabilities
// ═══════════════════════════════════════════════════════════════════

function shouldApplyFlow(flowName, capabilities, driverName) {
  const caps = Array.isArray(capabilities) ? capabilities : [];
  
  // Fade/gradual flows -> pour devices avec 'dim'
  if (['fade_to_brightness', 'fade_in', 'fade_out'].includes(flowName)) {
    return caps.includes('dim');
  }
  
  // Timed actions -> pour tous devices avec onoff
  if (['turn_on_for', 'turn_off_after'].includes(flowName)) {
    return caps.some(c => c === 'onoff' || c.startsWith('onoff.'));
  }
  
  // State duration -> pour devices avec onoff
  if (['was_on_for', 'was_off_for', 'turned_on_after_off', 'state_changed_rapidly'].includes(flowName)) {
    return caps.some(c => c === 'onoff' || c.startsWith('onoff.'));
  }
  
  // Multi-channel -> pour switches multi-gang (2+ gangs)
  if (['turn_all_channels_on', 'turn_all_channels_off', 'toggle_all_channels'].includes(flowName)) {
    const gangMatch = driverName.match(/(\d)gang/);
    return gangMatch && parseInt(gangMatch[1]) >= 2;
  }
  
  // Energy monitoring -> pour devices avec measure_power ou meter_power
  if (['power_trend_increasing', 'power_trend_decreasing', 'energy_exceeded_daily'].includes(flowName)) {
    return caps.includes('measure_power') || caps.includes('meter_power');
  }
  
  // Battery health -> pour devices avec measure_battery
  if (flowName === 'battery_health_degraded') {
    return caps.includes('measure_battery');
  }
  
  // Device offline/online -> pour TOUS les devices
  if (['device_offline', 'device_back_online'].includes(flowName)) {
    return true;
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// CRÉATION DES FLOWS
// ═══════════════════════════════════════════════════════════════════

console.log('\n🔨 Creating advanced intelligent flows...\n');

drivers.forEach(driverName => {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composeFile = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const capabilities = compose.capabilities || [];
    
    // Appliquer chaque flow intelligent si approprié
    Object.keys(ADVANCED_FLOWS).forEach(flowName => {
      if (shouldApplyFlow(flowName, capabilities, driverName)) {
        const flowGen = ADVANCED_FLOWS[flowName](driverName);
        const flowType = flowGen.type + 's'; // triggers, actions, conditions
        const fileName = `${driverName}_${flowName}.json`;
        const filePath = path.join(FLOW_BASE, flowType, fileName);
        
        // Skip si existe déjà
        if (fs.existsSync(filePath)) return;
        
        // Créer le flow card
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(flowGen.card, null, 2));
        created++;
        
        if (created <= 10) {
          console.log(`  ✅ ${driverName}: ${flowName}`);
        }
      }
    });
    
  } catch (e) {
    // Skip invalid JSON
  }
});

if (created > 10) {
  console.log(`  ... and ${created - 10} more`);
}

console.log('\n' + '═'.repeat(80));
console.log(`\n✅ CREATED ${created} ADVANCED INTELLIGENT FLOW CARDS\n`);

// Statistiques par type
const newCounts = {};
['actions', 'triggers', 'conditions'].forEach(type => {
  const dir = path.join(FLOW_BASE, type);
  if (fs.existsSync(dir)) {
    newCounts[type] = fs.readdirSync(dir).filter(f => f.endsWith('.json')).length;
  }
});

console.log('📊 NEW TOTALS:');
console.log(`   Actions:    ${newCounts.actions}`);
console.log(`   Triggers:   ${newCounts.triggers}`);
console.log(`   Conditions: ${newCounts.conditions}`);
console.log(`   ────────────────────`);
console.log(`   TOTAL:      ${newCounts.actions + newCounts.triggers + newCounts.conditions}\n`);
