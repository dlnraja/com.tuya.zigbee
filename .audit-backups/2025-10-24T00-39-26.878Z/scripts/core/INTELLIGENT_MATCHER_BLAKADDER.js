#!/usr/bin/env node
'use strict';

/**
 * INTELLIGENT_MATCHER_BLAKADDER.js
 * Système intelligent de matching avec Blakadder database
 * Trouve automatiquement les correspondances manufacturer IDs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const CACHE_DIR = path.join(__dirname, '../../.cache');
const REPORTS_DIR = path.join(__dirname, '../../docs/enrichment');

// URLs des sources de données
const DATA_SOURCES = {
  blakadder: 'https://zigbee.blakadder.com/assets/all_devices.json',
  zigbee2mqtt: 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/docs/devices/index.md',
  z2m_converters: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts'
};

/**
 * Matrice de conversion entre différents formats
 */
const CONVERSION_MATRIX = {
  // Manufacturer name variations
  manufacturerNames: {
    '_TZ3000_': ['Tuya', '_TZ3000_*', 'TS*'],
    '_TZE200_': ['Tuya', '_TZE200_*', 'TS0601'],
    '_TZE204_': ['Tuya', '_TZE204_*', 'TS0601'],
    'Tuya': ['_TZ*', '_TZE*', 'TS*'],
    'HOBEIAN': ['ZG-*'],
    'MOES': ['_TZ*'],
    'BSEED': ['_TZ*']
  },
  
  // Product ID variations
  productIds: {
    'TS0601': ['_TZE200_*', '_TZE204_*'],
    'TS0202': ['_TZ3000_*'],
    'TS0203': ['_TZ3000_*'],
    'TS011F': ['_TZ3000_*']
  },
  
  // Device type synonyms
  deviceTypes: {
    'motion_sensor': ['pir', 'occupancy', 'presence', 'motion'],
    'contact_sensor': ['door', 'window', 'open_close'],
    'temperature_sensor': ['temp', 'climate', 'thermo'],
    'plug': ['socket', 'outlet', 'power'],
    'switch': ['relay', 'gang', 'wall_switch']
  }
};

/**
 * Télécharge et cache une ressource
 */
async function fetchAndCache(url, cacheName) {
  const cacheFile = path.join(CACHE_DIR, `${cacheName}.json`);
  
  // Check cache (valid 7 days)
  if (fs.existsSync(cacheFile)) {
    const stats = fs.statSync(cacheFile);
    const age = Date.now() - stats.mtimeMs;
    if (age < 7 * 24 * 60 * 60 * 1000) {
      console.log(`  ✅ Using cached ${cacheName}`);
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }
  }
  
  console.log(`  🌐 Downloading ${cacheName}...`);
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = url.includes('.json') ? JSON.parse(data) : data;
          
          if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
          }
          
          fs.writeFileSync(cacheFile, JSON.stringify(parsed, null, 2));
          console.log(`  ✅ Cached ${cacheName}`);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Parse Blakadder database
 */
function parseBlakadderData(data) {
  const devices = [];
  
  if (Array.isArray(data)) {
    for (const device of data) {
      if (device.manufacturerName && device.manufacturerName.includes('_TZ')) {
        devices.push({
          manufacturerId: device.manufacturerName,
          productId: device.modelId || device.model,
          deviceType: device.type || device.category,
          endpoints: device.endpoints || {},
          clusters: device.clusters || [],
          source: 'blakadder',
          verified: true
        });
      }
    }
  }
  
  return devices;
}

/**
 * Parse Zigbee2MQTT converters (TypeScript)
 */
function parseZ2MConverters(tsContent) {
  const devices = [];
  
  // Extract device definitions from TypeScript
  const deviceRegex = /\{[^}]*manufacturerName:\s*['"]([^'"]+)['"][^}]*modelID:\s*['"]([^'"]+)['"][^}]*\}/g;
  let match;
  
  while ((match = deviceRegex.exec(tsContent)) !== null) {
    const [, manufacturerId, productId] = match;
    if (manufacturerId.includes('_TZ')) {
      devices.push({
        manufacturerId,
        productId,
        source: 'zigbee2mqtt',
        verified: true
      });
    }
  }
  
  return devices;
}

/**
 * Calcule score de similarité entre deux strings
 */
function similarityScore(str1, str2) {
  if (!str1 || !str2) return 0;
  
  str1 = str1.toLowerCase();
  str2 = str2.toLowerCase();
  
  if (str1 === str2) return 100;
  
  // Wildcard matching
  if (str1.includes('*') || str2.includes('*')) {
    const regex = new RegExp(str1.replace(/\*/g, '.*'));
    return regex.test(str2) ? 90 : 0;
  }
  
  // Levenshtein-like simple comparison
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.includes(shorter)) return 80;
  
  // Common prefix
  let commonPrefix = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) commonPrefix++;
    else break;
  }
  
  return Math.round((commonPrefix / longer.length) * 100);
}

/**
 * Trouve les meilleurs matches pour un driver
 */
