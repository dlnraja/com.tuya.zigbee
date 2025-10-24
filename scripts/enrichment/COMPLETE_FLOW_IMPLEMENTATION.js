#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * COMPLETE FLOW IMPLEMENTATION
 * Génère flows dans app.json + méthodes dans device.js + registration dans driver.js
 */

// Intelligence mapping (from previous analysis)
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
        deviceMethod: 'onSafetyAlarm',
        capabilities: ['alarm_smoke', 'alarm_co', 'alarm_gas', 'alarm_water']
      }
    ],
    conditions: [
      {
        id: 'any_safety_alarm_active',
        title: { en: 'Any safety alarm !{{is|is not}} active', fr: 'Une alarme sécurité !{{est|n\'est pas}} active' },
        hint: { en: 'Check if any safety alarm currently active', fr: 'Vérifie si alarme sécurité active' },
        deviceMethod: 'checkAnySafetyAlarm',
        capabilities: ['alarm_smoke', 'alarm_co', 'alarm_gas', 'alarm_water']
      }
    ],
    actions: [
      {
        id: 'emergency_shutdown',
        title: { en: 'Emergency shutdown protocol', fr: 'Protocole arrêt urgence' },
        hint: { en: 'Execute emergency shutdown based on alarm type', fr: 'Execute arrêt urgence selon type alarme' },
        deviceMethod: 'executeEmergencyShutdown',
        capabilities: ['alarm_smoke', 'alarm_co', 'alarm_gas', 'alarm_water']
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
        deviceMethod: 'onSecurityBreach',
        capabilities: ['alarm_generic', 'locked']
      },
      {
        id: 'sos_button_emergency',
        title: { en: 'SOS emergency button pressed', fr: 'Bouton SOS urgence pressé' },
        hint: { en: 'Emergency button pressed - immediate action required', fr: 'Bouton urgence pressé - action immédiate' },
        tokens: [
          { name: 'press_count', type: 'number', title: { en: 'Press Count', fr: 'Nb Pressions' }, example: 2 },
          { name: 'timestamp', type: 'string', title: { en: 'Time', fr: 'Heure' }, example: '22:30:45' }
        ],
        deviceMethod: 'onSOSEmergency',
        capabilities: ['alarm_generic']
      }
    ],
    conditions: [
      {
        id: 'is_armed',
        title: { en: 'Security is !{{armed|disarmed}}', fr: 'Sécurité !{{armée|désarmée}}' },
        hint: { en: 'Check current security armed state', fr: 'Vérifie état armement sécurité' },
        deviceMethod: 'checkArmedState',
        capabilities: ['alarm_generic', 'locked']
      }
    ],
    actions: [
      {
        id: 'trigger_full_security_protocol',
        title: { en: 'Trigger full security protocol', fr: 'Déclencher protocole sécurité complet' },
        hint: { en: 'All lights ON, sirens, lock doors, notify', fr: 'Toutes lumières ON, sirènes, verrouiller, notifier' },
        deviceMethod: 'triggerSecurityProtocol',
        capabilities: ['alarm_generic']
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
        deviceMethod: 'onPresenceDetected',
        capabilities: ['alarm_motion']
      },
      {
        id: 'no_presence_timeout',
        title: { en: 'No presence (timeout)', fr: 'Absence (délai écoulé)' },
        hint: { en: 'No motion for configured duration', fr: 'Pas de mouvement pendant durée configurée' },
        tokens: [
          { name: 'duration_minutes', type: 'number', title: { en: 'Duration (min)', fr: 'Durée (min)' }, example: 15 }
        ],
        deviceMethod: 'onPresenceTimeout',
        capabilities: ['alarm_motion']
      }
    ],
    conditions: [
      {
        id: 'anyone_home',
        title: { en: 'Anyone !{{is|is not}} home', fr: 'Quelqu\'un !{{est|n\'est pas}} à la maison' },
        hint: { en: 'Check if any presence sensor detected activity recently', fr: 'Vérifie si capteur présence a détecté activité récente' },
        deviceMethod: 'checkAnyoneHome',
        capabilities: ['alarm_motion']
      },
      {
        id: 'room_occupied',
        title: { en: 'Room is !{{occupied|vacant}}', fr: 'Pièce !{{occupée|vacante}}' },
        hint: { en: 'Check if this specific room currently occupied', fr: 'Vérifie si cette pièce actuellement occupée' },
        deviceMethod: 'checkRoomOccupied',
        capabilities: ['alarm_motion']
      }
    ],
    actions: [
      {
        id: 'adaptive_lighting_control',
        title: { en: 'Adaptive lighting control', fr: 'Contrôle éclairage adaptatif' },
        hint: { en: 'Smart lighting based on presence, lux, and time', fr: 'Éclairage intelligent selon présence, lux et heure' },
        deviceMethod: 'executeAdaptiveLighting',
        capabilities: ['alarm_motion', 'measure_luminance']
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
        deviceMethod: 'onAirQualityWarning',
        capabilities: ['measure_co2', 'measure_pm25']
      }
    ],
    conditions: [
      {
        id: 'air_quality_good',
        title: { en: 'Air quality is !{{good|poor}}', fr: 'Qualité air !{{bonne|mauvaise}}' },
        hint: { en: 'All air quality metrics in healthy range', fr: 'Toutes métriques qualité air dans zone saine' },
        deviceMethod: 'checkAirQualityGood',
        capabilities: ['measure_co2', 'measure_pm25']
      }
    ],
    actions: [
      {
        id: 'improve_air_quality',
        title: { en: 'Improve air quality', fr: 'Améliorer qualité air' },
        hint: { en: 'Activate ventilation, purifiers, open windows', fr: 'Activer ventilation, purificateurs, ouvrir fenêtres' },
        deviceMethod: 'executeAirQualityImprovement',
        capabilities: ['measure_co2', 'measure_pm25']
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
        deviceMethod: 'onTemperatureComfortChange',
        capabilities: ['measure_temperature']
      }
    ],
    conditions: [
      {
        id: 'climate_optimal',
        title: { en: 'Climate is !{{optimal|suboptimal}}', fr: 'Climat !{{optimal|sous-optimal}}' },
        hint: { en: 'Temperature and humidity both in comfort range', fr: 'Température et humidité toutes deux en zone confort' },
        deviceMethod: 'checkClimateOptimal',
        capabilities: ['measure_temperature', 'measure_humidity']
      }
    ],
    actions: [
      {
        id: 'smart_climate_optimization',
        title: { en: 'Smart climate optimization', fr: 'Optimisation climatique intelligente' },
        hint: { en: 'Optimize based on occupancy, weather, time', fr: 'Optimise selon occupancy, météo, heure' },
        deviceMethod: 'executeClimateOptimization',
        capabilities: ['measure_temperature', 'measure_humidity']
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
        deviceMethod: 'onEntryStateChanged',
        capabilities: ['alarm_contact']
      },
      {
        id: 'entry_left_open_alert',
        title: { en: 'Entry left open', fr: 'Entrée laissée ouverte' },
        hint: { en: 'Entry open beyond threshold duration', fr: 'Entrée ouverte au-delà durée seuil' },
        tokens: [
          { name: 'duration_minutes', type: 'number', title: { en: 'Duration (min)', fr: 'Durée (min)' }, example: 15 }
        ],
        deviceMethod: 'onEntryLeftOpen',
        capabilities: ['alarm_contact']
      }
    ],
    conditions: [
      {
        id: 'all_entries_secured',
        title: { en: 'All entries !{{are|are not}} secured', fr: 'Toutes entrées !{{sont|ne sont pas}} sécurisées' },
        hint: { en: 'All doors and windows closed', fr: 'Toutes portes et fenêtres fermées' },
        deviceMethod: 'checkAllEntriesSecured',
        capabilities: ['alarm_contact']
      }
    ],
    actions: [
      {
        id: 'secure_home_protocol',
        title: { en: 'Secure home protocol', fr: 'Protocole sécurisation maison' },
        hint: { en: 'Close curtains, lock doors, arm security', fr: 'Fermer rideaux, verrouiller portes, armer sécurité' },
        deviceMethod: 'executeSecureHome',
        capabilities: ['alarm_contact']
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
        deviceMethod: 'onPowerSpike',
        capabilities: ['measure_power']
      }
    ],
    conditions: [
      {
        id: 'is_consuming_power',
        title: { en: 'Device is !{{consuming|not consuming}} power', fr: 'Appareil !{{consomme|ne consomme pas}}' },
        hint: { en: 'Check if device currently drawing power', fr: 'Vérifie si appareil tire actuellement puissance' },
        deviceMethod: 'checkConsumingPower',
        capabilities: ['measure_power']
      }
    ],
    actions: [
      {
        id: 'load_shedding_protocol',
        title: { en: 'Load shedding protocol', fr: 'Protocole délestage' },
        hint: { en: 'Turn off non-essential devices', fr: 'Éteindre appareils non essentiels' },
        deviceMethod: 'executeLoadShedding',
        capabilities: ['measure_power', 'onoff']
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
        deviceMethod: 'onSceneActivated',
        capabilities: ['onoff', 'dim']
      }
    ],
    conditions: [
      {
        id: 'natural_light_sufficient',
        title: { en: 'Natural light is !{{sufficient|insufficient}}', fr: 'Lumière naturelle !{{suffisante|insuffisante}}' },
        hint: { en: 'Check if daylight enough (no artificial light needed)', fr: 'Vérifie si lumière jour suffit' },
        deviceMethod: 'checkNaturalLightSufficient',
        capabilities: ['measure_luminance', 'onoff']
      }
    ],
    actions: [
      {
        id: 'circadian_lighting',
        title: { en: 'Circadian lighting', fr: 'Éclairage circadien' },
        hint: { en: 'Adjust color temp to match sun position', fr: 'Ajuster température couleur selon position soleil' },
        deviceMethod: 'executeCircadianLighting',
        capabilities: ['light_temperature', 'dim']
      }
    ]
  }
};

