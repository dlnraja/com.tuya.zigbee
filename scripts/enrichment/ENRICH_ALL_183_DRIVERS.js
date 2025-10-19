#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * MEGA ENRICHMENT - ALL 183 DRIVERS
 * Applies SDK3 templates to every single driver
 */

const TEMPLATES = {
  // SENSOR TEMPLATES
  sensor_motion: {
    settings: [
      { id: 'motion_timeout', type: 'number', label: { en: 'Motion Auto-Reset Timeout', fr: 'Délai de Réinitialisation Mouvement' }, units: 's', value: 60, min: 5, max: 600 },
      { id: 'enable_motion_logging', type: 'checkbox', label: { en: 'Enable Motion Event Logging', fr: 'Activer Journalisation Mouvement' }, value: false }
    ]
  },
  sensor_contact: {
    settings: [
      { id: 'enable_contact_logging', type: 'checkbox', label: { en: 'Enable Contact Event Logging', fr: 'Activer Journalisation Contact' }, value: false }
    ]
  },
  sensor_temperature: {
    settings: [
      { id: 'temperature_calibration', type: 'number', label: { en: 'Temperature Calibration', fr: 'Calibration Température' }, units: '°C', value: 0, min: -9, max: 9 },
      { id: 'temperature_threshold', type: 'number', label: { en: 'Temperature Alert Threshold', fr: 'Seuil Alerte Température' }, units: '°C', value: 25, min: 0, max: 50 }
    ]
  },
  sensor_humidity: {
    settings: [
      { id: 'humidity_threshold', type: 'number', label: { en: 'Humidity Alert Threshold', fr: 'Seuil Alerte Humidité' }, units: '%', value: 70, min: 0, max: 100 }
    ]
  },
  sensor_co2: {
    settings: [
      { id: 'co2_warning_threshold', type: 'number', label: { en: 'CO₂ Warning Threshold', fr: 'Seuil Avertissement CO₂' }, units: 'ppm', value: 1000, min: 400, max: 2000 },
      { id: 'co2_critical_threshold', type: 'number', label: { en: 'CO₂ Critical Threshold', fr: 'Seuil Critique CO₂' }, units: 'ppm', value: 2000, min: 1000, max: 5000 }
    ]
  },
  sensor_battery: {
    settings: [
      { id: 'battery_low_threshold', type: 'number', label: { en: 'Low Battery Threshold', fr: 'Seuil Batterie Faible' }, units: '%', value: 20, min: 5, max: 50 },
      { id: 'battery_notification', type: 'checkbox', label: { en: 'Enable Battery Notifications', fr: 'Activer Notifications Batterie' }, value: true }
    ]
  },
  
  // LIGHT TEMPLATES
  light_basic: {
    settings: [
      { id: 'power_on_behavior', type: 'dropdown', label: { en: 'Power-On Behavior', fr: 'Comportement Allumage' }, value: 'last_state', values: [
        { id: 'last_state', label: { en: 'Last State', fr: 'Dernier État' } },
        { id: 'on', label: { en: 'Always On', fr: 'Toujours Allumé' } },
        { id: 'off', label: { en: 'Always Off', fr: 'Toujours Éteint' } }
      ]},
      { id: 'default_brightness', type: 'number', label: { en: 'Default Brightness', fr: 'Luminosité par Défaut' }, units: '%', value: 100, min: 1, max: 100 }
    ]
  },
  light_color: {
    settings: [
      { id: 'transition_time', type: 'number', label: { en: 'Color Transition Time', fr: 'Temps Transition Couleur' }, units: 'ms', value: 500, min: 0, max: 5000 }
    ]
  },
  light_dimmer: {
    settings: [
      { id: 'min_brightness', type: 'number', label: { en: 'Minimum Brightness', fr: 'Luminosité Minimale' }, units: '%', value: 1, min: 1, max: 50 },
      { id: 'fade_time', type: 'number', label: { en: 'Fade Time', fr: 'Temps Fondu' }, units: 'ms', value: 500, min: 0, max: 3000 }
    ]
  },
  
  // SWITCH TEMPLATES
  switch_basic: {
    settings: [
      { id: 'switch_mode', type: 'dropdown', label: { en: 'Switch Mode', fr: 'Mode Interrupteur' }, value: 'toggle', values: [
        { id: 'toggle', label: { en: 'Toggle', fr: 'Bascule' } },
        { id: 'momentary', label: { en: 'Momentary', fr: 'Momentané' } }
      ]},
      { id: 'power_on_state', type: 'dropdown', label: { en: 'Power-On State', fr: 'État Allumage' }, value: 'last', values: [
        { id: 'last', label: { en: 'Last State', fr: 'Dernier État' } },
        { id: 'on', label: { en: 'On', fr: 'Allumé' } },
        { id: 'off', label: { en: 'Off', fr: 'Éteint' } }
      ]}
    ]
  },
  switch_wireless: {
    settings: [
      { id: 'enable_double_press', type: 'checkbox', label: { en: 'Enable Double-Press Detection', fr: 'Activer Détection Double-Pression' }, value: false },
      { id: 'double_press_timeout', type: 'number', label: { en: 'Double-Press Window', fr: 'Fenêtre Double-Pression' }, units: 'ms', value: 500, min: 200, max: 2000 },
      { id: 'enable_long_press', type: 'checkbox', label: { en: 'Enable Long-Press Detection', fr: 'Activer Détection Pression Longue' }, value: false },
      { id: 'long_press_duration', type: 'number', label: { en: 'Long-Press Duration', fr: 'Durée Pression Longue' }, units: 'ms', value: 1000, min: 500, max: 3000 }
    ]
  },
  
  // PLUG TEMPLATES
  plug_basic: {
    settings: [
      { id: 'power_on_state', type: 'dropdown', label: { en: 'Power-On State', fr: 'État Allumage' }, value: 'last', values: [
        { id: 'last', label: { en: 'Last State', fr: 'Dernier État' } },
        { id: 'on', label: { en: 'On', fr: 'Allumé' } },
        { id: 'off', label: { en: 'Off', fr: 'Éteint' } }
      ]},
      { id: 'enable_led', type: 'checkbox', label: { en: 'Enable LED Indicator', fr: 'Activer Indicateur LED' }, value: true }
    ]
  },
  plug_energy: {
    settings: [
      { id: 'power_threshold', type: 'number', label: { en: 'Power Alert Threshold', fr: 'Seuil Alerte Puissance' }, units: 'W', value: 2000, min: 1, max: 5000 },
      { id: 'overload_protection', type: 'checkbox', label: { en: 'Enable Overload Protection', fr: 'Activer Protection Surcharge' }, value: true },
      { id: 'overload_limit', type: 'number', label: { en: 'Overload Limit', fr: 'Limite Surcharge' }, units: 'W', value: 2500, min: 1, max: 5000 }
    ]
  },
  
  // CLIMATE TEMPLATES
  climate_thermostat: {
    settings: [
      { id: 'temperature_offset', type: 'number', label: { en: 'Temperature Offset', fr: 'Décalage Température' }, units: '°C', value: 0, min: -5, max: 5 },
      { id: 'min_setpoint', type: 'number', label: { en: 'Minimum Setpoint', fr: 'Consigne Minimale' }, units: '°C', value: 5, min: 5, max: 25 },
      { id: 'max_setpoint', type: 'number', label: { en: 'Maximum Setpoint', fr: 'Consigne Maximale' }, units: '°C', value: 35, min: 15, max: 35 }
    ]
  },
  climate_fan: {
    settings: [
      { id: 'fan_speed_default', type: 'dropdown', label: { en: 'Default Fan Speed', fr: 'Vitesse Ventilateur par Défaut' }, value: 'medium', values: [
        { id: 'low', label: { en: 'Low', fr: 'Basse' } },
        { id: 'medium', label: { en: 'Medium', fr: 'Moyenne' } },
        { id: 'high', label: { en: 'High', fr: 'Haute' } }
      ]}
    ]
  },
  
  // SECURITY TEMPLATES
  security_lock: {
    settings: [
      { id: 'auto_lock_timeout', type: 'number', label: { en: 'Auto-Lock Timeout', fr: 'Délai Verrouillage Auto' }, units: 's', value: 30, min: 0, max: 300 },
      { id: 'enable_lock_notifications', type: 'checkbox', label: { en: 'Enable Lock Notifications', fr: 'Activer Notifications Verrouillage' }, value: true }
    ]
  },
  security_alarm: {
    settings: [
      { id: 'alarm_duration', type: 'number', label: { en: 'Alarm Duration', fr: 'Durée Alarme' }, units: 's', value: 60, min: 10, max: 300 },
      { id: 'alarm_volume', type: 'dropdown', label: { en: 'Alarm Volume', fr: 'Volume Alarme' }, value: 'high', values: [
        { id: 'low', label: { en: 'Low', fr: 'Bas' } },
        { id: 'medium', label: { en: 'Medium', fr: 'Moyen' } },
        { id: 'high', label: { en: 'High', fr: 'Élevé' } }
      ]}
    ]
  },
  
  // CURTAIN TEMPLATES
  curtain_motor: {
    settings: [
      { id: 'reverse_direction', type: 'checkbox', label: { en: 'Reverse Direction', fr: 'Inverser Direction' }, value: false },
      { id: 'calibration_mode', type: 'checkbox', label: { en: 'Calibration Mode', fr: 'Mode Calibration' }, value: false }
    ]
  }
};

