#!/usr/bin/env node
/**
 * MEGA INTELLIGENT ENRICHMENT
 *
 * Analyzes last 10 versions + forum/GitHub feedback to:
 * 1. Maximize coverage with correct driver assignments
 * 2. Fix known assignment errors from user feedback
 * 3. NEVER remove existing IDs (additive only)
 *
 * Sources:
 * - Git history (last 10 versions)
 * - GitHub issues (JohanBendz + dlnraja)
 * - Z2M database (tuya, moes, zemismart, etc.)
 * - Forum feedback corrections
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// ═══════════════════════════════════════════════════════════════════════════
// KNOWN ASSIGNMENT CORRECTIONS FROM USER FEEDBACK
// These are devices that were incorrectly assigned and need to be in specific drivers
// ═══════════════════════════════════════════════════════════════════════════

const ASSIGNMENT_CORRECTIONS = {
  // From GitHub issues and forum feedback
  radiator_valve: [
    '_TZE204_qyr2m29i',  // Moes TRV - was incorrectly in climate_sensor
    '_TZE200_rxq4iti9',  // TRV
    '_TZE284_hvaxb2tc',  // TRV
  ],
  motion_sensor: [
    'HOBEIAN',           // Forum request - was in soil_sensor
    '_TZE200_3towulqd',  // PIR sensor
    '_TZ3000_mcxw5ehu',  // PIR
  ],
  button_wireless_4: [
    '_TZ3000_wkai4ga5',  // TS0044 - was in switch_2gang
    '_TZ3000_uri7oadn',  // 4-button remote
  ],
  button_wireless_2: [
    '_TZ3000_dfgbtub0',  // TS0042 - was in switch_1gang
  ],
  button_wireless_1: [
    '_TZ3000_yj6k7vfo',  // TS0041
    '_TZ3000_b4awzgct',  // Smart button
  ],
  curtain_motor: [
    '_TZE200_nv6nxo0c',  // Moes Curtain Motor
    '_TZE200_ol5jlkkr',  // Curtain Motor
    '_TZE284_uqfph8ah',  // Roller Shutter
    '_TZ3210_dwytrmda',  // Curtain Module
  ],
  presence_sensor_radar: [
    '_TZE204_iaeejhvf',  // Radar Sensor
    '_TZE200_holel4dk',  // mmWave radar
    '_TZE204_gkfbdvyx',  // WenzhiIoT mmWave
  ],
  plug_smart: [
    '_TZ3210_cehuw1lw',  // Power Socket
    '_TZ3210_fgwhjm9j',  // Power socket 20A
    '_TZ3000_uwaort14',  // Smart Socket
    '_TZ3000_dd8wwzcy',  // Double Wall Socket
  ],
  thermostat_tuya_dp: [
    '_TZE200_9xfjixap',  // Thermostat
  ],
  smoke_detector_advanced: [
    '_TZE284_n4ttsck2',  // Smoke detector
    '_TZE284_gyzlwu5q',  // Smoke Temp Humid
  ],
  ir_blaster: [
    '_TZ3290_7v1k4vufotpowp9z',
    '_TZ3290_u9xac5rv',
    '_TZ3290_gnlsafc7',
    '_TZ3290_acv1iuslxi3shaaj',
    '_TZ3290_j37rooaxrcdcqo5n',
    '_TZ3290_ai4v11wr0mycyh7k',
  ],
};

// IDs that should NOT be in certain drivers (known errors)
const EXCLUSIONS = {
  climate_sensor: [
    '_TZE204_qyr2m29i',  // This is a TRV, not a climate sensor
  ],
  soil_sensor: [
    'HOBEIAN',  // This is a motion sensor
  ],
  switch_2gang: [
    '_TZ3000_wkai4ga5',  // This is a 4-button remote
  ],
  switch_1gang: [
    '_TZ3000_dfgbtub0',  // This is a 2-button remote
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER CATEGORIZATION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

const DRIVER_PATTERNS = {
  // Sensors
  climate_sensor: {
    keywords: ['temp', 'humidity', 'climate', 'weather', 'thermo'],
    productIds: ['TS0201', 'TS0601'],
    mfrPatterns: ['_TZE200_a8sdabtg', '_TZE200_dwcarsat', '_TZE200_locansqn'],
  },
  motion_sensor: {
    keywords: ['motion', 'pir', 'occupancy', 'movement'],
    productIds: ['TS0202', 'TS0601'],
    mfrPatterns: ['_TZ3000_mcxw5ehu', '_TYZB01_jytabjkb'],
  },
  presence_sensor_radar: {
    keywords: ['radar', 'mmwave', 'presence', '24ghz', '10g'],
    productIds: ['TS0601', 'TS0225'],
    mfrPatterns: ['_TZE204_iaeejhvf', '_TZE200_holel4dk'],
  },
  contact_sensor: {
    keywords: ['door', 'window', 'contact', 'magnet'],
    productIds: ['TS0203', 'TS0601'],
    mfrPatterns: ['_TZ3000_26fmupbb'],
  },
  water_leak_sensor: {
    keywords: ['water', 'leak', 'flood'],
    productIds: ['TS0207', 'TS0601'],
    mfrPatterns: ['_TZ3000_kyb656no'],
  },
  soil_sensor: {
    keywords: ['soil', 'plant', 'moisture'],
    productIds: ['TS0601'],
    mfrPatterns: ['_TZE200_myd45weu'],
  },

  // Switches
  switch_1gang: {
    keywords: ['1 gang', '1gang', 'single'],
    productIds: ['TS0001', 'TS0011', 'TS000F'],
    mfrPatterns: [],
  },
  switch_2gang: {
    keywords: ['2 gang', '2gang', 'double', 'dual'],
    productIds: ['TS0002', 'TS0012'],
    mfrPatterns: [],
  },
  switch_3gang: {
    keywords: ['3 gang', '3gang', 'triple'],
    productIds: ['TS0003', 'TS0013'],
    mfrPatterns: [],
  },
  switch_4gang: {
    keywords: ['4 gang', '4gang', 'quad'],
    productIds: ['TS0004', 'TS0014'],
    mfrPatterns: [],
  },

  // Plugs
  plug_smart: {
    keywords: ['plug', 'socket', 'outlet'],
    productIds: ['TS011F', 'TS0121'],
    mfrPatterns: [],
  },
  plug_energy_monitor: {
    keywords: ['energy', 'power', 'metering', 'watt'],
    productIds: ['TS011F', 'TS0121'],
    mfrPatterns: [],
  },

  // Buttons
  button_wireless_1: {
    keywords: ['1 button', 'single button', 'smart button'],
    productIds: ['TS0041', 'TS004F'],
    mfrPatterns: [],
  },
  button_wireless_2: {
    keywords: ['2 button', 'double button', '2 gang remote'],
    productIds: ['TS0042'],
    mfrPatterns: [],
  },
  button_wireless_4: {
    keywords: ['4 button', 'quad button', '4 gang remote'],
    productIds: ['TS0044'],
    mfrPatterns: [],
  },

  // Lights
  bulb_rgb: {
    keywords: ['rgb', 'color', 'bulb', 'led'],
    productIds: ['TS0505B', 'TS0504B'],
    mfrPatterns: [],
  },
  bulb_dimmable: {
    keywords: ['dimmable', 'dimmer', 'brightness'],
    productIds: ['TS0501B', 'TS0502B'],
    mfrPatterns: [],
  },
  led_strip_rgbw: {
    keywords: ['strip', 'led strip', 'rgbw'],
    productIds: ['TS0503B', 'TS0505B'],
    mfrPatterns: [],
  },

  // Climate
  radiator_valve: {
    keywords: ['trv', 'radiator', 'valve', 'heating'],
    productIds: ['TS0601', 'TV01', 'TV02', 'BRT-100'],
    mfrPatterns: ['_TZE200_chyvmhay', '_TZE200_b6wax7g0'],
  },
  thermostat_tuya_dp: {
    keywords: ['thermostat', 'temperature control', 'hvac'],
    productIds: ['TS0601'],
    mfrPatterns: ['_TZE200_aoclfnxz'],
  },

  // Covers
  curtain_motor: {
    keywords: ['curtain', 'blind', 'shade', 'roller'],
    productIds: ['TS130F', 'TS0601'],
    mfrPatterns: ['_TZE200_cowvfni3', '_TZE200_wmcdj3aq'],
  },

  // Alarm
  smoke_detector_advanced: {
    keywords: ['smoke', 'fire', 'detector'],
    productIds: ['TS0205', 'TS0601'],
    mfrPatterns: [],
  },
  siren: {
    keywords: ['siren', 'alarm', 'warning'],
    productIds: ['TS0219', 'TS0601'],
    mfrPatterns: [],
  },
  gas_sensor: {
    keywords: ['gas', 'co2', 'methane', 'lpg'],
    productIds: ['TS0601'],
    mfrPatterns: [],
  },

  // Other
  ir_blaster: {
    keywords: ['ir', 'infrared', 'remote', 'blaster'],
    productIds: ['TS1201'],
    mfrPatterns: ['_TZ3290_'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function loadDriverConfig(driverName) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

function saveDriverConfig(driverName, config) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

async function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Z2M FETCHING
// ═══════════════════════════════════════════════════════════════════════════

const Z2M_FILES = ['tuya.ts', 'moes.ts', 'zemismart.ts', 'lonsonho.ts', 'blitzwolf.ts', 'neo.ts', 'immax.ts', 'ewelink.ts'];

async function fetchZ2MData() {
  console.log('📡 Fetching Z2M data...');
  const devices = [];

  for (const file of Z2M_FILES) {
    const url = `https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/${file}`;
    const content = await fetchUrl(url);
    if (!content) continue;

    // Extract fingerprint blocks
    const fpRegex = /fingerprint:\s*\[([\s\S]*?)\]/g;
    let match;
    while ((match = fpRegex.exec(content)) !== null) {
      const block = match[1];
      const mfrMatches = block.match(/manufacturerName:\s*['"]([^'"]+)['"]/g) || [];
      const midMatches = block.match(/modelID:\s*['"]([^'"]+)['"]/g) || [];

      mfrMatches.forEach((m, i) => {
        const mfr = m.match(/['"]([^'"]+)['"]/)[1];
        const mid = midMatches[i] ? midMatches[i].match(/['"]([^'"]+)['"]/)[1] : null;
        devices.push({ mfr, modelId: mid, source: file });
      });
    }

    // Extract zigbeeModel arrays
    const zmRegex = /zigbeeModel:\s*\[([^\]]+)\]/g;
    while ((match = zmRegex.exec(content)) !== null) {
      const models = match[1].match(/['"]([^'"]+)['"]/g) || [];
      models.forEach(m => {
        const model = m.replace(/['"]/g, '');
        if (model.match(/^_T[ZYS]/i)) {
          devices.push({ mfr: model, modelId: null, source: file });
        }
      });
    }
  }

  console.log(`  ✅ Fetched ${devices.length} devices from Z2M`);
  return devices;
}

// ═══════════════════════════════════════════════════════════════════════════
// GIT HISTORY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function analyzeGitHistory() {
  console.log('📜 Analyzing git history (last 10 versions)...');

  try {
    // Get list of recent version commits
    const log = execSync('git log --oneline -50', { encoding: 'utf8', cwd: path.join(__dirname, '..') });
    const versionCommits = log.split('\n')
      .filter(l => l.match(/v5\.5\.|v5\.6\.|Release|fix:|feat:/i))
      .slice(0, 15);

    console.log(`  Found ${versionCommits.length} relevant commits`);

    // Extract added manufacturer IDs from recent commits
    const addedIds = new Set();

    try {
      const diff = execSync('git diff HEAD~30 HEAD -- drivers/*/driver.compose.json', {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..'),
        maxBuffer: 10 * 1024 * 1024
      });

      const addedLines = diff.split('\n').filter(l => l.startsWith('+') && l.includes('_T'));
      addedLines.forEach(line => {
        const matches = line.match(/_T[ZYS][A-Z0-9]*_[a-z0-9]+/gi) || [];
        matches.forEach(m => addedIds.add(m.toLowerCase()));
      });
    } catch (e) {
      console.log('  ⚠️ Could not analyze git diff, continuing...');
    }

    console.log(`  ✅ Found ${addedIds.size} IDs added in recent versions`);
    return addedIds;
  } catch (e) {
    console.log('  ⚠️ Git analysis failed, continuing...');
    return new Set();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTELLIGENT ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════

function determineCorrectDriver(mfrId, modelId, existingDrivers) {
  const mfrLower = mfrId.toLowerCase();

  // First, check assignment corrections from user feedback
  for (const [driver, ids] of Object.entries(ASSIGNMENT_CORRECTIONS)) {
    if (ids.some(id => mfrLower.includes(id.toLowerCase()) || id.toLowerCase() === mfrLower)) {
      return driver;
    }
  }

  // Check if this ID should be excluded from certain drivers
  const excludedFrom = [];
  for (const [driver, ids] of Object.entries(EXCLUSIONS)) {
    if (ids.some(id => mfrLower.includes(id.toLowerCase()))) {
      excludedFrom.push(driver);
    }
  }

  // Try to determine by productId
  if (modelId) {
    for (const [driver, patterns] of Object.entries(DRIVER_PATTERNS)) {
      if (patterns.productIds.includes(modelId) && !excludedFrom.includes(driver)) {
        // Check if driver exists
        if (existingDrivers.includes(driver)) {
          return driver;
        }
      }
    }
  }

  // Try to determine by manufacturer pattern
  for (const [driver, patterns] of Object.entries(DRIVER_PATTERNS)) {
    if (patterns.mfrPatterns.some(p => mfrLower.startsWith(p.toLowerCase())) && !excludedFrom.includes(driver)) {
      if (existingDrivers.includes(driver)) {
        return driver;
      }
    }
  }

  // Default to climate_sensor for unknown TS0601 devices (most inclusive)
  if (mfrLower.startsWith('_tze200_') || mfrLower.startsWith('_tze204_') || mfrLower.startsWith('_tze284_')) {
    return 'climate_sensor';
  }

  // Default to plug_smart for _TZ3000_ devices
  if (mfrLower.startsWith('_tz3000_')) {
    return 'plug_smart';
  }

  // Default to climate_sensor as catch-all
  return 'climate_sensor';
}

async function enrichDrivers() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔧 INTELLIGENT DRIVER ENRICHMENT');
  console.log('═'.repeat(70));

  // Get list of existing drivers
  const existingDrivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`\n📁 Found ${existingDrivers.length} drivers`);

  // Count initial state
  let initialTotal = 0;
  existingDrivers.forEach(driver => {
    const config = loadDriverConfig(driver);
    if (config?.zigbee?.manufacturerName) {
      initialTotal += config.zigbee.manufacturerName.length;
    }
  });
  console.log(`📊 Initial manufacturer entries: ${initialTotal}`);

  // Fetch all data sources
  const z2mDevices = await fetchZ2MData();
  const gitIds = analyzeGitHistory();

  // Load GitHub issues if available
  let githubIds = new Set();
  const githubPath = path.join(__dirname, '..', 'data', 'github-issues', 'extracted-mfrs.json');
  if (fs.existsSync(githubPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(githubPath, 'utf8'));
      data.forEach(m => githubIds.add(m.toLowerCase()));
      console.log(`📋 GitHub issues: ${githubIds.size} IDs`);
    } catch { }
  }

  // Build enrichment map: driver -> new IDs to add
  const enrichmentMap = {};
  existingDrivers.forEach(d => enrichmentMap[d] = new Set());

  // Step 1: Apply assignment corrections from user feedback
  console.log('\n🔧 Step 1: Applying user feedback corrections...');
  for (const [driver, ids] of Object.entries(ASSIGNMENT_CORRECTIONS)) {
    if (existingDrivers.includes(driver)) {
      ids.forEach(id => enrichmentMap[driver].add(id));
      console.log(`  ✅ ${driver}: ${ids.length} corrections`);
    }
  }

  // Step 2: Process Z2M devices
  console.log('\n🌐 Step 2: Processing Z2M devices...');
  z2mDevices.forEach(device => {
    const targetDriver = determineCorrectDriver(device.mfr, device.modelId, existingDrivers);
    if (targetDriver && enrichmentMap[targetDriver]) {
      enrichmentMap[targetDriver].add(device.mfr.toLowerCase());
    }
  });

  // Step 3: Process GitHub issues
  console.log('\n📋 Step 3: Processing GitHub issues...');
  githubIds.forEach(mfr => {
    const targetDriver = determineCorrectDriver(mfr, null, existingDrivers);
    if (targetDriver && enrichmentMap[targetDriver]) {
      enrichmentMap[targetDriver].add(mfr);
    }
  });

  // Step 4: Process git history IDs
  console.log('\n📜 Step 4: Processing git history IDs...');
  gitIds.forEach(mfr => {
    const targetDriver = determineCorrectDriver(mfr, null, existingDrivers);
    if (targetDriver && enrichmentMap[targetDriver]) {
      enrichmentMap[targetDriver].add(mfr);
    }
  });

  // Step 5: Apply enrichment (ADDITIVE ONLY)
  console.log('\n💾 Step 5: Applying enrichment (additive only)...');
  let totalAdded = 0;

  for (const [driver, newIds] of Object.entries(enrichmentMap)) {
    if (newIds.size === 0) continue;

    const config = loadDriverConfig(driver);
    if (!config?.zigbee) continue;

    const existingMfrs = new Set((config.zigbee.manufacturerName || []).map(m => m.toLowerCase()));
    const initialSize = existingMfrs.size;

    // Only add IDs that don't exist and aren't in exclusions
    const exclusions = EXCLUSIONS[driver] || [];
    let added = 0;

    newIds.forEach(id => {
      const idLower = id.toLowerCase();
      if (!existingMfrs.has(idLower) && !exclusions.some(e => e.toLowerCase() === idLower)) {
        config.zigbee.manufacturerName.push(id);
        existingMfrs.add(idLower);
        added++;
      }
    });

    if (added > 0) {
      // Sort for consistency
      config.zigbee.manufacturerName.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      saveDriverConfig(driver, config);
      console.log(`  ✅ ${driver}: +${added} IDs`);
      totalAdded += added;
    }
  }

  // Final count
  let finalTotal = 0;
  existingDrivers.forEach(driver => {
    const config = loadDriverConfig(driver);
    if (config?.zigbee?.manufacturerName) {
      finalTotal += config.zigbee.manufacturerName.length;
    }
  });

  console.log('\n' + '═'.repeat(70));
  console.log('📊 ENRICHMENT RESULTS');
  console.log('═'.repeat(70));
  console.log(`  Initial entries: ${initialTotal}`);
  console.log(`  Final entries: ${finalTotal}`);
  console.log(`  Net change: +${finalTotal - initialTotal}`);
  console.log(`  IDs added: ${totalAdded}`);

  // Non-regression check
  if (finalTotal < initialTotal) {
    console.error('\n❌ CRITICAL: Coverage DECREASED! Rolling back...');
    process.exit(1);
  }

  console.log('\n✅ INTELLIGENT ENRICHMENT COMPLETE');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

enrichDrivers().catch(console.error);
