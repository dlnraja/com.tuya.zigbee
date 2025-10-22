#!/usr/bin/env node
/**
 * DRIVER ANALYSIS FOR INTELLIGENT MERGING
 * Analyse tous les drivers pour identifier opportunités de fusion
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, '..', 'drivers');

const driverCategories = {
  wireless_buttons: [],
  wall_switches: [],
  motion_sensors: [],
  contact_sensors: [],
  temperature_sensors: [],
  smoke_detectors: [],
  water_leak: [],
  locks: [],
  valves: [],
  curtains_blinds: [],
  smart_plugs: [],
  bulbs_lights: [],
  other: []
};

function categorizeDriver(driverName, config) {
  const name = driverName.toLowerCase();
  const capabilities = config.capabilities || [];
  
  // Wireless Buttons
  if (name.includes('wireless') && name.includes('button') || name.includes('switch') && name.includes('cr2032')) {
    const buttonCount = extractButtonCount(name, config);
    const battery = extractBatteryType(name, config);
    return {
      category: 'wireless_buttons',
      meta: { buttons: buttonCount, battery, capabilities }
    };
  }
  
  // Wall Switches
  if (name.includes('wall') || name.includes('touch') || name.includes('smart_switch')) {
    const gangCount = extractGangCount(name);
    const power = extractPowerType(name);
    return {
      category: 'wall_switches',
      meta: { gangs: gangCount, power, capabilities }
    };
  }
  
  // Motion Sensors
  if (name.includes('motion') || name.includes('pir') || name.includes('radar') || name.includes('presence')) {
    const features = extractSensorFeatures(capabilities);
    const battery = extractBatteryType(name, config);
    return {
      category: 'motion_sensors',
      meta: { features, battery, capabilities }
    };
  }
  
  // Contact Sensors
  if (name.includes('contact') || name.includes('door') || name.includes('window')) {
    const battery = extractBatteryType(name, config);
    return {
      category: 'contact_sensors',
      meta: { battery, capabilities }
    };
  }
  
  // Temperature Sensors
  if (name.includes('temperature') || name.includes('temp_humid') || name.includes('climate')) {
    const features = extractSensorFeatures(capabilities);
    const battery = extractBatteryType(name, config);
    return {
      category: 'temperature_sensors',
      meta: { features, battery, capabilities }
    };
  }
  
  // Smoke Detectors
  if (name.includes('smoke') || name.includes('gas') || name.includes('co')) {
    const battery = extractBatteryType(name, config);
    return {
      category: 'smoke_detectors',
      meta: { battery, capabilities }
    };
  }
  
  // Water Leak
  if (name.includes('water') || name.includes('leak')) {
    const battery = extractBatteryType(name, config);
    return {
      category: 'water_leak',
      meta: { battery, capabilities }
    };
  }
  
  // Locks
  if (name.includes('lock')) {
    const battery = extractBatteryType(name, config);
    return {
      category: 'locks',
      meta: { battery, capabilities }
    };
  }
  
  // Valves
  if (name.includes('valve')) {
    const power = extractPowerType(name);
    return {
      category: 'valves',
      meta: { power, capabilities }
    };
  }
  
  // Curtains/Blinds
  if (name.includes('curtain') || name.includes('blind') || name.includes('roller') || name.includes('shutter')) {
    const power = extractPowerType(name);
    return {
      category: 'curtains_blinds',
      meta: { power, capabilities }
    };
  }
  
  // Smart Plugs
  if (name.includes('plug') || name.includes('socket')) {
    return {
      category: 'smart_plugs',
      meta: { capabilities }
    };
  }
  
  // Bulbs/Lights
  if (name.includes('bulb') || name.includes('light') || name.includes('led')) {
    const features = extractLightFeatures(capabilities, name);
    return {
      category: 'bulbs_lights',
      meta: { features, capabilities }
    };
  }
  
  return {
    category: 'other',
    meta: { capabilities }
  };
}

function extractButtonCount(name, config) {
  const match = name.match(/(\d+)(button|gang)/);
  if (match) return parseInt(match[1]);
  
  // Check capabilities
  const buttonCaps = (config.capabilities || []).filter(c => c.startsWith('button.')).length;
  if (buttonCaps > 0) return buttonCaps;
  
  return 1;
}

function extractGangCount(name) {
  const match = name.match(/(\d+)gang/);
  return match ? parseInt(match[1]) : 1;
}

function extractBatteryType(name, config) {
  if (name.includes('cr2032')) return 'CR2032';
  if (name.includes('cr2450')) return 'CR2450';
  if (name.includes('cr123a')) return 'CR123A';
  if (name.includes('aaa')) return 'AAA';
  if (name.includes('aa')) return 'AA';
  
  // Check energy config
  if (config.energy?.batteries) {
    return config.energy.batteries[0];
  }
  
  return 'unknown';
}

function extractPowerType(name) {
  if (name.includes('_ac')) return 'AC';
  if (name.includes('_dc')) return 'DC';
  if (name.includes('hybrid')) return 'HYBRID';
  if (name.includes('internal')) return 'INTERNAL';
  if (name.includes('battery') || name.includes('cr2032') || name.includes('aaa')) return 'BATTERY';
  return 'AC'; // default
}

function extractSensorFeatures(capabilities) {
  const features = [];
  if (capabilities.includes('measure_temperature')) features.push('temp');
  if (capabilities.includes('measure_humidity')) features.push('humidity');
  if (capabilities.includes('measure_luminance')) features.push('illuminance');
  if (capabilities.includes('alarm_motion')) features.push('motion');
  return features;
}

function extractLightFeatures(capabilities, name) {
  const features = [];
  if (name.includes('rgb')) features.push('rgb');
  if (name.includes('color')) features.push('color');
  if (name.includes('white')) features.push('white');
  if (capabilities.includes('dim')) features.push('dimmable');
  if (capabilities.includes('light_temperature')) features.push('temperature');
  return features;
}

function analyzeDrivers() {
  console.log('🔍 Analyse des drivers pour fusion intelligente...\n');
  
  const drivers = fs.readdirSync(DRIVERS_PATH);
  const stats = {};
  
  drivers.forEach(driverName => {
    const driverPath = path.join(DRIVERS_PATH, driverName);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return;
    
    try {
      const config = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const result = categorizeDriver(driverName, config);
      
      driverCategories[result.category].push({
        name: driverName,
        ...result.meta
      });
      
      stats[result.category] = (stats[result.category] || 0) + 1;
      
    } catch (err) {
      console.error(`❌ Erreur: ${driverName} - ${err.message}`);
    }
  });
  
  return stats;
}

function generateMergeReport() {
  const stats = analyzeDrivers();
  
  console.log('═══════════════════════════════════════════════════');
  console.log('  ANALYSE DES CATÉGORIES');
  console.log('═══════════════════════════════════════════════════\n');
  
  Object.entries(stats).forEach(([category, count]) => {
    console.log(`📦 ${category.toUpperCase().replace(/_/g, ' ')}: ${count} drivers`);
  });
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  OPPORTUNITÉS DE FUSION');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Wireless Buttons Analysis
  if (driverCategories.wireless_buttons.length > 0) {
    console.log('🔘 WIRELESS BUTTONS:');
    const grouped = groupBy(driverCategories.wireless_buttons, 'buttons');
    Object.entries(grouped).forEach(([buttons, drivers]) => {
      console.log(`  ${buttons} button(s): ${drivers.length} drivers`);
      const batteries = [...new Set(drivers.map(d => d.battery))];
      console.log(`    Batteries: ${batteries.join(', ')}`);
    });
    console.log(`  💡 Suggestion: Fusionner en 8 drivers (1-8 buttons) avec auto-détection batterie\n`);
  }
  
  // Wall Switches Analysis
  if (driverCategories.wall_switches.length > 0) {
    console.log('🔌 WALL SWITCHES:');
    const grouped = groupBy(driverCategories.wall_switches, 'gangs');
    Object.entries(grouped).forEach(([gangs, drivers]) => {
      console.log(`  ${gangs} gang(s): ${drivers.length} drivers`);
      const powers = [...new Set(drivers.map(d => d.power))];
      console.log(`    Power: ${powers.join(', ')}`);
    });
    console.log(`  💡 Suggestion: Fusionner en 6 drivers (1-6 gangs) HYBRID (AC/DC/Battery auto-detect)\n`);
  }
  
  // Motion Sensors Analysis
  if (driverCategories.motion_sensors.length > 0) {
    console.log('🚶 MOTION SENSORS:');
    const featureSets = driverCategories.motion_sensors.map(d => d.features.sort().join('+')).filter((v, i, a) => a.indexOf(v) === i);
    console.log(`  ${driverCategories.motion_sensors.length} drivers`);
    console.log(`  Feature combinations: ${featureSets.length}`);
    featureSets.forEach(fs => {
      const count = driverCategories.motion_sensors.filter(d => d.features.sort().join('+') === fs).length;
      console.log(`    ${fs || 'motion-only'}: ${count} drivers`);
    });
    console.log(`  💡 Suggestion: Fusionner en 3-4 drivers par feature set\n`);
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('  RÉSUMÉ');
  console.log('═══════════════════════════════════════════════════\n');
  
  const totalDrivers = Object.values(stats).reduce((a, b) => a + b, 0);
  const estimatedAfterMerge = Math.ceil(totalDrivers * 0.35); // ~65% reduction
  
  console.log(`  Drivers actuels: ${totalDrivers}`);
  console.log(`  Drivers après fusion: ~${estimatedAfterMerge}`);
  console.log(`  Réduction: ~${Math.round((1 - estimatedAfterMerge/totalDrivers) * 100)}%\n`);
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    categories: driverCategories,
    totalDrivers,
    estimatedAfterMerge
  };
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'driver_merge_analysis.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('✅ Rapport détaillé sauvegardé: driver_merge_analysis.json\n');
}

function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

// Exécution
generateMergeReport();