function findMatches(driverManufacturer, driverProduct, externalDevices) {
  const matches = [];
  
  for (const device of externalDevices) {
    let score = 0;
    const reasons = [];
    
    // Compare manufacturer ID
    if (device.manufacturerId) {
      const manuScore = similarityScore(driverManufacturer, device.manufacturerId);
      if (manuScore > 70) {
        score += manuScore * 0.6; // 60% weight on manufacturer
        reasons.push(`Manufacturer match: ${manuScore}%`);
      }
    }
    
    // Compare product ID
    if (device.productId && driverProduct) {
      const prodScore = similarityScore(driverProduct, device.productId);
      if (prodScore > 70) {
        score += prodScore * 0.4; // 40% weight on product
        reasons.push(`Product match: ${prodScore}%`);
      }
    }
    
    if (score > 70) {
      matches.push({
        device,
        score: Math.round(score),
        reasons,
        confidence: score > 95 ? 'HIGH' : score > 85 ? 'MEDIUM' : 'LOW'
      });
    }
  }
  
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Scan tous les drivers et trouve correspondances
 */
async function intelligentMatch() {
  console.log('🔍 INTELLIGENT MATCHER - BLAKADDER & ZIGBEE2MQTT');
  console.log('═'.repeat(60));
  console.log('');
  
  // 1. Télécharger les données externes
  console.log('📥 Step 1: Fetching external data sources...\n');
  
  let blakadderData, z2mData;
  
  try {
    blakadderData = await fetchAndCache(DATA_SOURCES.blakadder, 'blakadder_devices');
  } catch (error) {
    console.log('  ⚠️  Blakadder unavailable:', error.message);
    blakadderData = [];
  }
  
  try {
    z2mData = await fetchAndCache(DATA_SOURCES.z2m_converters, 'z2m_converters');
  } catch (error) {
    console.log('  ⚠️  Zigbee2MQTT unavailable:', error.message);
    z2mData = '';
  }
  
  // 2. Parser les données
  console.log('\n📊 Step 2: Parsing external databases...\n');
  
  const blakadderDevices = parseBlakadderData(blakadderData);
  const z2mDevices = parseZ2MConverters(z2mData);
  
  console.log(`  ✅ Blakadder: ${blakadderDevices.length} devices`);
  console.log(`  ✅ Zigbee2MQTT: ${z2mDevices.length} devices`);
  
  const allExternalDevices = [...blakadderDevices, ...z2mDevices];
  
  // 3. Scan drivers locaux
  console.log('\n🔍 Step 3: Scanning local drivers...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
  });
  
  const results = {
    totalDrivers: drivers.length,
    matched: [],
    unmatched: [],
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0
  };
  
  for (const driver of drivers) {
    const manifestPath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    
    if (!fs.existsSync(manifestPath)) continue;
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (!manifest.zigbee) continue;
    
    const manufacturerName = Array.isArray(manifest.zigbee.manufacturerName) 
      ? manifest.zigbee.manufacturerName[0] 
      : manifest.zigbee.manufacturerName;
    
    const productId = Array.isArray(manifest.zigbee.productId)
      ? manifest.zigbee.productId[0]
      : manifest.zigbee.productId;
    
    // Trouve matches
    const matches = findMatches(manufacturerName, productId, allExternalDevices);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      
      results.matched.push({
        driver,
        manufacturerId: manufacturerName,
        productId,
        bestMatch: bestMatch.device,
        score: bestMatch.score,
        confidence: bestMatch.confidence,
        allMatches: matches.length
      });
      
      if (bestMatch.confidence === 'HIGH') results.highConfidence++;
      else if (bestMatch.confidence === 'MEDIUM') results.mediumConfidence++;
      else results.lowConfidence++;
      
      console.log(`  ✅ ${driver}: ${bestMatch.score}% (${bestMatch.confidence})`);
    } else {
      results.unmatched.push({
        driver,
        manufacturerId: manufacturerName,
        productId
      });
      console.log(`  ⚠️  ${driver}: No matches found`);
    }
  }
  
  // 4. Générer rapport
  console.log('\n📄 Step 4: Generating report...\n');
  
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    sources: {
      blakadder: blakadderDevices.length,
      zigbee2mqtt: z2mDevices.length
    },
    results,
    matchDetails: results.matched,
    unmatchedDrivers: results.unmatched
  };
  
  const reportPath = path.join(REPORTS_DIR, `intelligent_matcher_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`  ✅ Report saved: ${reportPath}`);
  
  // 5. Summary
  console.log('\n═'.repeat(60));
  console.log('📊 MATCHING SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total Drivers: ${results.totalDrivers}`);
  console.log(`Matched: ${results.matched.length}`);
  console.log(`  - High Confidence: ${results.highConfidence}`);
  console.log(`  - Medium Confidence: ${results.mediumConfidence}`);
  console.log(`  - Low Confidence: ${results.lowConfidence}`);
  console.log(`Unmatched: ${results.unmatched.length}`);
  console.log('');
  
  // 6. Top recommendations
  console.log('🎯 TOP ENRICHMENT RECOMMENDATIONS:');
  console.log('');
  
  const topMatches = results.matched
    .filter(m => m.confidence === 'HIGH')
    .slice(0, 10);
  
  for (const match of topMatches) {
    console.log(`  ${match.driver}`);
    console.log(`    Manufacturer: ${match.manufacturerId}`);
    console.log(`    Best Match: ${match.bestMatch.source} (${match.score}%)`);
    console.log(`    Endpoints: ${JSON.stringify(match.bestMatch.endpoints || {})}`);
    console.log('');
  }
  
  return report;
}

// Run if called directly
if (require.main === module) {
  intelligentMatch().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { intelligentMatch, findMatches, similarityScore };