function determineTemplates(driver) {
  const templates = [];
  const caps = driver.capabilities || [];
  const nameLower = driver.name.toLowerCase();
  
  // SENSORS
  if (caps.includes('alarm_motion') || nameLower.includes('motion') || nameLower.includes('pir')) {
    templates.push('sensor_motion');
  }
  if (caps.includes('alarm_contact') || nameLower.includes('contact') || nameLower.includes('door') || nameLower.includes('window')) {
    templates.push('sensor_contact');
  }
  if (caps.includes('measure_temperature') || nameLower.includes('temp')) {
    templates.push('sensor_temperature');
  }
  if (caps.includes('measure_humidity') || nameLower.includes('humid')) {
    templates.push('sensor_humidity');
  }
  if (caps.includes('measure_co2') || nameLower.includes('co2')) {
    templates.push('sensor_co2');
  }
  if (driver.energy?.batteries) {
    templates.push('sensor_battery');
  }
  
  // LIGHTS
  if ((caps.includes('onoff') || caps.includes('dim')) && (driver.class === 'light' || nameLower.includes('bulb') || nameLower.includes('light') || nameLower.includes('led'))) {
    templates.push('light_basic');
    if (caps.includes('light_hue') || nameLower.includes('rgb') || nameLower.includes('color')) {
      templates.push('light_color');
    }
    if (caps.includes('dim') || nameLower.includes('dimmer')) {
      templates.push('light_dimmer');
    }
  }
  
  // SWITCHES
  if (driver.category === 'SWITCHES' || nameLower.includes('switch') || nameLower.includes('button')) {
    if (nameLower.includes('wireless') || nameLower.includes('scene') || nameLower.includes('remote') || nameLower.includes('sos')) {
      templates.push('switch_wireless');
    } else {
      templates.push('switch_basic');
    }
  }
  
  // PLUGS
  if (driver.category === 'PLUGS' || nameLower.includes('plug') || nameLower.includes('socket')) {
    templates.push('plug_basic');
    if (caps.includes('measure_power') || nameLower.includes('energy') || nameLower.includes('monitoring')) {
      templates.push('plug_energy');
    }
  }
  
  // CLIMATE
  if (driver.category === 'CLIMATE' || nameLower.includes('thermostat') || nameLower.includes('hvac') || nameLower.includes('radiator')) {
    templates.push('climate_thermostat');
  }
  if (nameLower.includes('fan') || nameLower.includes('ventilat')) {
    templates.push('climate_fan');
  }
  
  // SECURITY
  if (nameLower.includes('lock')) {
    templates.push('security_lock');
  }
  if (nameLower.includes('alarm') || nameLower.includes('siren')) {
    templates.push('security_alarm');
  }
  
  // CURTAINS
  if (driver.category === 'CURTAINS' || nameLower.includes('curtain') || nameLower.includes('blind') || nameLower.includes('shade')) {
    templates.push('curtain_motor');
  }
  
  return templates;
}

