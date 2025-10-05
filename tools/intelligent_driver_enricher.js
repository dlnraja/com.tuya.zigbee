"use strict";

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');
const REFS = path.join(ROOT, 'references');
const PROJECT_DATA = path.join(ROOT, 'project-data');

// Load all reference sources
function loadAllSources() {
  const sources = {
    bduN4: loadJSON(path.join(REFS, 'BDU_v38_n4.json')),
    bduN5: loadJSON(path.join(REFS, 'BDU_v38_n5.json')),
    johanbenz: loadJSON(path.join(REFS, 'johanbendz_drivers_snapshot.json')),
    ultimateMatrix: parseMarkdown(path.join(ROOT, 'ultimate_system', 'ULTIMATE_REFERENCE_MATRIX.md')),
    enrichmentReport: parseMarkdown(path.join(ROOT, 'ultimate_system', 'reports', 'ENRICHMENT_COMPLETION_REPORT.md'))
  };
  
  // Extract manufacturer names from all sources
  const allManufacturers = new Set();
  
  // From BDU N4/N5
  if (sources.bduN4 && sources.bduN4.manufacturers) {
    Object.keys(sources.bduN4.manufacturers).forEach(m => allManufacturers.add(m));
  }
  if (sources.bduN5 && sources.bduN5.global && sources.bduN5.global.manufacturers) {
    Object.keys(sources.bduN5.global.manufacturers).forEach(m => allManufacturers.add(m));
  }
  
  // From Ultimate Matrix (specific TZE/TZ3000 IDs)
  if (sources.ultimateMatrix && sources.ultimateMatrix.manufacturers) {
    sources.ultimateMatrix.manufacturers.forEach(m => allManufacturers.add(m));
  }
  
  return {
    sources,
    allManufacturers: Array.from(allManufacturers).sort()
  };
}

function loadJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error loading ${filePath}:`, e.message);
  }
  return null;
}

function parseMarkdown(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const manufacturers = [];
    
    // Extract manufacturer IDs from markdown (lines starting with - _TZ or - _TZE or specific brands)
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^[-*]\s*(_TZ[A-Z0-9_]+|Tuya|MOES|BSEED|Lonsonho|Lidl|Nedis|eWeLink|Zemismart)/);
      if (match) {
        manufacturers.push(match[1]);
      }
    }
    
    return { manufacturers };
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e.message);
    return null;
  }
}

// Categorize drivers by type
function categorizeDriver(driverId, compose) {
  const categories = {
    motion: ['motion', 'pir', 'presence', 'radar', 'occupancy'],
    climate: ['temp', 'humid', 'climate', 'thermostat', 'valve', 'radiator'],
    light: ['light', 'bulb', 'dimmer', 'rgb', 'led', 'strip', 'spot', 'ceiling'],
    power: ['plug', 'socket', 'outlet', 'power', 'energy', 'meter'],
    sensor: ['sensor', 'detector', 'monitor', 'quality', 'leak', 'smoke', 'gas', 'co', 'co2', 'tvoc', 'formaldehyde'],
    switch: ['switch', 'relay', 'gang', 'touch', 'wireless', 'scene', 'controller', 'button'],
    cover: ['curtain', 'blind', 'shutter', 'shade', 'roller', 'motor'],
    security: ['lock', 'doorbell', 'alarm', 'siren', 'emergency', 'sos'],
    misc: ['gateway', 'hub', 'bridge', 'repeater', 'feeder', 'valve', 'sprinkler']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => driverId.includes(kw))) {
      return category;
    }
  }
  
  // Check capabilities for better categorization
  if (compose && compose.capabilities) {
    const caps = Array.isArray(compose.capabilities) ? compose.capabilities : [];
    if (caps.includes('alarm_motion')) return 'motion';
    if (caps.includes('measure_temperature')) return 'climate';
    if (caps.includes('onoff') && caps.includes('dim')) return 'light';
    if (caps.includes('onoff') && caps.includes('measure_power')) return 'power';
    if (caps.includes('windowcoverings_state')) return 'cover';
  }
  
  return 'misc';
}

// Intelligent manufacturer suggestion based on category
function suggestManufacturers(category, allManufacturers) {
  const suggestions = {
    motion: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_otvn3lne', '_TZE200_3towulqd'],
    climate: ['_TZE200_cwbvmsar', '_TZE200_locansqn', '_TZE200_bjawzodf', '_TZ3000_zl1kmjqx'],
    light: ['_TZ3000_odygigth', '_TZ3000_kdpxju99', '_TZ3210_zmy9hjay', '_TZ3000_8nkb7mof'],
    power: ['_TZ3000_g5xawfcq', '_TZ3000_vzopcetz', '_TZ3000_rdtixbnu', '_TZE200_81isopgh'],
    sensor: ['_TZE200_pay2byax', '_TZE200_znbl8dj5', '_TZ3000_8ybe88nf', '_TZE200_dwcarsat'],
    switch: ['_TZ3000_xxxxxxxx', '_TZ3000_4fjiwweb', '_TZ3000_adkvzooy', '_TZ3000_qmi1cfuq'],
    cover: ['_TZE200_fctwhugx', '_TZE200_xuzcvlku', '_TZE200_wmcdj3aq', '_TYZB01_xu5rkmpn'],
    security: ['_TZE200_ztc6ggyl', '_TYST11_ckukey', '_TZE200_ztc6ggyl'],
    misc: ['_TZ3000_xxxxxxxx', '_TZE200_xxxxxxxx']
  };
  
  // Filter to only manufacturers that exist in our database
  const categorySpecific = (suggestions[category] || [])
    .filter(m => allManufacturers.includes(m));
  
  // Add generic Tuya manufacturers
  const genericTuya = allManufacturers.filter(m => 
    m.startsWith('_TZ') && !categorySpecific.includes(m)
  ).slice(0, 5);
  
  return [...categorySpecific, ...genericTuya].slice(0, 10);
}

// Main enrichment function
function enrichDriver(driverId, category, allManufacturers) {
  const driverPath = path.join(DRIVERS, driverId);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  ${driverId}: driver.compose.json not found`);
    return { status: 'skip', reason: 'no compose file' };
  }
  
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch (e) {
    console.log(`❌ ${driverId}: JSON parse error`);
    return { status: 'error', reason: 'parse error' };
  }
  
  // Get current manufacturerName array
  const currentManufacturers = [];
  if (compose.zigbee && Array.isArray(compose.zigbee.manufacturerName)) {
    currentManufacturers.push(...compose.zigbee.manufacturerName);
  }
  
  if (currentManufacturers.length === 0) {
    console.log(`⚠️  ${driverId}: No manufacturerName array found`);
    return { status: 'skip', reason: 'no manufacturers' };
  }
  
  // Get intelligent suggestions
  const suggestions = suggestManufacturers(category, allManufacturers);
  
  // Add new manufacturers (up to cap of 200 total)
  const newManufacturers = [];
  for (const suggestion of suggestions) {
    if (currentManufacturers.length >= 200) break;
    if (!currentManufacturers.includes(suggestion)) {
      currentManufacturers.push(suggestion);
      newManufacturers.push(suggestion);
    }
  }
  
  if (newManufacturers.length === 0) {
    return { status: 'already_complete', count: currentManufacturers.length };
  }
  
  // Update compose file
  compose.zigbee.manufacturerName = currentManufacturers.sort();
  
  try {
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n', 'utf8');
    console.log(`✅ ${driverId}: +${newManufacturers.length} manufacturers (${currentManufacturers.length} total)`);
    return { 
      status: 'enriched', 
      added: newManufacturers.length, 
      total: currentManufacturers.length,
      newManufacturers
    };
  } catch (e) {
    console.log(`❌ ${driverId}: Write error - ${e.message}`);
    return { status: 'error', reason: 'write error' };
  }
}