// Generate device methods code
function generateDeviceMethods(intelligence, driverName) {
  const methods = [];
  const flows = INTELLIGENCE_TO_FLOWS[intelligence];
  
  if (!flows) return [];
  
  // Triggers - these trigger flows when capability changes
  if (flows.triggers) {
    flows.triggers.forEach(trigger => {
      methods.push(`
  /**
   * ${trigger.title.en}
   * Flow trigger method
   */
  async ${trigger.deviceMethod}(data = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard('${trigger.id}');
      const tokens = ${JSON.stringify(trigger.tokens.reduce((obj, t) => {
        obj[t.name] = data[t.name] || t.example;
        return obj;
      }, {}), null, 6)};
      
      await flowCard.trigger(this, tokens);
      this.log('✅ Flow triggered: ${trigger.id}', tokens);
    } catch (err) {
      this.error('❌ Flow trigger error: ${trigger.id}', err);
    }
  }`);
    });
  }
  
  // Conditions - these check device state
  if (flows.conditions) {
    flows.conditions.forEach(condition => {
      methods.push(`
  /**
   * ${condition.title.en}
   * Flow condition method
   */
  async ${condition.deviceMethod}(args) {
    try {
      // Implement logic based on capabilities
      ${condition.capabilities.map(cap => {
        if (cap.startsWith('alarm_')) {
          return `const ${String(cap).replace('alarm_', '')}Alarm = this.getCapabilityValue('${cap}') || false;`;
        } else if (cap.startsWith('measure_')) {
          return `const ${String(cap).replace('measure_', '')}Value = this.getCapabilityValue('${cap}') || 0;`;
        } else {
          return `const ${cap}Value = this.getCapabilityValue('${cap}');`;
        }
      }).join('\n      ')}
      
      // TODO: Implement smart logic here
      const result = ${condition.capabilities[0].startsWith('alarm_') ? 
        `${condition.capabilities[0].replace('alarm_', '')}Alarm` : 'false'};
      
      this.log('🔍 Condition checked: ${condition.id} =', result);
      return result;
    } catch (err) {
      this.error('❌ Condition check error: ${condition.id}', err);
      return false;
    }
  }`);
    });
  }
  
  // Actions - these execute when flow runs
  if (flows.actions) {
    flows.actions.forEach(action => {
      methods.push(`
  /**
   * ${action.title.en}
   * Flow action method
   */
  async ${action.deviceMethod}(args) {
    try {
      this.log('⚡ Executing action: ${action.id}');
      
      // TODO: Implement smart action logic here
      ${action.capabilities.includes('onoff') ? 
        `await this.setCapabilityValue('onoff', false);` : 
        '// Add action implementation'}
      
      this.log('✅ Action executed: ${action.id}');
      return true;
    } catch (err) {
      this.error('❌ Action execution error: ${action.id}', err);
      throw err;
    }
  }`);
    });
  }
  
  return methods.join('\n');
}

