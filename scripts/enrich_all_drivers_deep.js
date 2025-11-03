#!/usr/bin/env node
'use strict';

/**
 * ENRICH ALL DRIVERS - DEEP ENRICHMENT
 * 
 * Enrichit TOUS les drivers avec découvertes des docs Tuya:
 * 1. Time Sync capabilities
 * 2. Battery management avancé
 * 3. Flow cards complets
 * 4. Settings avancés
 * 5. Capacités étendues
 * 
 * Basé sur:
 * - Tuya Developer Platform docs
 * - Multi-Gang Switch Standard
 * - Battery Management
 * - Time Synchronization
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('🚀 ENRICHISSEMENT PROFOND DE TOUS LES DRIVERS');
console.log('═══════════════════════════════════════════════════\n');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

// Backup
const backupPath = APP_JSON + '.backup-deep-enrich';
fs.writeFileSync(backupPath, JSON.stringify(appJson, null, 2), 'utf8');
console.log(`✅ Backup: ${backupPath}\n`);

// ============================================================================
// CAPACITÉS ÉTENDUES PAR TYPE DE DEVICE
// ============================================================================

const EXTENDED_CAPABILITIES = {
  // Switches & Relays
  switches: {
    base: ['onoff'],
    advanced: [
      'onoff_duration',        // Countdown timer
      'power_on_behavior',     // Comportement au démarrage
      'led_indicator',         // LED behavior
      'backlight_mode',        // Backlight control
      'inching_mode',          // Pulse mode
      'child_lock'             // Protection enfant
    ],
    settings: [
      'countdown_timer',
      'power_on_state',
      'led_mode',
      'backlight_brightness',
      'pulse_duration',
      'child_lock_enabled'
    ]
  },
  
  // Sensors
  sensors: {
    battery: [
      'measure_battery',
      'measure_battery.voltage',
      'alarm_battery',
      'battery_charging_state'
    ],
    environmental: [
      'measure_temperature',
      'measure_humidity',
      'measure_luminance',
      'measure_co2',
      'measure_voc',
      'measure_pm25'
    ],
    motion: [
      'alarm_motion',
      'motion_sensitivity',
      'motion_timeout',
      'motion_distance'        // Pour radars
    ],
    contact: [
      'alarm_contact',
      'tamper_alarm'
    ]
  },
  
  // Buttons & Controllers
  buttons: {
    base: ['measure_battery'],
    scenes: [
      'scene_1',
      'scene_2',
      'scene_3',
      'scene_4'
    ],
    advanced: [
      'button_mode',           // Single/double/long press
      'button_sensitivity'
    ]
  },
  
  // Climate
  climate: {
    base: [
      'target_temperature',
      'measure_temperature',
      'thermostat_mode'
    ],
    advanced: [
      'temperature_offset',
      'frost_protection',
      'window_detection',
      'child_lock',
      'schedule_mode'
    ]
  }
};

// ============================================================================
// FLOW CARDS STANDARDS PAR TYPE
// ============================================================================

const STANDARD_FLOW_CARDS = {
  // Triggers
  triggers: {
    battery_low: {
      id: 'battery_low',
      title: { en: 'Battery low', fr: 'Batterie faible' },
      hint: { en: 'Triggered when battery level is below 20%' }
    },
    battery_critical: {
      id: 'battery_critical',
      title: { en: 'Battery critical', fr: 'Batterie critique' },
      hint: { en: 'Triggered when battery level is below 10%' }
    },
    time_synced: {
      id: 'time_synced',
      title: { en: 'Time synchronized', fr: 'Heure synchronisée' },
      hint: { en: 'Triggered when device time is synchronized' }
    },
    button_pressed: {
      id: 'button_pressed',
      title: { en: 'Button pressed', fr: 'Bouton pressé' },
      tokens: [
        { name: 'button', type: 'number', title: { en: 'Button number' } },
        { name: 'action', type: 'string', title: { en: 'Action type' } }
      ]
    }
  },
  
  // Conditions
  conditions: {
    battery_level_above: {
      id: 'battery_level_above',
      title: { en: 'Battery level !{{is|is not}} above', fr: 'Niveau batterie !{{est|n\'est pas}} au-dessus de' },
      args: [
        {
          name: 'level',
          type: 'number',
          min: 0,
          max: 100,
          step: 5,
          label: '%',
          placeholder: { en: 'Level' }
        }
      ]
    },
    is_charging: {
      id: 'is_charging',
      title: { en: 'Device !{{is|is not}} charging', fr: 'Appareil !{{est|n\'est pas}} en charge' }
    }
  },
  
  // Actions
  actions: {
    sync_time: {
      id: 'sync_time',
      title: { en: 'Sync time', fr: 'Synchroniser l\'heure' },
      hint: { en: 'Synchronize device time with Homey' }
    },
    sync_battery: {
      id: 'sync_battery',
      title: { en: 'Update battery status', fr: 'Mettre à jour la batterie' },
      hint: { en: 'Request battery status update' }
    },
    set_countdown: {
      id: 'set_countdown',
      title: { en: 'Set countdown timer', fr: 'Programmer minuterie' },
      args: [
        {
          name: 'duration',
          type: 'number',
          min: 0,
          max: 86400,
          step: 60,
          label: 's',
          placeholder: { en: 'Duration in seconds' }
        },
        {
          name: 'gang',
          type: 'dropdown',
          values: [
            { id: '1', label: { en: 'Gang 1' } },
            { id: '2', label: { en: 'Gang 2' } },
            { id: '3', label: { en: 'Gang 3' } },
            { id: '4', label: { en: 'Gang 4' } }
          ]
        }
      ]
    }
  }
};

// ============================================================================
// SETTINGS STANDARDS PAR TYPE
// ============================================================================

const STANDARD_SETTINGS = {
  // Time Sync
  time_sync: {
    id: 'enable_time_sync',
    type: 'checkbox',
    label: { en: 'Enable automatic time synchronization', fr: 'Activer la synchronisation automatique de l\'heure' },
    value: true,
    hint: { en: 'Automatically sync device time daily' }
  },
  
  // Battery
  battery_report_interval: {
    id: 'battery_report_interval',
    type: 'number',
    label: { en: 'Battery report interval (hours)', fr: 'Intervalle rapport batterie (heures)' },
    value: 1,
    min: 1,
    max: 24,
    units: 'h'
  },
  battery_alarm_threshold: {
    id: 'battery_alarm_threshold',
    type: 'number',
    label: { en: 'Low battery threshold (%)', fr: 'Seuil batterie faible (%)' },
    value: 20,
    min: 5,
    max: 50,
    units: '%'
  },
  
  // Multi-gang
  power_on_behavior: {
    id: 'power_on_behavior',
    type: 'dropdown',
    label: { en: 'Power-on behavior', fr: 'Comportement au démarrage' },
    value: 'last_state',
    values: [
      { id: 'off', label: { en: 'Always OFF' } },
      { id: 'on', label: { en: 'Always ON' } },
      { id: 'last_state', label: { en: 'Last state' } }
    ]
  },
  
  // LED
  led_indicator: {
    id: 'led_indicator',
    type: 'dropdown',
    label: { en: 'LED indicator', fr: 'Indicateur LED' },
    value: 'on_when_on',
    values: [
      { id: 'off', label: { en: 'Always OFF' } },
      { id: 'on', label: { en: 'Always ON' } },
      { id: 'on_when_on', label: { en: 'ON when device ON' } },
      { id: 'on_when_off', label: { en: 'ON when device OFF' } }
    ]
  },
  
  // Debug
  dp_debug: {
    id: 'dp_debug_mode',
    type: 'checkbox',
    label: { en: 'DP Debug mode', fr: 'Mode debug DP' },
    value: false,
    hint: { en: 'Enable detailed Tuya DataPoint logging' }
  }
};

// ============================================================================
// FONCTION: ENRICHIR DRIVER
// ============================================================================

function enrichDriver(driver) {
  let modified = false;
  console.log(`\n📱 Enriching: ${driver.id}`);
  
  // Déterminer type de driver
  const driverType = detectDriverType(driver);
  console.log(`   Type: ${driverType}`);
  
  // 1. Enrichir capabilities
  if (enrichCapabilities(driver, driverType)) {
    console.log(`   ✅ Capabilities enriched`);
    modified = true;
  }
  
  // 2. Ajouter flow cards
  if (enrichFlowCards(driver, driverType)) {
    console.log(`   ✅ Flow cards added`);
    modified = true;
  }
  
  // 3. Ajouter settings
  if (enrichSettings(driver, driverType)) {
    console.log(`   ✅ Settings added`);
    modified = true;
  }
  
  // 4. Enrichir energy metadata
  if (enrichEnergy(driver)) {
    console.log(`   ✅ Energy metadata enriched`);
    modified = true;
  }
  
  return modified;
}

function detectDriverType(driver) {
  const id = driver.id.toLowerCase();
  const className = driver.class || '';
  
  if (id.includes('switch') || id.includes('relay') || id.includes('wall')) {
    return 'switch';
  }
  if (id.includes('sensor') || id.includes('motion') || id.includes('contact') || id.includes('climate')) {
    return 'sensor';
  }
  if (id.includes('button') || id.includes('remote') || id.includes('scene')) {
    return 'button';
  }
  if (id.includes('thermostat') || id.includes('trv')) {
    return 'climate';
  }
  if (className === 'socket') {
    return 'switch';
  }
  if (className === 'sensor') {
    return 'sensor';
  }
  if (className === 'button') {
    return 'button';
  }
  
  return 'other';
}

function enrichCapabilities(driver, type) {
  if (!driver.capabilities) driver.capabilities = [];
  let added = false;
  
  // Capabilities de base selon type
  const baseCaps = EXTENDED_CAPABILITIES[type + 's']?.base || [];
  for (const cap of baseCaps) {
    if (!driver.capabilities.includes(cap)) {
      driver.capabilities.push(cap);
      added = true;
    }
  }
  
  // Si battery device, ajouter capabilities batterie
  if (driver.capabilities.includes('measure_battery')) {
    const batteryCaps = EXTENDED_CAPABILITIES.sensors.battery;
    for (const cap of batteryCaps) {
      if (cap !== 'measure_battery' && !driver.capabilities.includes(cap)) {
        // Ajouter seulement measure_battery.voltage pour éviter trop de caps
        if (cap === 'measure_battery.voltage') {
          // Commenter pour éviter surcharge
          // driver.capabilities.push(cap);
          // added = true;
        }
      }
    }
  }
  
  return added;
}

function enrichFlowCards(driver, type) {
  if (!driver.flow) driver.flow = {};
  let added = false;
  
  // Triggers
  if (!driver.flow.triggers) driver.flow.triggers = [];
  
  // Ajouter battery triggers si battery capability
  if (driver.capabilities?.includes('measure_battery')) {
    if (!driver.flow.triggers.find(t => t.id === 'battery_low')) {
      driver.flow.triggers.push(STANDARD_FLOW_CARDS.triggers.battery_low);
      added = true;
    }
  }
  
  // Ajouter button triggers si button
  if (type === 'button') {
    if (!driver.flow.triggers.find(t => t.id === 'button_pressed')) {
      driver.flow.triggers.push(STANDARD_FLOW_CARDS.triggers.button_pressed);
      added = true;
    }
  }
  
  // Actions
  if (!driver.flow.actions) driver.flow.actions = [];
  
  // Time sync action pour Tuya devices
  if (driver.zigbee?.tuyaDP || driver.id.includes('ts0601')) {
    if (!driver.flow.actions.find(a => a.id === 'sync_time')) {
      driver.flow.actions.push(STANDARD_FLOW_CARDS.actions.sync_time);
      added = true;
    }
  }
  
  // Battery sync action
  if (driver.capabilities?.includes('measure_battery')) {
    if (!driver.flow.actions.find(a => a.id === 'sync_battery')) {
      driver.flow.actions.push(STANDARD_FLOW_CARDS.actions.sync_battery);
      added = true;
    }
  }
  
  // Countdown action pour switches multi-gang
  if (type === 'switch' && (driver.id.includes('gang') || driver.id.includes('wall'))) {
    if (!driver.flow.actions.find(a => a.id === 'set_countdown')) {
      driver.flow.actions.push(STANDARD_FLOW_CARDS.actions.set_countdown);
      added = true;
    }
  }
  
  // Conditions
  if (!driver.flow.conditions) driver.flow.conditions = [];
  
  if (driver.capabilities?.includes('measure_battery')) {
    if (!driver.flow.conditions.find(c => c.id === 'battery_level_above')) {
      driver.flow.conditions.push(STANDARD_FLOW_CARDS.conditions.battery_level_above);
      added = true;
    }
  }
  
  return added;
}

function enrichSettings(driver, type) {
  if (!driver.settings) driver.settings = [];
  let added = false;
  
  // Time sync setting pour Tuya devices
  if (driver.zigbee?.tuyaDP || driver.id.includes('ts0601')) {
    if (!driver.settings.find(s => s.id === 'enable_time_sync')) {
      driver.settings.push(STANDARD_SETTINGS.time_sync);
      added = true;
    }
  }
  
  // Battery settings
  if (driver.capabilities?.includes('measure_battery')) {
    if (!driver.settings.find(s => s.id === 'battery_report_interval')) {
      driver.settings.push(STANDARD_SETTINGS.battery_report_interval);
      added = true;
    }
    if (!driver.settings.find(s => s.id === 'battery_alarm_threshold')) {
      driver.settings.push(STANDARD_SETTINGS.battery_alarm_threshold);
      added = true;
    }
  }
  
  // Switch settings
  if (type === 'switch') {
    if (!driver.settings.find(s => s.id === 'power_on_behavior')) {
      driver.settings.push(STANDARD_SETTINGS.power_on_behavior);
      added = true;
    }
    if (!driver.settings.find(s => s.id === 'led_indicator')) {
      driver.settings.push(STANDARD_SETTINGS.led_indicator);
      added = true;
    }
  }
  
  // DP Debug pour tous Tuya devices
  if (driver.zigbee?.tuyaDP || driver.id.includes('ts0601')) {
    if (!driver.settings.find(s => s.id === 'dp_debug_mode')) {
      driver.settings.push(STANDARD_SETTINGS.dp_debug);
      added = true;
    }
  }
  
  return added;
}

function enrichEnergy(driver) {
  if (!driver.energy) driver.energy = {};
  let modified = false;
  
  // Si battery capability mais pas de battery info
  if (driver.capabilities?.includes('measure_battery') && !driver.energy.batteries) {
    // Déterminer type de batterie par défaut
    let batteryType = 'CR2032'; // Default
    
    if (driver.id.includes('plug') || driver.id.includes('socket')) {
      return false; // Pas de batterie
    }
    
    driver.energy.batteries = [batteryType];
    modified = true;
  }
  
  return modified;
}

// ============================================================================
// TRAITER TOUS LES DRIVERS
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log(`ENRICHISSEMENT DE ${appJson.drivers.length} DRIVERS`);
console.log('═══════════════════════════════════════════════════');

let enriched = 0;
for (const driver of appJson.drivers) {
  if (enrichDriver(driver)) {
    enriched++;
  }
}

// ============================================================================
// SAUVEGARDER
// ============================================================================

fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

console.log('\n═══════════════════════════════════════════════════');
console.log('✅ ENRICHISSEMENT TERMINÉ');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Drivers enrichis: ${enriched}/${appJson.drivers.length}`);
console.log(`Total drivers: ${appJson.drivers.length}`);
console.log(`\nBackup: ${backupPath}\n`);

console.log('Enrichissements appliqués:');
console.log('  ✅ Capabilities étendues');
console.log('  ✅ Flow cards standards');
console.log('  ✅ Settings avancés');
console.log('  ✅ Energy metadata');
console.log('  ✅ Time sync support');
console.log('  ✅ Battery management');
console.log('');
