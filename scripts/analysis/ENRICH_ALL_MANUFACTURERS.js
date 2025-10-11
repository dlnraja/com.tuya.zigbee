#!/usr/bin/env node

/**
 * ENRICH ALL MANUFACTURERS
 * Analyse tous les drivers et enrichit les manufacturerNames manquants
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔍 ENRICHING ALL MANUFACTURERS\n');
console.log('='.repeat(70) + '\n');

// Base de données des manufacturerNames connus par type de device
const knownManufacturers = {
  // Switches
  '_TZ3000_': ['switch', 'gang', 'relay', 'dimmer'],
  '_TZE200_': ['sensor', 'detector', 'monitor', 'radar'],
  '_TZ3400_': ['curtain', 'blind', 'shade', 'motor'],
  '_TYZB01_': ['button', 'scene', 'remote'],
  
  // Sensors communs
  '_TZE284_': ['sensor', 'humidity', 'temperature'],
  'TS0201': ['temperature', 'humidity', 'sensor'],
  'TS0202': ['motion', 'pir'],
  'TS0203': ['door', 'window', 'contact'],
  'TS0204': ['gas', 'detector'],
  'TS0205': ['water', 'leak'],
  'TS0207': ['leak', 'water'],
  'TS0210': ['vibration'],
  'TS0215': ['sos', 'button'],
  'TS0216': ['siren', 'alarm'],
  'TS0218': ['button'],
  
  // Switches
  'TS0001': ['switch', '1gang'],
  'TS0002': ['switch', '2gang'],
  'TS0003': ['switch', '3gang'],
  'TS0004': ['switch', '4gang'],
  'TS0011': ['module', '1gang'],
  'TS0012': ['module', '2gang'],
  'TS0013': ['module', '3gang'],
  'TS0014': ['module', '4gang'],
  
  // Scene buttons
  'TS0041': ['button', '1button', 'scene'],
  'TS0042': ['button', '2button', 'scene'],
  'TS0043': ['button', '3button', 'scene'],
  'TS0044': ['button', '4button', 'scene'],
  
  // Plugs
  'TS011F': ['plug', 'socket', 'outlet'],
  'TS0121': ['plug', 'socket', 'power'],
  
  // Lights
  'TS0502': ['light', 'dimmer', 'bulb'],
  'TS0503': ['light', 'rgb'],
  'TS0504': ['light', 'rgbw'],
  'TS0505': ['light', 'rgbcct'],
  
  // Dimmers
  'TS110E': ['dimmer', 'module'],
  'TS110F': ['dimmer', 'switch'],
  
  // Curtains
  'TS130F': ['curtain', 'motor'],
  
  // Gateway
  'TS0601': ['gateway', 'multi', 'hub']
};

const stats = {
  total: 0,
  needsEnrichment: 0,
  enriched: 0,
  suggestions: []
};

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
});

stats.total = drivers.length;

console.log(`📊 Analyzing ${drivers.length} drivers...\n`);

drivers.forEach(driverName => {
  const manifestPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(manifestPath)) return;
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (!manifest.zigbee || !manifest.zigbee.manufacturerName) {
      stats.needsEnrichment++;
      console.log(`⚠️  ${driverName}: No manufacturerName`);
      return;
    }
    
    const manufacturers = manifest.zigbee.manufacturerName;
    const currentCount = Array.isArray(manufacturers) ? manufacturers.length : 1;
    
    // Suggérer des manufacturerNames supplémentaires
    const suggestions = [];
    
    // Chercher par nom de driver
    Object.entries(knownManufacturers).forEach(([mfr, keywords]) => {
      const matchScore = keywords.filter(kw => 
        driverName.toLowerCase().includes(kw)
      ).length;
      
      if (matchScore > 0) {
        const exists = Array.isArray(manufacturers) 
          ? manufacturers.includes(mfr)
          : manufacturers === mfr;
          
        if (!exists) {
          suggestions.push({ mfr, score: matchScore });
        }
      }
    });
    
    if (suggestions.length > 0) {
      stats.needsEnrichment++;
      suggestions.sort((a, b) => b.score - a.score);
      
      console.log(`💡 ${driverName}:`);
      console.log(`   Current: ${currentCount} manufacturer(s)`);
      console.log(`   Suggestions: ${suggestions.slice(0, 3).map(s => s.mfr).join(', ')}`);
      
      stats.suggestions.push({
        driver: driverName,
        current: manufacturers,
        suggestions: suggestions.slice(0, 5).map(s => s.mfr)
      });
    }
    
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n📊 SUMMARY\n');
console.log(`Total drivers: ${stats.total}`);
console.log(`Need enrichment: ${stats.needsEnrichment}`);
console.log(`With suggestions: ${stats.suggestions.length}`);

// Save detailed report
const report = {
  timestamp: new Date().toISOString(),
  stats,
  suggestions: stats.suggestions,
  knownManufacturers: Object.keys(knownManufacturers)
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'MANUFACTURERS_ENRICHMENT_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📝 Report saved to reports/MANUFACTURERS_ENRICHMENT_REPORT.json');
console.log('\n🎯 Next: Review suggestions and apply enrichment');
console.log('\n💡 TIP: Research on Zigbee2MQTT for specific manufacturerIds');
