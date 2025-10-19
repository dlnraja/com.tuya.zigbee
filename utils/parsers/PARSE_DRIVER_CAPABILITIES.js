#!/usr/bin/env node

/**
 * 🔍 PARSE DRIVER CAPABILITIES
 * Parse et analyse toutes les capabilities utilisées
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Capabilities connues Homey
const STANDARD_CAPABILITIES = [
  'onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation', 'light_mode',
  'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_power',
  'measure_voltage', 'measure_current', 'measure_battery', 'measure_co', 'measure_co2',
  'measure_pm25', 'meter_power', 'alarm_motion', 'alarm_contact', 'alarm_water',
  'alarm_smoke', 'alarm_battery', 'alarm_generic', 'windowcoverings_state',
  'windowcoverings_set', 'target_temperature', 'thermostat_mode', 'locked'
];

function parseDriverCapabilities(driverName) {
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return { driver: driverName, error: 'No driver.compose.json' };
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    const capabilities = compose.capabilities || [];
    
    const result = {
      driver: driverName,
      class: compose.class,
      capabilities: capabilities,
      count: capabilities.length,
      standard: [],
      custom: []
    };
    
    capabilities.forEach(cap => {
      if (STANDARD_CAPABILITIES.includes(cap)) {
        result.standard.push(cap);
      } else {
        result.custom.push(cap);
      }
    });
    
    return result;
    
  } catch (error) {
    return { driver: driverName, error: error.message };
  }
}

async function main() {
  console.log('\n🔍 PARSE DRIVER CAPABILITIES\n');
  console.log('='.repeat(70) + '\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  
  console.log(`📁 ${drivers.length} drivers à analyser\n`);
  
  const results = drivers.map(parseDriverCapabilities);
  const valid = results.filter(r => !r.error);
  
  // Statistiques globales
  const allCapabilities = new Set();
  const capabilityCount = {};
  const byClass = {};
  
  valid.forEach(r => {
    r.capabilities.forEach(cap => {
      allCapabilities.add(cap);
      capabilityCount[cap] = (capabilityCount[cap] || 0) + 1;
    });
    
    if (!byClass[r.class]) {
      byClass[r.class] = { count: 0, capabilities: new Set() };
    }
    byClass[r.class].count++;
    r.capabilities.forEach(cap => byClass[r.class].capabilities.add(cap));
  });
  
  console.log('📊 STATISTIQUES GLOBALES:\n');
  console.log(`✅ Drivers analysés: ${valid.length}`);
  console.log(`🎯 Capabilities uniques: ${allCapabilities.size}`);
  console.log(`📊 Classes: ${Object.keys(byClass).length}`);
  
  console.log('\n🏆 TOP 10 CAPABILITIES:\n');
  Object.entries(capabilityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([cap, count], i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${cap.padEnd(30)}: ${count} drivers`);
    });
  
  console.log('\n📊 PAR CLASSE:\n');
  Object.entries(byClass)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([cls, data]) => {
      console.log(`${cls.padEnd(15)}: ${data.count.toString().padStart(3)} drivers, ${data.capabilities.size} capabilities`);
    });
  
  const outputFile = path.join(ROOT, 'reports', 'driver_capabilities.json');
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify({
    results,
    stats: {
      total: valid.length,
      uniqueCapabilities: Array.from(allCapabilities),
      capabilityCount,
      byClass: Object.fromEntries(
        Object.entries(byClass).map(([k, v]) => [k, { count: v.count, capabilities: Array.from(v.capabilities) }])
      )
    }
  }, null, 2));
  
  console.log(`\n💾 Rapport: ${outputFile}\n`);
}

main().catch(console.error);
