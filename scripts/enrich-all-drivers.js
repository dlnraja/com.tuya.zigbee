#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * ENRICHISSEMENT MASSIF - TOUS DRIVERS
 * Ajoute capabilities + flow cards selon famille d'appareil
 */

// CLASSIFICATION PAR FAMILLE
const DEVICE_FAMILIES = {
  bulbs: {
    patterns: ['bulb_', 'led_strip', 'spot_light', 'light_controller'],
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'measure_power', 'meter_power'],
    flowCards: {
      triggers: ['turned_on', 'turned_off', 'brightness_changed', 'color_changed', 'power_spike'],
      conditions: ['is_on', 'brightness_above', 'color_equals'],
      actions: ['turn_on', 'turn_off', 'set_brightness', 'set_color', 'set_temperature']
    },
    intelligentMode: 'auto-detect color/temp/dim clusters, expose only what exists'
  },
  
  plugs: {
    patterns: ['plug_', 'outlet', 'usb_outlet'],
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    flowCards: {
      triggers: ['turned_on', 'turned_off', 'power_above', 'power_below', 'energy_threshold'],
      conditions: ['is_on', 'power_in_range'],
      actions: ['turn_on', 'turn_off', 'toggle', 'reboot', 'reset_meter']
    },
    intelligentMode: 'auto-create monitoring triggers if meter present'
  },
  
  switches: {
    patterns: ['switch_', 'wall_touch'],
    capabilities: ['onoff', 'measure_power', 'button'],
    flowCards: {
      triggers: ['pressed_single', 'pressed_double', 'pressed_hold', 'switched_on', 'switched_off'],
      conditions: ['is_on', 'last_press_equals'],
      actions: ['turn_on', 'turn_off', 'toggle', 'set_scene']
    },
    intelligentMode: 'detect multi-gang, create triggers per button'
  },
  
  dimmers: {
    patterns: ['dimmer_', 'module_dimmer'],
    capabilities: ['onoff', 'dim', 'measure_power'],
    flowCards: {
      triggers: ['brightness_changed', 'switched'],
      conditions: ['brightness_above'],
      actions: ['set_brightness', 'fade_to', 'toggle']
    },
    intelligentMode: 'expose ramp duration if supported'
  },
  
  buttons: {
    patterns: ['button_', 'remote', 'scene_controller'],
    capabilities: ['button', 'measure_battery', 'alarm_battery'],
    flowCards: {
      triggers: ['button_pressed_single', 'button_pressed_double', 'button_pressed_hold'],
      conditions: ['button_available'],
      actions: ['simulate_press']
    },
    intelligentMode: 'auto-scan event payloads, create triggers per button (1-8)'
  },
  
  motion: {
    patterns: ['motion_sensor', 'presence_sensor', 'pir', 'radar', 'mmwave'],
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery', 'alarm_battery'],
    flowCards: {
      triggers: ['motion_detected', 'no_motion', 'motion_luminance_combo'],
      conditions: ['motion_in_last_minutes', 'luminance_below'],
      actions: ['reset_timeout']
    },
    intelligentMode: 'throttle events on battery, adapt timeout by battery level'
  },
  
  contact: {
    patterns: ['contact_sensor', 'door_sensor'],
    capabilities: ['alarm_contact', 'alarm_tamper', 'measure_battery', 'measure_temperature'],
    flowCards: {
      triggers: ['opened', 'closed', 'left_open', 'vibration'],
      conditions: ['is_open', 'open_duration'],
      actions: ['reset_tamper']
    },
    intelligentMode: 'auto-detect ZCL vs IAS style, combine multi-sensors'
  },
  
  doorbell: {
    patterns: ['doorbell', 'door_controller', 'garage_door'],
    capabilities: ['button', 'alarm_motion', 'alarm_battery'],
    flowCards: {
      triggers: ['doorbell_rung', 'motion_detected', 'button_pressed'],
      conditions: ['recent_activity'],
      actions: ['send_snapshot', 'start_recording']
    },
    intelligentMode: 'if camera present, separate motion trigger'
  },
  
  curtains: {
    patterns: ['curtain_', 'blind_', 'shutter_', 'roller', 'garage_door'],
    capabilities: ['windowcoverings_set', 'windowcoverings_state', 'measure_power'],
    flowCards: {
      triggers: ['position_changed', 'movement_started', 'movement_stopped', 'overcurrent'],
      conditions: ['position_equals', 'is_moving'],
      actions: ['open', 'close', 'set_position', 'stop', 'calibrate']
    },
    intelligentMode: 'auto-calibration, obstruction detection via overcurrent'
  },
  
  thermostat: {
    patterns: ['thermostat', 'radiator_valve', 'hvac_', 'humidity_controller'],
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode', 'measure_humidity'],
    flowCards: {
      triggers: ['temperature_reached', 'mode_changed', 'schedule_active'],
      conditions: ['temperature_above', 'mode_equals'],
      actions: ['set_temperature', 'set_mode', 'set_schedule']
    },
    intelligentMode: 'support schedules, eco presets, battery optimization for valves'
  },
  
  climate: {
    patterns: ['climate_', 'air_quality', 'temperature_sensor'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_co2', 'measure_pm25', 'measure_battery'],
    flowCards: {
      triggers: ['temp_above', 'temp_below', 'humidity_above', 'co2_above', 'pm25_above'],
      conditions: ['value_in_range', 'air_quality_good'],
      actions: ['reset_calibration']
    },
    intelligentMode: 'create averaged zone sensors, combine into multi-sensor virtuals'
  },
  
  smoke: {
    patterns: ['smoke_detector', 'gas_', 'siren'],
    capabilities: ['alarm_smoke', 'alarm_co', 'alarm_gas', 'alarm_tamper', 'measure_battery'],
    flowCards: {
      triggers: ['alarm_detected', 'alarm_cleared', 'test_mode'],
      conditions: ['is_alarming'],
      actions: ['silence_alarm', 'trigger_siren', 'send_emergency']
    },
    intelligentMode: 'fail-safe: immediate high-priority flows, emergency contacts'
  },
  
  water: {
    patterns: ['water_leak', 'water_valve', 'valve_smart'],
    capabilities: ['alarm_water', 'measure_battery', 'measure_temperature', 'onoff'],
    flowCards: {
      triggers: ['leak_detected', 'leak_cleared', 'valve_opened', 'valve_closed'],
      conditions: ['is_leaking', 'valve_is_open'],
      actions: ['close_valve', 'open_valve', 'send_emergency']
    },
    intelligentMode: 'auto-pair valve with leak sensor, create emergency shutoff flow'
  },
  
  locks: {
    patterns: ['lock_smart'],
    capabilities: ['locked', 'measure_battery', 'alarm_tamper'],
    flowCards: {
      triggers: ['locked', 'unlocked', 'wrong_code', 'tamper_detected'],
      conditions: ['is_locked', 'user_code_valid'],
      actions: ['lock', 'unlock', 'set_code', 'delete_code']
    },
    intelligentMode: 'secure actions require confirmation, audit logs for codes'
  },
  
  energy: {
    patterns: ['solar_panel', 'meter'],
    capabilities: ['meter_power', 'meter_energy', 'meter_voltage', 'meter_current'],
    flowCards: {
      triggers: ['power_spike', 'voltage_low', 'energy_threshold', 'phase_imbalance'],
      conditions: ['power_above', 'voltage_in_range'],
      actions: ['export_snapshot', 'reset_daily']
    },
    intelligentMode: 'aggregate per day/week, detect phase imbalance'
  },
  
  gateway: {
    patterns: ['gateway_', 'hub', 'bridge'],
    capabilities: ['onoff'],
    flowCards: {
      triggers: ['device_joined', 'device_left', 'ota_available'],
      conditions: ['pairing_active'],
      actions: ['start_pairing', 'restart_hub', 'update_firmware']
    },
    intelligentMode: 'expose per-child devices, manage bridge-level settings'
  }
};

