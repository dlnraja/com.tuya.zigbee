#!/usr/bin/env node

/**
 * DEEP SEARCH AND ENRICHMENT
 * Recherche de nouveaux devices et enrichissement complet
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔍 DEEP SEARCH & ENRICHMENT ANALYSIS\n');
console.log('='.repeat(70) + '\n');

// Analyze existing drivers
const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory();
});

const analysis = {
  total: drivers.length,
  byCategory: {},
  byPowerType: {},
  byGangs: {},
  missing: {
    readme: [],
    device_js: [],
    driver_js: [],
    pair_folder: [],
    images: []
  },
  recommendations: []
};

console.log('📊 ANALYZING EXISTING DRIVERS\n');

drivers.forEach(driver => {
  const driverPath = path.join(DRIVERS_DIR, driver);
  const manifestPath = path.join(driverPath, 'driver.compose.json');
  
  // Check manifest
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Category
      const cat = manifest.class || 'unknown';
      analysis.byCategory[cat] = (analysis.byCategory[cat] || 0) + 1;
      
      // Power type
      const lower = driver.toLowerCase();
      if (lower.includes('_ac')) analysis.byPowerType.ac = (analysis.byPowerType.ac || 0) + 1;
      else if (lower.includes('_battery')) analysis.byPowerType.battery = (analysis.byPowerType.battery || 0) + 1;
      else if (lower.includes('_hybrid')) analysis.byPowerType.hybrid = (analysis.byPowerType.hybrid || 0) + 1;
      else if (lower.includes('cr2032') || lower.includes('cr2450')) analysis.byPowerType.battery = (analysis.byPowerType.battery || 0) + 1;
      else if (lower.includes('_dc')) analysis.byPowerType.dc = (analysis.byPowerType.dc || 0) + 1;
      else analysis.byPowerType.unknown = (analysis.byPowerType.unknown || 0) + 1;
      
      // Gangs
      const gangMatch = driver.match(/(\d+)gang/i);
      if (gangMatch) {
        const gangs = gangMatch[1];
        analysis.byGangs[gangs] = (analysis.byGangs[gangs] || 0) + 1;
      }
      
    } catch (err) {
      console.log(`⚠️  ${driver}: Error reading manifest`);
    }
  }
  
  // Check missing files
  if (!fs.existsSync(path.join(driverPath, 'README.md'))) {
    analysis.missing.readme.push(driver);
  }
  
  if (!fs.existsSync(path.join(driverPath, 'device.js'))) {
    analysis.missing.device_js.push(driver);
  }
  
  if (!fs.existsSync(path.join(driverPath, 'driver.js'))) {
    analysis.missing.driver_js.push(driver);
  }
  
  if (!fs.existsSync(path.join(driverPath, 'pair'))) {
    analysis.missing.pair_folder.push(driver);
  }
  
  const assetsPath = path.join(driverPath, 'assets');
  if (!fs.existsSync(path.join(assetsPath, 'small.png')) || 
      !fs.existsSync(path.join(assetsPath, 'large.png'))) {
    analysis.missing.images.push(driver);
  }
});

console.log(`✅ Total drivers analyzed: ${analysis.total}\n`);

// Categories
console.log('📊 CATEGORIES DISTRIBUTION\n');
Object.entries(analysis.byCategory)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });

console.log('\n🔋 POWER TYPES DISTRIBUTION\n');
Object.entries(analysis.byPowerType)
  .forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

console.log('\n🔢 MULTI-GANG DISTRIBUTION\n');
Object.entries(analysis.byGangs)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .forEach(([gangs, count]) => {
    console.log(`   ${gangs}-gang: ${count} drivers`);
  });

// Missing files
console.log('\n⚠️  MISSING FILES ANALYSIS\n');
if (analysis.missing.readme.length > 0) {
  console.log(`📄 READMEs missing: ${analysis.missing.readme.length} drivers`);
}
if (analysis.missing.device_js.length > 0) {
  console.log(`🔌 device.js missing: ${analysis.missing.device_js.length} drivers`);
}
if (analysis.missing.driver_js.length > 0) {
  console.log(`🚗 driver.js missing: ${analysis.missing.driver_js.length} drivers`);
}
if (analysis.missing.pair_folder.length > 0) {
  console.log(`👥 pair/ missing: ${analysis.missing.pair_folder.length} drivers`);
}
if (analysis.missing.images.length > 0) {
  console.log(`🖼️  Images missing: ${analysis.missing.images.length} drivers`);
}

// RECOMMENDATIONS
console.log('\n\n💡 RECOMMENDATIONS FOR NEW DRIVERS\n');
console.log('='.repeat(70) + '\n');

const recommendations = [
  {
    category: 'Switches',
    suggestions: [
      'Smart Switch 7-Gang AC (rare but exists)',
      'Smart Switch 8-Gang AC (for large panels)',
      'Touch Switch with Scene Control',
      'Smart Switch with USB ports',
      'Switch with Power Monitoring'
    ]
  },
  {
    category: 'Sensors',
    suggestions: [
      'mmWave Radar Sensor (presence detection)',
      'Smart Meter (electricity monitoring)',
      'Soil Moisture Sensor',
      'Light Intensity Sensor (Lux)',
      'PM2.5 Air Quality Sensor',
      'Formaldehyde Sensor'
    ]
  },
  {
    category: 'Lights',
    suggestions: [
      'Smart Ceiling Light with Scene Modes',
      'Under-Cabinet LED Strip',
      'Smart Spotlight',
      'RGB LED Controller'
    ]
  },
  {
    category: 'Climate',
    suggestions: [
      'Smart Radiator Valve TRV',
      'Smart Fan Controller',
      'Dehumidifier Controller',
      'Air Purifier Smart'
    ]
  },
  {
    category: 'Security',
    suggestions: [
      'Smart Doorbell',
      'Glass Break Sensor',
      'Water Flow Meter',
      'Gas Leak Detector'
    ]
  },
  {
    category: 'Automation',
    suggestions: [
      'Scene Switch 6-button',
      'Rotary Dimmer Knob',
      'Smart IR Remote',
      'Smart Timer Socket'
    ]
  },
  {
    category: 'Curtains & Blinds',
    suggestions: [
      'Roller Shade Motor',
      'Venetian Blind Controller',
      'Smart Curtain Track'
    ]
  }
];

recommendations.forEach(rec => {
  console.log(`\n🔹 ${rec.category}:`);
  rec.suggestions.forEach(sugg => {
    console.log(`   • ${sugg}`);
  });
});

// DEVICE CODES FOUND
console.log('\n\n📋 COMMON TUYA DEVICE CODES TO SEARCH\n');
console.log('='.repeat(70) + '\n');

const tuyaCodes = [
  'TS0001 - 1 Gang Switch',
  'TS0002 - 2 Gang Switch',
  'TS0003 - 3 Gang Switch',
  'TS0004 - 4 Gang Switch',
  'TS0011 - Single Switch Module',
  'TS0012 - 2 Channel Module',
  'TS0013 - 3 Channel Module',
  'TS0014 - 4 Channel Module',
  'TS0041 - 1 Button Scene',
  'TS0042 - 2 Button Scene',
  'TS0043 - 3 Button Scene',
  'TS0044 - 4 Button Scene',
  'TS0121 - Smart Plug with Metering',
  'TS0202 - Motion Sensor',
  'TS0203 - Door/Window Sensor',
  'TS0204 - Gas Sensor',
  'TS0205 - Water Leak Sensor',
  'TS0207 - Water Leak Detector',
  'TS0215 - SOS Button',
  'TS0216 - Siren Alarm',
  'TS0218 - Button',
  'TS0601 - Multi-sensor Gateway',
  'TS0502 - Dimmable Light',
  'TS0503 - RGB Light',
  'TS0504 - RGBW Light',
  'TS0505 - RGBCCT Light',
  'TS110E - Dimmer Module',
  'TS110F - Dimmer Switch',
  'TS130F - Curtain Motor'
];

tuyaCodes.forEach(code => {
  console.log(`   ${code}`);
});

// Save report
const report = {
  timestamp: new Date().toISOString(),
  analysis,
  recommendations: recommendations.map(r => r.suggestions).flat(),
  tuyaCodes
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'DEEP_SEARCH_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n\n' + '='.repeat(70));
console.log('\n✅ ANALYSIS COMPLETE!\n');
console.log('📝 Report saved to reports/DEEP_SEARCH_REPORT.json\n');
console.log('🎯 Next: Research these device codes on Zigbee2MQTT and Tuya IoT\n');
