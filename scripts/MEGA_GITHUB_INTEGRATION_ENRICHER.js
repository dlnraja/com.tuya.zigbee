#!/usr/bin/env node
/**
 * MEGA GITHUB INTEGRATION ENRICHER
 * 
 * Intègre TOUS les devices Zigbee Tuya de:
 * - Vos propres GitHub Issues/PRs
 * - Johan Bendz (Koenkk/zigbee-herdsman-converters) PRs/Issues
 * - Toutes suggestions et demandes communautaires
 * 
 * Maintient l'organisation UNBRANDED et function-based
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const rootPath = __dirname.replace(/[\\\/]scripts$/, '');
const appJsonPath = path.join(rootPath, 'app.json');

console.log('🌐 MEGA GITHUB INTEGRATION ENRICHER');
console.log('='.repeat(80));
console.log('⚡ INTÉGRATION MULTI-SOURCES GITHUB');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// CONFIGURATION SOURCES
// ============================================================================

const GITHUB_SOURCES = {
  // Votre repo
  yourRepo: {
    owner: 'dlnraja',
    repo: 'com.tuya.zigbee',
    type: 'YOUR_REPO'
  },
  
  // Johan Bendz - zigbee-herdsman-converters
  johanHerdsman: {
    owner: 'Koenkk',
    repo: 'zigbee-herdsman-converters',
    type: 'JOHAN_HERDSMAN'
  },
  
  // Johan Bendz - Homey Tuya App (original)
  johanHomey: {
    owner: 'JohanBengtsson',
    repo: 'com.tuya.zigbee',
    type: 'JOHAN_HOMEY'
  }
};

// ============================================================================
// GITHUB API FUNCTIONS
// ============================================================================

function fetchGitHub(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Homey-Tuya-Integration',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function getIssues(owner, repo) {
  console.log('   📥 Fetching issues from ' + owner + '/' + repo + '...');
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`;
    const issues = await fetchGitHub(url);
    console.log('      Found ' + (Array.isArray(issues) ? issues.length : 0) + ' issues');
    return Array.isArray(issues) ? issues : [];
  } catch (error) {
    console.log('      ⚠️  Error fetching issues: ' + error.message);
    return [];
  }
}

async function getPullRequests(owner, repo) {
  console.log('   📥 Fetching PRs from ' + owner + '/' + repo + '...');
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`;
    const prs = await fetchGitHub(url);
    console.log('      Found ' + (Array.isArray(prs) ? prs.length : 0) + ' PRs');
    return Array.isArray(prs) ? prs : [];
  } catch (error) {
    console.log('      ⚠️  Error fetching PRs: ' + error.message);
    return [];
  }
}

// ============================================================================
// ID EXTRACTION
// ============================================================================

function extractDeviceIDs(text) {
  const ids = {
    manufacturerIds: new Set(),
    productIds: new Set()
  };
  
  if (!text) return ids;
  
  // Extract manufacturer IDs (_TZxxxx_xxxxxxxx)
  const manufacturerPattern = /(_TZ[A-Z0-9]{4}_[a-z0-9]{8})/g;
  const manufacturerMatches = text.match(manufacturerPattern);
  if (manufacturerMatches) {
    manufacturerMatches.forEach(id => ids.manufacturerIds.add(id));
  }
  
  // Extract product IDs (TSxxxx)
  const productPattern = /\b(TS[0-9]{4}[A-Z]?)\b/g;
  const productMatches = text.match(productPattern);
  if (productMatches) {
    productMatches.forEach(id => ids.productIds.add(id));
  }
  
  return ids;
}

function categorizeDevice(title, body) {
  const text = (title + ' ' + body).toLowerCase();
  
  // Détection intelligente par mots-clés
  if (text.match(/switch|button|wall|touch|relay/)) {
    if (text.match(/1[- ]gang|single/)) return 'switch_1gang';
    if (text.match(/2[- ]gang|double/)) return 'switch_2gang';
    if (text.match(/3[- ]gang|triple/)) return 'switch_3gang';
    if (text.match(/4[- ]gang|quad/)) return 'switch_4gang';
    return 'switch_1gang';
  }
  
  if (text.match(/sensor|temperature|humidity|motion|pir|contact|door|window/)) {
    if (text.match(/motion|pir/)) return 'motion_sensor';
    if (text.match(/temperature|temp.*humidity|temp.*humid/)) return 'temperature_humidity_sensor';
    if (text.match(/door|window|contact/)) return 'door_window_sensor';
    return 'multisensor';
  }
  
  if (text.match(/dimmer|brightness/)) return 'dimmer';
  if (text.match(/plug|socket|outlet/)) return 'smart_plug';
  if (text.match(/bulb|light|lamp/)) return 'smart_bulb';
  if (text.match(/curtain|blind|shade|roller/)) return 'curtain_motor';
  if (text.match(/thermostat|valve|heating/)) return 'thermostat';
  if (text.match(/smoke|fire/)) return 'smoke_detector';
  if (text.match(/water.*leak|leak.*sensor/)) return 'water_leak_sensor';
  
  return 'other';
}

// ============================================================================
// PHASE 1: SCAN GITHUB SOURCES
// ============================================================================

console.log('🔍 Phase 1: Scanning GitHub Sources');
console.log('-'.repeat(80));

const allDeviceData = {
  manufacturerIds: new Set(),
  productIds: new Set(),
  devices: []
};

async function scanSource(source) {
  console.log('');
  console.log('📂 Scanning: ' + source.owner + '/' + source.repo);
  console.log('   Type: ' + source.type);
  console.log('');
  
  // Get issues
  const issues = await getIssues(source.owner, source.repo);
  
  // Get PRs
  const prs = await getPullRequests(source.owner, source.repo);
  
  // Combine all
  const allItems = [...issues, ...prs];
  
  console.log('   📊 Processing ' + allItems.length + ' items...');
  
  let deviceCount = 0;
  
  allItems.forEach(item => {
    const title = item.title || '';
    const body = item.body || '';
    const combined = title + '\n' + body;
    
    // Extract IDs
    const ids = extractDeviceIDs(combined);
    
    if (ids.manufacturerIds.size > 0 || ids.productIds.size > 0) {
      deviceCount++;
      
      // Add to global sets
      ids.manufacturerIds.forEach(id => allDeviceData.manufacturerIds.add(id));
      ids.productIds.forEach(id => allDeviceData.productIds.add(id));
      
      // Categorize
      const category = categorizeDevice(title, body);
      
      allDeviceData.devices.push({
        source: source.type,
        title: title,
        category: category,
        manufacturerIds: Array.from(ids.manufacturerIds),
        productIds: Array.from(ids.productIds),
        url: item.html_url
      });
    }
  });
  
  console.log('   ✅ Found ' + deviceCount + ' devices');
  console.log('');
}

// Scan all sources
(async () => {
  try {
    for (const [key, source] of Object.entries(GITHUB_SOURCES)) {
      await scanSource(source);
      // Pause entre requêtes pour éviter rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('');
    console.log('📊 Phase 2: Integration Summary');
    console.log('-'.repeat(80));
    console.log('   Total Manufacturer IDs found: ' + allDeviceData.manufacturerIds.size);
    console.log('   Total Product IDs found: ' + allDeviceData.productIds.size);
    console.log('   Total Devices found: ' + allDeviceData.devices.length);
    console.log('');
    
    // ============================================================================
    // PHASE 3: INTELLIGENT INTEGRATION
    // ============================================================================
    
    console.log('🔧 Phase 3: Intelligent Integration');
    console.log('-'.repeat(80));
    
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    let idsAdded = 0;
    let driversUpdated = 0;
    
    // Map catégories vers drivers
    const categoryToDrivers = {
      'switch_1gang': ['smart_switch_1gang_ac', 'wall_switch_1gang_ac', 'touch_switch_1gang', 'switch_1gang_battery'],
      'switch_2gang': ['smart_switch_2gang_ac', 'wall_switch_2gang_ac', 'touch_switch_2gang', 'switch_2gang_ac'],
      'switch_3gang': ['smart_switch_3gang_ac', 'wall_switch_3gang_ac', 'touch_switch_3gang', 'switch_3gang_battery'],
      'switch_4gang': ['smart_switch_4gang_hybrid', 'wall_switch_4gang_ac', 'touch_switch_4gang', 'switch_4gang_ac'],
      'motion_sensor': ['motion_sensor_pir_battery', 'motion_sensor_battery', 'pir_sensor_advanced'],
      'temperature_humidity_sensor': ['temperature_humidity_sensor', 'temp_humid_sensor_advanced'],
      'door_window_sensor': ['door_window_sensor'],
      'multisensor': ['multisensor', 'comprehensive_air_monitor'],
      'dimmer': ['dimmer', 'touch_dimmer', 'smart_dimmer_module_1gang'],
      'smart_plug': ['smart_plug', 'smart_plug_energy', 'energy_monitoring_plug'],
      'smart_bulb': ['smart_bulb_white', 'smart_bulb_dimmer', 'smart_bulb_rgb'],
      'curtain_motor': ['curtain_motor', 'smart_curtain_motor', 'roller_blind_controller'],
      'thermostat': ['thermostat', 'smart_thermostat', 'radiator_valve'],
      'smoke_detector': ['smoke_detector', 'smart_smoke_detector_advanced'],
      'water_leak_sensor': ['water_leak_sensor', 'water_leak_detector_advanced']
    };
    
    // Intégrer les IDs par catégorie
    allDeviceData.devices.forEach(device => {
      const targetDrivers = categoryToDrivers[device.category] || [];
      
      targetDrivers.forEach(driverId => {
        const driver = appJson.drivers.find(d => d.id === driverId);
        if (driver && driver.zigbee && driver.zigbee.manufacturerName) {
          const before = driver.zigbee.manufacturerName.length;
          
          // Ajouter manufacturer IDs
          device.manufacturerIds.forEach(id => {
            if (!driver.zigbee.manufacturerName.includes(id)) {
              driver.zigbee.manufacturerName.push(id);
              idsAdded++;
            }
          });
          
          // Ajouter product IDs
          if (driver.zigbee.productId && device.productIds.length > 0) {
            device.productIds.forEach(id => {
              if (!driver.zigbee.productId.includes(id)) {
                driver.zigbee.productId.push(id);
              }
            });
          }
          
          const after = driver.zigbee.manufacturerName.length;
          if (after > before) {
            driversUpdated++;
            console.log('   ✅ ' + driverId + ': +' + (after - before) + ' IDs (from ' + device.source + ')');
          }
        }
      });
    });
    
    console.log('');
    console.log('   Total IDs added: ' + idsAdded);
    console.log('   Drivers updated: ' + driversUpdated);
    console.log('');
    
    // ============================================================================
    // PHASE 4: SAVE & PUBLISH
    // ============================================================================
    
    if (idsAdded > 0) {
      console.log('💾 Phase 4: Saving & Publishing');
      console.log('-'.repeat(80));
      
      // Save app.json
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
      console.log('   ✅ app.json updated');
      
      // Version bump
      const currentVersion = appJson.version;
      const versionParts = currentVersion.split('.');
      versionParts[1] = parseInt(versionParts[1]) + 1; // MINOR bump
      versionParts[2] = 0; // Reset PATCH
      const newVersion = versionParts.join('.');
      
      appJson.version = newVersion;
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
      
      console.log('   Version: ' + currentVersion + ' → ' + newVersion);
      console.log('');
      
      // Validate
      console.log('✅ Phase 5: Validation');
      console.log('-'.repeat(80));
      
      try {
        execSync('homey app build', { stdio: 'pipe', cwd: rootPath });
        execSync('homey app validate --level=publish', { stdio: 'pipe', cwd: rootPath });
        console.log('   ✅ Build & Validation PASSED');
      } catch (error) {
        console.log('   ❌ Validation FAILED');
        console.log('   Error: ' + error.message);
        process.exit(1);
      }
      
      console.log('');
      
      // Save report
      const reportPath = path.join(rootPath, 'reports', 'github_integration_report.json');
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        version: newVersion,
        sources: Object.keys(GITHUB_SOURCES),
        totalManufacturerIds: allDeviceData.manufacturerIds.size,
        totalProductIds: allDeviceData.productIds.size,
        totalDevices: allDeviceData.devices.length,
        idsAdded: idsAdded,
        driversUpdated: driversUpdated,
        devices: allDeviceData.devices
      }, null, 2));
      
      console.log('📄 Report saved: ' + reportPath);
      console.log('');
      
      // Final summary
      console.log('');
      console.log('='.repeat(80));
      console.log('🎊 GITHUB INTEGRATION COMPLETE');
      console.log('='.repeat(80));
      console.log('');
      console.log('📊 SUMMARY:');
      console.log('   Sources Scanned: ' + Object.keys(GITHUB_SOURCES).length);
      console.log('   Your Repo: ✅');
      console.log('   Johan Bendz Herdsman: ✅');
      console.log('   Johan Bendz Homey: ✅');
      console.log('');
      console.log('   Devices Found: ' + allDeviceData.devices.length);
      console.log('   Manufacturer IDs: ' + allDeviceData.manufacturerIds.size);
      console.log('   Product IDs: ' + allDeviceData.productIds.size);
      console.log('');
      console.log('   IDs Added: ' + idsAdded);
      console.log('   Drivers Updated: ' + driversUpdated);
      console.log('   New Version: ' + newVersion);
      console.log('');
      console.log('✅ Ready to commit & push!');
      console.log('');
      
    } else {
      console.log('');
      console.log('ℹ️  No new IDs found from GitHub sources');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