function detectFamily(driverName) {
  for (const [family, config] of Object.entries(DEVICE_FAMILIES)) {
    for (const pattern of config.patterns) {
      if (driverName.includes(pattern)) {
        return { family, config };
      }
    }
  }
  return { family: 'generic', config: null };
}

function analyzeDriver(driverPath) {
  const driverName = path.basename(driverPath);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return { driverName, status: 'no_compose', family: null };
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const { family, config } = detectFamily(driverName);
  
  // Analyze current state
  const currentCapabilities = compose.capabilities || [];
  const hasFlowDir = fs.existsSync(path.join(__dirname, '..', '.homeycompose', 'flow'));
  
  const analysis = {
    driverName,
    family,
    currentCapabilities,
    recommendedCapabilities: config?.capabilities || [],
    missingCapabilities: [],
    flowCards: config?.flowCards || {},
    intelligentMode: config?.intelligentMode || 'standard',
    status: 'analyzed'
  };
  
  // Calculate missing capabilities
  if (config) {
    analysis.missingCapabilities = config.capabilities.filter(
      cap => !currentCapabilities.includes(cap) && !currentCapabilities.some(c => c.startsWith(cap + '.'))
    );
  }
  
  return analysis;
}

function generateFlowCardTemplate(driverName, family, cardType, cardId) {
  const templates = {
    triggers: {
      turned_on: {
        title: { en: 'Turned on', fr: 'Allumé' },
        hint: { en: 'When device is turned on', fr: 'Quand l\'appareil est allumé' }
      },
      turned_off: {
        title: { en: 'Turned off', fr: 'Éteint' },
        hint: { en: 'When device is turned off', fr: 'Quand l\'appareil est éteint' }
      },
      brightness_changed: {
        title: { en: 'Brightness changed', fr: 'Luminosité changée' },
        tokens: [{ name: 'brightness', type: 'number', title: { en: 'Brightness', fr: 'Luminosité' } }]
      },
      power_above: {
        title: { en: 'Power above threshold', fr: 'Puissance au-dessus du seuil' },
        tokens: [{ name: 'power', type: 'number', title: { en: 'Power (W)', fr: 'Puissance (W)' } }]
      },
      motion_detected: {
        title: { en: 'Motion detected', fr: 'Mouvement détecté' },
        hint: { en: 'When motion is detected', fr: 'Quand un mouvement est détecté' }
      },
      opened: {
        title: { en: 'Opened', fr: 'Ouvert' },
        hint: { en: 'When device is opened', fr: 'Quand l\'appareil est ouvert' }
      },
      closed: {
        title: { en: 'Closed', fr: 'Fermé' },
        hint: { en: 'When device is closed', fr: 'Quand l\'appareil est fermé' }
      }
    },
    conditions: {
      is_on: {
        title: { en: 'Is !{{on|off}}', fr: 'Est !{{allumé|éteint}}' },
        hint: { en: 'Check if device is on', fr: 'Vérifie si l\'appareil est allumé' }
      },
      brightness_above: {
        title: { en: 'Brightness is !{{above|below}}', fr: 'Luminosité est !{{au-dessus|en-dessous}}' },
        args: [{ type: 'range', name: 'level', min: 0, max: 100, step: 5, value: 50 }]
      },
      power_in_range: {
        title: { en: 'Power in range', fr: 'Puissance dans la plage' },
        args: [
          { type: 'number', name: 'min', placeholder: { en: 'Min (W)' } },
          { type: 'number', name: 'max', placeholder: { en: 'Max (W)' } }
        ]
      }
    },
    actions: {
      turn_on: {
        title: { en: 'Turn on', fr: 'Allumer' },
        hint: { en: 'Turn the device on', fr: 'Allume l\'appareil' }
      },
      turn_off: {
        title: { en: 'Turn off', fr: 'Éteindre' },
        hint: { en: 'Turn the device off', fr: 'Éteint l\'appareil' }
      },
      toggle: {
        title: { en: 'Toggle', fr: 'Basculer' },
        hint: { en: 'Toggle device state', fr: 'Bascule l\'état de l\'appareil' }
      },
      set_brightness: {
        title: { en: 'Set brightness', fr: 'Définir luminosité' },
        args: [{ type: 'range', name: 'brightness', min: 0, max: 100, step: 1, value: 50, label: { en: 'Brightness (%)' } }]
      },
      reset_meter: {
        title: { en: 'Reset energy meter', fr: 'Réinitialiser compteur' },
        hint: { en: 'Reset energy meter to zero', fr: 'Remet le compteur d\'énergie à zéro' }
      }
    }
  };
  
  const template = templates[cardType]?.[cardId] || {
    title: { en: cardId.replace(/_/g, ' '), fr: cardId.replace(/_/g, ' ') }
  };
  
  return {
    ...template,
    args: [
      { type: 'device', name: 'device', filter: `driver_id=${driverName}` },
      ...(template.args || [])
    ]
  };
}