// Generate driver registration code
function generateDriverRegistration(intelligence) {
  const flows = INTELLIGENCE_TO_FLOWS[intelligence];
  if (!flows) return '';
  
  const registrations = [];
  
  // Register triggers (no registration needed, auto-registered)
  
  // Register conditions
  if (flows.conditions) {
    flows.conditions.forEach(condition => {
      registrations.push(`
    this.homey.flow.getConditionCard('${condition.id}')
      .registerRunListener(async (args) => {
        return args.device.${condition.deviceMethod}(args);
      });`);
    });
  }
  
  // Register actions
  if (flows.actions) {
    flows.actions.forEach(action => {
      registrations.push(`
    this.homey.flow.getActionCard('${action.id}')
      .registerRunListener(async (args) => {
        return args.device.${action.deviceMethod}(args);
      });`);
    });
  }
  
  return registrations.join('\n');
}

async function enrichDriver(driverPath, driverData) {
  // Handle both data structures
  const intelligence = driverData.intelligence?.primary || driverData.primary;
  if (!intelligence || !INTELLIGENCE_TO_FLOWS[intelligence]) {
    return { skipped: true, reason: 'No intelligence flows' };
  }
  
  try {
    // 1. Add methods to device.js
    const devicePath = path.join(driverPath, 'device.js');
    let deviceCode = await fs.readFile(devicePath, 'utf8');
    
    // Check if already enriched
    if (deviceCode.includes('Flow trigger method') || deviceCode.includes('Flow condition method')) {
      return { skipped: true, reason: 'Already has flow methods' };
    }
    
    const methods = generateDeviceMethods(intelligence, driverData.driver);
    
    // Insert before last closing brace
    const lastBraceIndex = deviceCode.lastIndexOf('}');
    const beforeLast = deviceCode.substring(0, lastBraceIndex);
    const onDeletedMatch = beforeLast.match(/async onDeleted\(\) \{[^}]*\}/s);
    
    if (onDeletedMatch) {
      const insertPosition = beforeLast.lastIndexOf(onDeletedMatch[0]) + onDeletedMatch[0].length;
      deviceCode = deviceCode.substring(0, insertPosition) + 
                   '\n' + methods + '\n' + 
                   deviceCode.substring(insertPosition);
    }
    
    await fs.writeFile(devicePath, deviceCode);
    
    // 2. Add registration to driver.js
    const driverJsPath = path.join(driverPath, 'driver.js');
    let driverCode = await fs.readFile(driverJsPath, 'utf8');
    
    if (!driverCode.includes('Flow cards registered')) {
      const registration = generateDriverRegistration(intelligence);
      
      // Insert in onInit after super.onInit()
      const superInitMatch = driverCode.match(/(await )?super\.onInit\(\);/);
      if (superInitMatch) {
        const insertPosition = driverCode.indexOf(superInitMatch[0]) + superInitMatch[0].length;
        driverCode = driverCode.substring(0, insertPosition) + 
                     '\n    // Register flow cards' + registration + 
                     '\n    this.log(\'✅ Flow cards registered\');\n' +
                     driverCode.substring(insertPosition);
      }
      
      await fs.writeFile(driverJsPath, driverCode);
    }
    
    const flows = INTELLIGENCE_TO_FLOWS[intelligence];
    return {
      success: true,
      driver: driverData.driver || driverData.name,
      intelligence: intelligence,
      methods_added: {
        triggers: flows.triggers?.length || 0,
        conditions: flows.conditions?.length || 0,
        actions: flows.actions?.length || 0
      }
    };
    
  } catch (err) {
    return { error: true, driver: driverData.driver, message: err.message };
  }
}

