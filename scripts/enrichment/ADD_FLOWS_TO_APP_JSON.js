#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * ADD FLOWS TO APP.JSON
 * Génère toutes les flow cards dans app.json basées sur l'intelligence analysis
 */

const INTELLIGENCE_TO_FLOWS = {
  safety: {
    triggers: [
      {
        id: 'safety_alarm_triggered',
        title: { en: 'Safety alarm triggered', fr: 'Alarme sécurité déclenchée' },
        hint: { en: 'Triggered when smoke, gas, or water leak detected', fr: 'Déclenché lors détection fumée, gaz ou fuite' },
        tokens: [
          { name: 'alarm_type', type: 'string', title: { en: 'Alarm Type', fr: 'Type Alarme' }, example: 'smoke' },
          { name: 'severity', type: 'string', title: { en: 'Severity', fr: 'Gravité' }, example: 'critical' }
        ],
        filter: 'capabilities=alarm_smoke|capabilities=alarm_co|capabilities=alarm_gas|capabilities=alarm_water'
      }
    ],
    conditions: [
      {
        id: 'any_safety_alarm_active',
        title: { en: 'Any safety alarm !{{is|is not}} active', fr: 'Une alarme sécurité !{{est|n\'est pas}} active' },
        hint: { en: 'Check if any safety alarm currently active', fr: 'Vérifie si alarme sécurité active' }
      }
    ],
    actions: [
      {
        id: 'emergency_shutdown',
        title: { en: 'Emergency shutdown protocol', fr: 'Protocole arrêt urgence' },
        hint: { en: 'Execute emergency shutdown based on alarm type', fr: 'Execute arrêt urgence selon type alarme' }
      }
    ]
  },
  
  security: {
    triggers: [
      {
        id: 'security_breach_detected',
        title: { en: 'Security breach detected', fr: 'Violation sécurité détectée' },
        hint: { en: 'Door forced, tamper, or unauthorized access', fr: 'Porte forcée, effraction ou accès non autorisé' },
        tokens: [
          { name: 'breach_type', type: 'string', title: { en: 'Breach Type', fr: 'Type Violation' }, example: 'door_forced' },
          { name: 'location', type: 'string', title: { en: 'Location', fr: 'Emplacement' }, example: 'front_door' }
        ],
        filter: 'capabilities=alarm_generic|capabilities=locked'
      },
      {
        id: 'sos_button_emergency',
        title: { en: 'SOS emergency button pressed', fr: 'Bouton SOS urgence pressé' },
        hint: { en: 'Emergency button pressed - immediate action required', fr: 'Bouton urgence pressé - action immédiate' },
        tokens: [
          { name: 'press_count', type: 'number', title: { en: 'Press Count', fr: 'Nb Pressions' }, example: 2 },
          { name: 'timestamp', type: 'string', title: { en: 'Time', fr: 'Heure' }, example: '22:30:45' }
        ],
        filter: 'capabilities=alarm_generic'
      }
    ],
    conditions: [
      {
        id: 'is_armed',
        title: { en: 'Security is !{{armed|disarmed}}', fr: 'Sécurité !{{armée|désarmée}}' },
        hint: { en: 'Check current security armed state', fr: 'Vérifie état armement sécurité' }
      }
    ],
    actions: [
      {
        id: 'trigger_full_security_protocol',
        title: { en: 'Trigger full security protocol', fr: 'Déclencher protocole sécurité complet' },
        hint: { en: 'All lights ON, sirens, lock doors, notify', fr: 'Toutes lumières ON, sirènes, verrouiller, notifier' }
      }
    ]
  },
  
  presence: {
    triggers: [
      {
        id: 'presence_detected_smart',
        title: { en: 'Presence detected (smart)', fr: 'Présence détectée (intelligent)' },
        hint: { en: 'Motion detected with context (time, lux, temperature)', fr: 'Mouvement détecté avec contexte (heure, lux, température)' },
        tokens: [
          { name: 'luminance', type: 'number', title: { en: 'Luminance', fr: 'Luminosité' }, example: 45 },
          { name: 'temperature', type: 'number', title: { en: 'Temperature', fr: 'Température' }, example: 21 },
          { name: 'time_of_day', type: 'string', title: { en: 'Time of Day', fr: 'Moment Journée' }, example: 'night' }
        ],
        filter: 'capabilities=alarm_motion'
      },
      {
        id: 'no_presence_timeout',
        title: { en: 'No presence (timeout)', fr: 'Absence (délai écoulé)' },
        hint: { en: 'No motion for configured duration', fr: 'Pas de mouvement pendant durée configurée' },
        tokens: [
          { name: 'duration_minutes', type: 'number', title: { en: 'Duration (min)', fr: 'Durée (min)' }, example: 15 }
        ],
        filter: 'capabilities=alarm_motion'
      }
    ],
    conditions: [
      {
        id: 'anyone_home',
        title: { en: 'Anyone !{{is|is not}} home', fr: 'Quelqu\'un !{{est|n\'est pas}} à la maison' },
        hint: { en: 'Check if any presence sensor detected activity recently', fr: 'Vérifie si capteur présence a détecté activité récente' }
      },
      {
        id: 'room_occupied',
        title: { en: 'Room is !{{occupied|vacant}}', fr: 'Pièce !{{occupée|vacante}}' },
        hint: { en: 'Check if this specific room currently occupied', fr: 'Vérifie si cette pièce actuellement occupée' }
      }
    ],
    actions: [
      {
        id: 'adaptive_lighting_control',
        title: { en: 'Adaptive lighting control', fr: 'Contrôle éclairage adaptatif' },
        hint: { en: 'Smart lighting based on presence, lux, and time', fr: 'Éclairage intelligent selon présence, lux et heure' }
      }
    ]
  },
  
  airQuality: {
    triggers: [
      {
        id: 'air_quality_warning',
        title: { en: 'Air quality warning', fr: 'Alerte qualité air' },
        hint: { en: 'CO₂, TVOC or PM2.5 exceeded warning threshold', fr: 'CO₂, TVOC ou PM2.5 dépassé seuil alerte' },
        tokens: [
          { name: 'pollutant', type: 'string', title: { en: 'Pollutant', fr: 'Polluant' }, example: 'CO₂' },
          { name: 'level', type: 'number', title: { en: 'Level', fr: 'Niveau' }, example: 1200 },
          { name: 'health_risk', type: 'string', title: { en: 'Health Risk', fr: 'Risque Santé' }, example: 'moderate' }
        ],
        filter: 'capabilities=measure_co2|capabilities=measure_pm25'
      }
    ],
    conditions: [
      {
        id: 'air_quality_good',
        title: { en: 'Air quality is !{{good|poor}}', fr: 'Qualité air !{{bonne|mauvaise}}' },
        hint: { en: 'All air quality metrics in healthy range', fr: 'Toutes métriques qualité air dans zone saine' }
      }
    ],
    actions: [
      {
        id: 'improve_air_quality',
        title: { en: 'Improve air quality', fr: 'Améliorer qualité air' },
        hint: { en: 'Activate ventilation, purifiers, open windows', fr: 'Activer ventilation, purificateurs, ouvrir fenêtres' }
      }
    ]
  },
  
  climate: {
    triggers: [
      {
        id: 'temperature_comfort_zone',
        title: { en: 'Temperature !{{left|entered}} comfort zone', fr: 'Température !{{quitté|entré}} zone confort' },
        hint: { en: 'Temperature crossed comfort threshold', fr: 'Température franchit seuil confort' },
        tokens: [
          { name: 'temperature', type: 'number', title: { en: 'Temperature', fr: 'Température' }, example: 26.5 },
          { name: 'trend', type: 'string', title: { en: 'Trend', fr: 'Tendance' }, example: 'rising' }
        ],
        filter: 'capabilities=measure_temperature'
      }
    ],
    conditions: [
      {
        id: 'climate_optimal',
        title: { en: 'Climate is !{{optimal|suboptimal}}', fr: 'Climat !{{optimal|sous-optimal}}' },
        hint: { en: 'Temperature and humidity both in comfort range', fr: 'Température et humidité toutes deux en zone confort' }
      }
    ],
    actions: [
      {
        id: 'smart_climate_optimization',
        title: { en: 'Smart climate optimization', fr: 'Optimisation climatique intelligente' },
        hint: { en: 'Optimize based on occupancy, weather, time', fr: 'Optimise selon occupancy, météo, heure' }
      }
    ]
  },
  
  contact: {
    triggers: [
      {
        id: 'entry_state_changed',
        title: { en: 'Entry !{{opened|closed}}', fr: 'Entrée !{{ouverte|fermée}}' },
        hint: { en: 'Door or window opened/closed', fr: 'Porte ou fenêtre ouverte/fermée' },
        tokens: [
          { name: 'entry_name', type: 'string', title: { en: 'Entry', fr: 'Entrée' }, example: 'front_door' },
          { name: 'armed_status', type: 'boolean', title: { en: 'Armed', fr: 'Armé' }, example: false },
          { name: 'outside_temp', type: 'number', title: { en: 'Outside Temp', fr: 'Temp Extérieure' }, example: 15 }
        ],
        filter: 'capabilities=alarm_contact'
      },
      {
        id: 'entry_left_open_alert',
        title: { en: 'Entry left open', fr: 'Entrée laissée ouverte' },
        hint: { en: 'Entry open beyond threshold duration', fr: 'Entrée ouverte au-delà durée seuil' },
        tokens: [
          { name: 'duration_minutes', type: 'number', title: { en: 'Duration (min)', fr: 'Durée (min)' }, example: 15 }
        ],
        filter: 'capabilities=alarm_contact'
      }
    ],
    conditions: [
      {
        id: 'all_entries_secured',
        title: { en: 'All entries !{{are|are not}} secured', fr: 'Toutes entrées !{{sont|ne sont pas}} sécurisées' },
        hint: { en: 'All doors and windows closed', fr: 'Toutes portes et fenêtres fermées' }
      }
    ],
    actions: [
      {
        id: 'secure_home_protocol',
        title: { en: 'Secure home protocol', fr: 'Protocole sécurisation maison' },
        hint: { en: 'Close curtains, lock doors, arm security', fr: 'Fermer rideaux, verrouiller portes, armer sécurité' }
      }
    ]
  },
  
  energy: {
    triggers: [
      {
        id: 'power_consumption_spike',
        title: { en: 'Power consumption spike', fr: 'Pic consommation électrique' },
        hint: { en: 'Abnormally high power consumption detected', fr: 'Consommation anormalement élevée détectée' },
        tokens: [
          { name: 'power_w', type: 'number', title: { en: 'Power (W)', fr: 'Puissance (W)' }, example: 2500 },
          { name: 'baseline_w', type: 'number', title: { en: 'Baseline (W)', fr: 'Référence (W)' }, example: 150 }
        ],
        filter: 'capabilities=measure_power'
      }
    ],
    conditions: [
      {
        id: 'is_consuming_power',
        title: { en: 'Device is !{{consuming|not consuming}} power', fr: 'Appareil !{{consomme|ne consomme pas}}' },
        hint: { en: 'Check if device currently drawing power', fr: 'Vérifie si appareil tire actuellement puissance' }
      }
    ],
    actions: [
      {
        id: 'load_shedding_protocol',
        title: { en: 'Load shedding protocol', fr: 'Protocole délestage' },
        hint: { en: 'Turn off non-essential devices', fr: 'Éteindre appareils non essentiels' }
      }
    ]
  },
  
  lighting: {
    triggers: [
      {
        id: 'light_scene_activated',
        title: { en: 'Light scene activated', fr: 'Scène lumière activée' },
        hint: { en: 'Light brightness or color changed', fr: 'Luminosité ou couleur modifiée' },
        tokens: [
          { name: 'brightness', type: 'number', title: { en: 'Brightness', fr: 'Luminosité' }, example: 75 },
          { name: 'scene_type', type: 'string', title: { en: 'Scene', fr: 'Scène' }, example: 'evening' }
        ],
        filter: 'capabilities=onoff&capabilities=dim'
      }
    ],
    conditions: [
      {
        id: 'natural_light_sufficient',
        title: { en: 'Natural light is !{{sufficient|insufficient}}', fr: 'Lumière naturelle !{{suffisante|insuffisante}}' },
        hint: { en: 'Check if daylight enough (no artificial light needed)', fr: 'Vérifie si lumière jour suffit' }
      }
    ],
    actions: [
      {
        id: 'circadian_lighting',
        title: { en: 'Circadian lighting', fr: 'Éclairage circadien' },
        hint: { en: 'Adjust color temp to match sun position', fr: 'Ajuster température couleur selon position soleil' }
      }
    ]
  }
};