// Main execution
function main() {
  console.log('🔍 Loading all reference sources...\n');
  const { sources, allManufacturers } = loadAllSources();
  console.log(`📊 Total unique manufacturers in database: ${allManufacturers.length}\n`);
  
  // Get all drivers
  const drivers = fs.readdirSync(DRIVERS).filter(d => {
    const stat = fs.statSync(path.join(DRIVERS, d));
    return stat.isDirectory();
  });
  
  console.log(`📦 Found ${drivers.length} drivers\n`);
  console.log('🚀 Starting intelligent enrichment...\n');
  
  const results = {
    enriched: [],
    alreadyComplete: [],
    skipped: [],
    errors: []
  };
  
  // Process each driver
  for (const driverId of drivers) {
    const composePath = path.join(DRIVERS, driverId, 'driver.compose.json');
    let compose = null;
    try {
      if (fs.existsSync(composePath)) {
        compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      }
    } catch (e) {}
    
    const category = categorizeDriver(driverId, compose);
    const result = enrichDriver(driverId, category, allManufacturers);
    
    if (result.status === 'enriched') {
      results.enriched.push({ driverId, ...result });
    } else if (result.status === 'already_complete') {
      results.alreadyComplete.push({ driverId, ...result });
    } else if (result.status === 'skip') {
      results.skipped.push({ driverId, ...result });
    } else if (result.status === 'error') {
      results.errors.push({ driverId, ...result });
    }
  }
  
  // Summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 INTELLIGENT ENRICHMENT COMPLETE\n');
  console.log(`✅ Enriched: ${results.enriched.length} drivers`);
  console.log(`✓  Already complete: ${results.alreadyComplete.length} drivers`);
  console.log(`⚠️  Skipped: ${results.skipped.length} drivers`);
  console.log(`❌ Errors: ${results.errors.length} drivers`);
  console.log('='.repeat(60) + '\n');
  
  // Save detailed report
  const reportPath = path.join(PROJECT_DATA, 'intelligent_enrichment_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2) + '\n', 'utf8');
  console.log(`📄 Detailed report: ${reportPath}`);
  
  if (results.enriched.length > 0) {
    console.log(`\n🎯 Total new manufacturers added: ${results.enriched.reduce((sum, r) => sum + r.added, 0)}`);
  }
}

main();