function generateReport(analyses) {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 ENRICHISSEMENT ANALYSIS REPORT');
  console.log('='.repeat(80) + '\n');
  
  const byFamily = {};
  
  analyses.forEach(analysis => {
    if (!byFamily[analysis.family]) {
      byFamily[analysis.family] = [];
    }
    byFamily[analysis.family].push(analysis);
  });
  
  Object.entries(byFamily).forEach(([family, drivers]) => {
    console.log(`\n📦 ${family.toUpperCase()} (${drivers.length} drivers)`);
    console.log('-'.repeat(80));
    
    drivers.forEach(driver => {
      const missing = driver.missingCapabilities.length;
      const flowCount = Object.values(driver.flowCards).flat().length;
      
      console.log(`  ${driver.driverName}`);
      console.log(`    Capabilities: ${driver.currentCapabilities.length} current, ${missing} missing`);
      console.log(`    Flow cards: ${flowCount} recommended`);
      console.log(`    Mode: ${driver.intelligentMode}`);
    });
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL: ${analyses.length} drivers analyzed`);
  console.log('='.repeat(80) + '\n');
  
  // Export JSON
  const exportPath = path.join(__dirname, '..', 'driver-enrichment-analysis.json');
  fs.writeFileSync(exportPath, JSON.stringify({ 
    timestamp: new Date().toISOString(),
    totalDrivers: analyses.length,
    byFamily,
    details: analyses
  }, null, 2));
  
  console.log(`✅ Analysis exported to: driver-enrichment-analysis.json\n`);
}

// MAIN EXECUTION
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(d => {
    const stat = fs.statSync(path.join(DRIVERS_DIR, d));
    return stat.isDirectory() && !d.startsWith('.');
  })
  .map(d => path.join(DRIVERS_DIR, d));

console.log(`\n🚀 Analyzing ${drivers.length} drivers...\n`);

const analyses = drivers.map(analyzeDriver).filter(a => a.status === 'analyzed');

generateReport(analyses);

console.log('📋 Next steps:');
console.log('  1. Review driver-enrichment-analysis.json');
console.log('  2. Run: node scripts/apply-enrichment.js [family]');
console.log('  3. Build and validate\n');