function generateSettings(templates) {
  const settings = [];
  
  templates.forEach(templateName => {
    const template = TEMPLATES[templateName];
    if (template && template.settings) {
      settings.push(...template.settings);
    }
  });
  
  if (settings.length === 0) return [];
  
  // Group settings
  return [{
    type: 'group',
    label: { 
      en: 'SDK3 Advanced Settings', 
      fr: 'Paramètres Avancés SDK3' 
    },
    children: settings
  }];
}

async function enrichDriver(driverPath, driver) {
  const templates = determineTemplates(driver);
  
  if (templates.length === 0) {
    return { skipped: true, reason: 'No applicable templates' };
  }
  
  try {
    // Read driver.compose.json
    const composePath = path.join(driverPath, 'driver.compose.json');
    const composeData = await fs.readFile(composePath, 'utf8');
    let compose = JSON.parse(composeData);
    
    // Check if already enriched
    const hasSDK3Settings = compose.settings?.some(s => 
      s.type === 'group' && s.label?.en === 'SDK3 Advanced Settings'
    );
    
    if (hasSDK3Settings) {
      return { skipped: true, reason: 'Already enriched' };
    }
    
    // Generate and add settings
    const newSettings = generateSettings(templates);
    
    if (!compose.settings) {
      compose.settings = [];
    }
    
    compose.settings.push(...newSettings);
    
    // Write back
    await fs.writeFile(composePath, JSON.stringify(compose, null, 2));
    
    return {
      success: true,
      driver: driver.name,
      templates: templates,
      settings_added: newSettings[0]?.children?.length || 0
    };
    
  } catch (err) {
    return { 
      error: true, 
      driver: driver.name, 
      message: err.message 
    };
  }
}