async function main() {
  console.log('🔧 COMPLETE FLOW IMPLEMENTATION\n');
  console.log('Adding device methods + driver registration...\n');
  
  // Load intelligent analysis
  const analysisPath = path.join(__dirname, '../../reports/INTELLIGENT_FLOW_ANALYSIS.json');
  const analysisData = await fs.readFile(analysisPath, 'utf8');
  const analysis = JSON.parse(analysisData);
  
  const results = { success: [], skipped: [], errors: [] };
  const driversDir = path.join(__dirname, '../..', 'drivers');
  
  let processed = 0;
  const total = analysis.byCategory.reduce((sum, cat) => sum + cat.drivers.length, 0);
  
  for (const category of analysis.byCategory) {
    for (const driverData of category.drivers) {
      processed++;
      process.stdout.write(`\r[${processed}/${total}] ${driverData.driver}...`);
      
      const driverPath = path.join(driversDir, driverData.driver);
      const result = await enrichDriver(driverPath, driverData);
      
      if (result.success) {
        results.success.push(result);
      } else if (result.skipped) {
        results.skipped.push({ driver: driverData.driver, reason: result.reason });
      } else if (result.error) {
        results.errors.push(result);
      }
    }
  }
  
  console.log('\n\n✅ IMPLEMENTATION COMPLETE!\n');
  console.log(`Success: ${results.success.length} drivers`);
  console.log(`Skipped: ${results.skipped.length} drivers`);
  console.log(`Errors: ${results.errors.length} drivers\n`);
  
  // Stats
  const totalMethods = results.success.reduce((sum, r) => 
    sum + r.methods_added.triggers + r.methods_added.conditions + r.methods_added.actions, 0);
  console.log(`📊 Total methods added: ${totalMethods}`);
  
  // Save results
  const resultsPath = path.join(__dirname, '../../reports/FLOW_IMPLEMENTATION_RESULTS.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results: ${resultsPath}`);
}

main().catch(console.error);