function createFlowCard(card, type) {
  const flowCard = {
    id: card.id,
    title: card.title,
    hint: card.hint
  };
  
  // Add args for device selection
  flowCard.args = [{
    type: 'device',
    name: 'device',
    filter: card.filter || 'driver_uri=homey:app:com.dlnraja.tuya.zigbee'
  }];
  
  // Add tokens for triggers
  if (type === 'trigger' && card.tokens) {
    flowCard.tokens = card.tokens;
  }
  
  return flowCard;
}

async function main() {
  console.log('📝 ADDING FLOWS TO APP.JSON\n');
  
  // Read current app.json
  const appJsonPath = path.join(__dirname, '../..', 'app.json');
  const appJsonData = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(appJsonData);
  
  // Initialize flow structure if not exists
  if (!appJson.flow) {
    appJson.flow = {};
  }
  if (!appJson.flow.triggers) appJson.flow.triggers = [];
  if (!appJson.flow.conditions) appJson.flow.conditions = [];
  if (!appJson.flow.actions) appJson.flow.actions = [];
  
  let stats = {
    triggers_added: 0,
    conditions_added: 0,
    actions_added: 0,
    skipped: 0
  };
  
  // Add flows from each intelligence category
  for (const [category, flows] of Object.entries(INTELLIGENCE_TO_FLOWS)) {
    console.log(`\n📦 Processing ${category.toUpperCase()}...`);
    
    // Add triggers
    if (flows.triggers) {
      for (const trigger of flows.triggers) {
        const exists = appJson.flow.triggers.find(t => t.id === trigger.id);
        if (!exists) {
          appJson.flow.triggers.push(createFlowCard(trigger, 'trigger'));
          stats.triggers_added++;
          console.log(`  ✅ Trigger: ${trigger.id}`);
        } else {
          stats.skipped++;
        }
      }
    }
    
    // Add conditions
    if (flows.conditions) {
      for (const condition of flows.conditions) {
        const exists = appJson.flow.conditions.find(c => c.id === condition.id);
        if (!exists) {
          appJson.flow.conditions.push(createFlowCard(condition, 'condition'));
          stats.conditions_added++;
          console.log(`  ✅ Condition: ${condition.id}`);
        } else {
          stats.skipped++;
        }
      }
    }
    
    // Add actions
    if (flows.actions) {
      for (const action of flows.actions) {
        const exists = appJson.flow.actions.find(a => a.id === action.id);
        if (!exists) {
          appJson.flow.actions.push(createFlowCard(action, 'action'));
          stats.actions_added++;
          console.log(`  ✅ Action: ${action.id}`);
        } else {
          stats.skipped++;
        }
      }
    }
  }
  
  // Write updated app.json
  await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log('\n\n✅ APP.JSON UPDATED!\n');
  console.log(`📊 Statistics:`);
  console.log(`  Triggers added: ${stats.triggers_added}`);
  console.log(`  Conditions added: ${stats.conditions_added}`);
  console.log(`  Actions added: ${stats.actions_added}`);
  console.log(`  Skipped (already exist): ${stats.skipped}`);
  console.log(`\n  Total new flows: ${stats.triggers_added + stats.conditions_added + stats.actions_added}`);
}

main().catch(console.error);