async function main() {
  console.log('🚀 MEGA ENRICHMENT - ALL 183 DRIVERS\n');
  console.log('Loading analysis data...\n');
  
  // Load detailed analysis
  const analysisPath = path.join(__dirname, '../../reports/SDK3_DRIVERS_DETAILED.json');
  const analysisData = await fs.readFile(analysisPath, 'utf8');
  const allDrivers = JSON.parse(analysisData);
  
  console.log(`📊 Total drivers: ${allDrivers.length}\n`);
  console.log('Starting batch enrichment...\n');
  
  const results = {
    success: [],
    skipped: [],
    errors: []
  };
  
  const driversDir = path.join(__dirname, '../..', 'drivers');
  
  let processed = 0;
  for (const driver of allDrivers) {
    processed++;
    const driverPath = path.join(driversDir, driver.name);
    
    process.stdout.write(`\r[${processed}/${allDrivers.length}] Processing ${driver.name}...`);
    
    const result = await enrichDriver(driverPath, driver);
    
    if (result.success) {
      results.success.push(result);
    } else if (result.skipped) {
      results.skipped.push({ driver: driver.name, reason: result.reason });
    } else if (result.error) {
      results.errors.push(result);
    }
  }
  
  console.log('\n\n✅ MEGA ENRICHMENT COMPLETE!\n');
  console.log(`Success: ${results.success.length} drivers enriched`);
  console.log(`Skipped: ${results.skipped.length} drivers`);
  console.log(`Errors: ${results.errors.length} drivers\n`);
  
  // Breakdown
  console.log('📊 ENRICHMENT BREAKDOWN:\n');
  const templateStats = {};
  results.success.forEach(r => {
    r.templates.forEach(t => {
      templateStats[t] = (templateStats[t] || 0) + 1;
    });
  });
  
  console.log('Templates applied:');
  Object.entries(templateStats).sort((a, b) => b[1] - a[1]).forEach(([template, count]) => {
    console.log(`  ${template}: ${count} drivers`);
  });
  
  // Total settings
  const totalSettings = results.success.reduce((sum, r) => sum + r.settings_added, 0);
  console.log(`\nTotal settings added: ${totalSettings}`);
  
  // Save results
  const resultsPath = path.join(__dirname, '../../reports/MEGA_ENRICHMENT_ALL_183.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  
  console.log(`\n📄 Results saved to: ${resultsPath}`);
  
  // Show errors if any
  if (results.errors.length > 0) {
    console.log('\n⚠️  ERRORS:');
    results.errors.forEach(e => {
      console.log(`  ${e.driver}: ${e.message}`);
    });
  }
}

main().catch(console.error);
