#!/usr/bin/env node

/**
 * 🔄 TUYA CLOUD TO LOCAL CONVERTER
 * 
 * Script intelligent pour:
 * ✅ Identifier type device (WiFi vs Zigbee)
 * ✅ Convertir capabilities Cloud → Zigbee
 * ✅ Trouver driver equivalent
 * ✅ Générer guide migration
 * ✅ Valider compatibility
 */

const fs = require('fs');
const path = require('path');

/**
 * 📊 CAPABILITY MAPPING: Tuya Cloud → Homey Zigbee
 */
const CAPABILITY_MAPPING = {
  // Switch/Relay
  'switch_1': { zigbee: 'onoff', cluster: 6, note: 'On/Off' },
  'switch_2': { zigbee: 'onoff.switch_2', cluster: 6, note: 'Gang 2' },
  'switch_3': { zigbee: 'onoff.switch_3', cluster: 6, note: 'Gang 3' },
  'switch_led': { zigbee: 'onoff', cluster: 6, note: 'LED control' },
  
  // Dimmer/Brightness
  'bright_value': { zigbee: 'dim', cluster: 8, note: 'Brightness 0-100%' },
  'bright_value_v2': { zigbee: 'dim', cluster: 8, note: 'Brightness v2' },
  
  // Color
  'colour_data': { zigbee: 'light_hue + light_saturation', cluster: 768, note: 'HSV color' },
  'colour_data_v2': { zigbee: 'light_hue + light_saturation', cluster: 768, note: 'HSV v2' },
  'temp_value': { zigbee: 'light_temperature', cluster: 768, note: 'Color temperature' },
  'temp_value_v2': { zigbee: 'light_temperature', cluster: 768, note: 'Color temp v2' },
  
  // Sensors
  'temp_current': { zigbee: 'measure_temperature', cluster: 1026, note: 'Temperature °C' },
  'humidity_value': { zigbee: 'measure_humidity', cluster: 1029, note: 'Humidity %' },
  'va_battery': { zigbee: 'measure_battery', cluster: 1, note: 'Battery %' },
  'battery_percentage': { zigbee: 'measure_battery', cluster: 1, note: 'Battery %' },
  'bright_value_sensor': { zigbee: 'measure_luminance', cluster: 1024, note: 'Luminance lux' },
  
  // Power monitoring
  'cur_power': { zigbee: 'measure_power', cluster: 2820, note: 'Power W' },
  'cur_current': { zigbee: 'measure_current', cluster: 2820, note: 'Current A' },
  'cur_voltage': { zigbee: 'measure_voltage', cluster: 2820, note: 'Voltage V' },
  'add_ele': { zigbee: 'meter_power', cluster: 1794, note: 'Energy kWh' },
  
  // Alarms/Sensors
  'pir': { zigbee: 'alarm_motion', cluster: 1280, note: 'Motion detected' },
  'doorcontact_state': { zigbee: 'alarm_contact', cluster: 1280, note: 'Contact open/close' },
  'watersensor_state': { zigbee: 'alarm_water', cluster: 1280, note: 'Water detected' },
  'smoke_sensor_state': { zigbee: 'alarm_smoke', cluster: 1280, note: 'Smoke detected' },
  'gas_sensor_state': { zigbee: 'alarm_co', cluster: 1280, note: 'Gas/CO detected' },
  'tamper_state': { zigbee: 'alarm_tamper', cluster: 1280, note: 'Tamper detected' },
  
  // Window coverings
  'position': { zigbee: 'windowcoverings_set', cluster: 258, note: 'Position 0-100%' },
  'percent_control': { zigbee: 'windowcoverings_set', cluster: 258, note: 'Control %' },
  'control': { zigbee: 'windowcoverings_state', cluster: 258, note: 'Open/Close/Stop' },
  
  // Thermostat
  'temp_set': { zigbee: 'target_temperature', cluster: 513, note: 'Target temp' },
  'mode': { zigbee: 'thermostat_mode', cluster: 513, note: 'Mode' },
  'work_state': { zigbee: 'thermostat_state', cluster: 513, note: 'State' },
};

/**
 * 🏷️ DEVICE IDENTIFICATION
 */
const DEVICE_PATTERNS = {
  zigbee: {
    models: [
      /^TS\d{4}[A-Z]?$/,  // TS0001, TS011F, TS0121, etc.
      /^_TZ\d{4}_[\w]+$/,  // _TZ3000_xxx, _TZ3400_xxx
      /^_TZE\d{3}_[\w]+$/, // _TZE200_xxx, _TZE204_xxx
      /^_TYZB\d{2}_[\w]+$/, // _TYZB01_xxx
    ],
    keywords: ['Zigbee', 'ZB-', 'ZG-', 'Zigbee 3.0'],
    brands: ['HOBEIAN', 'Lumi', 'Aqara'],
  },
  wifi: {
    keywords: ['WiFi', 'WIFI', 'Wi-Fi', 'Smart Life', 'Tuya Smart'],
    models: [/^WIF/, /^WIFI/],
  }
};

/**
 * Identifies if device is Zigbee or WiFi
 */
function identifyDeviceType(deviceInfo) {
  const { model = '', manufacturer = '', description = '' } = deviceInfo;
  const combined = `${model} ${manufacturer} ${description}`.toLowerCase();
  
  // Check Zigbee patterns
  for (const pattern of DEVICE_PATTERNS.zigbee.models) {
    if (pattern.test(model)) {
      return {
        type: 'zigbee',
        confidence: 'high',
        compatible: true,
        app: 'Universal Tuya Zigbee',
        note: '✅ Fully supported locally'
      };
    }
  }
  
  for (const keyword of DEVICE_PATTERNS.zigbee.keywords) {
    if (combined.includes(keyword.toLowerCase())) {
      return {
        type: 'zigbee',
        confidence: 'medium',
        compatible: true,
        app: 'Universal Tuya Zigbee',
        note: '✅ Likely supported (verify model)'
      };
    }
  }
  
  // Check WiFi patterns
  for (const pattern of DEVICE_PATTERNS.wifi.models) {
    if (pattern.test(model)) {
      return {
        type: 'wifi',
        confidence: 'high',
        compatible: false,
        app: 'LocalTuya (community)',
        note: '⚠️ WiFi device - cloud or local WiFi required'
      };
    }
  }
  
  for (const keyword of DEVICE_PATTERNS.wifi.keywords) {
    if (combined.includes(keyword.toLowerCase())) {
      return {
        type: 'wifi',
        confidence: 'medium',
        compatible: false,
        app: 'LocalTuya or Tuya Cloud (broken)',
        note: '⚠️ WiFi device - not supported by Ultimate Zigbee'
      };
    }
  }
  
  return {
    type: 'unknown',
    confidence: 'low',
    compatible: false,
    note: '❓ Unable to determine - check device packaging'
  };
}

/**
 * Converts Tuya Cloud capabilities to Zigbee equivalents
 */
function convertCapabilities(cloudCapabilities) {
  const conversions = [];
  
  for (const cloudCap of cloudCapabilities) {
    const mapping = CAPABILITY_MAPPING[cloudCap];
    
    if (mapping) {
      conversions.push({
        cloud: cloudCap,
        zigbee: mapping.zigbee,
        cluster: mapping.cluster,
        note: mapping.note,
        supported: true,
      });
    } else {
      conversions.push({
        cloud: cloudCap,
        zigbee: null,
        cluster: null,
        note: 'Unknown mapping',
        supported: false,
      });
    }
  }
  
  return conversions;
}

/**
 * Finds matching driver based on capabilities
 */
function findMatchingDriver(zigbeeCapabilities) {
  const DRIVERS_DIR = path.join(__dirname, '../../drivers');
  
  if (!fs.existsSync(DRIVERS_DIR)) {
    return { found: false, drivers: [] };
  }
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() &&
    !d.startsWith('.') &&
    !d.includes('archived')
  );
  
  const matches = [];
  
  for (const driverId of drivers) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      if (!driver.capabilities) continue;
      
      // Count matching capabilities
      const driverCaps = driver.capabilities.map(c => c.split('.')[0]); // Remove sub-caps
      const zigbeeCaps = zigbeeCapabilities.filter(c => c !== null);
      
      const matchCount = zigbeeCaps.filter(cap => 
        driverCaps.includes(cap.split(' ')[0]) // Handle "light_hue + light_saturation"
      ).length;
      
      if (matchCount > 0) {
        matches.push({
          driverId,
          name: driver.name?.en || driverId,
          matchCount,
          totalCaps: driverCaps.length,
          matchPercent: Math.round((matchCount / zigbeeCaps.length) * 100),
          capabilities: driverCaps,
        });
      }
    } catch (err) {}
  }
  
  // Sort by match percentage
  matches.sort((a, b) => b.matchPercent - a.matchPercent);
  
  return {
    found: matches.length > 0,
    drivers: matches.slice(0, 5), // Top 5 matches
  };
}

/**
 * Generates migration guide
 */
function generateMigrationGuide(deviceInfo, identification, conversions, matchingDrivers) {
  const guide = {
    device: deviceInfo,
    identification,
    compatibility: {
      type: identification.type,
      supported: identification.compatible,
      app: identification.app,
      confidence: identification.confidence,
    },
    capabilities: {
      cloud: deviceInfo.capabilities || [],
      conversions,
      zigbeeCapabilities: conversions.filter(c => c.supported).map(c => c.zigbee),
      unsupported: conversions.filter(c => !c.supported).map(c => c.cloud),
    },
    recommendedDrivers: matchingDrivers.drivers,
    migrationSteps: []
  };
  
  // Generate migration steps
  if (identification.type === 'zigbee' && identification.compatible) {
    guide.migrationSteps = [
      '1. ✅ Device is Zigbee compatible',
      '2. Install "Universal Tuya Zigbee" app from Homey App Store',
      '3. Open Homey app → Add Device',
      '4. Select category matching your device',
      `5. Recommended driver: ${matchingDrivers.drivers[0]?.name || 'Auto-detect'}`,
      '6. Put device in pairing mode (usually hold button 5s)',
      '7. Wait for Homey to detect device',
      '8. Test functionality',
      '9. ✅ Enjoy 100% local control!',
    ];
  } else if (identification.type === 'wifi') {
    guide.migrationSteps = [
      '1. ⚠️  Device is WiFi (not Zigbee)',
      '2. ❌ NOT supported by Ultimate Zigbee app',
      '3. Options:',
      '   a) Use LocalTuya app (WiFi local, no cloud)',
      '   b) Replace with Zigbee equivalent',
      '   c) Use different brand (Shelly, Sonoff)',
      '4. Recommendation: Buy Zigbee devices for better local control',
    ];
  } else {
    guide.migrationSteps = [
      '1. ❓ Device type unknown',
      '2. Check device packaging for:',
      '   - "Zigbee 3.0" logo → Compatible',
      '   - "WiFi" only → Not compatible',
      '3. Check model number:',
      '   - TS**** or _TZ**** → Zigbee',
      '   - WIF**** or WIFI**** → WiFi',
      '4. If Zigbee → Follow Zigbee migration steps',
      '5. If WiFi → Consider alternatives',
    ];
  }
  
  return guide;
}

/**
 * 🚀 MAIN CONVERTER
 */
function convertDevice(deviceInfo) {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     🔄 TUYA CLOUD TO LOCAL CONVERTER           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Device Information:');
  console.log(`   Model: ${deviceInfo.model || 'Unknown'}`);
  console.log(`   Manufacturer: ${deviceInfo.manufacturer || 'Unknown'}`);
  console.log(`   Description: ${deviceInfo.description || 'Unknown'}`);
  console.log(`   Capabilities: ${(deviceInfo.capabilities || []).join(', ')}\n`);
  
  // Step 1: Identify type
  console.log('🔍 Step 1: Identifying device type...');
  const identification = identifyDeviceType(deviceInfo);
  console.log(`   Type: ${identification.type.toUpperCase()}`);
  console.log(`   Confidence: ${identification.confidence}`);
  console.log(`   Compatible: ${identification.compatible ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   App: ${identification.app}`);
  console.log(`   Note: ${identification.note}\n`);
  
  // Step 2: Convert capabilities
  console.log('🔄 Step 2: Converting capabilities...');
  const conversions = convertCapabilities(deviceInfo.capabilities || []);
  console.log(`   Cloud capabilities: ${conversions.length}`);
  console.log(`   Supported: ${conversions.filter(c => c.supported).length}`);
  console.log(`   Unsupported: ${conversions.filter(c => !c.supported).length}\n`);
  
  conversions.forEach(conv => {
    if (conv.supported) {
      console.log(`   ✅ ${conv.cloud} → ${conv.zigbee} (Cluster ${conv.cluster})`);
    } else {
      console.log(`   ❌ ${conv.cloud} → Unknown`);
    }
  });
  
  // Step 3: Find matching drivers
  console.log('\n🔍 Step 3: Finding matching drivers...');
  const zigbeeCaps = conversions.filter(c => c.supported).map(c => c.zigbee);
  const matchingDrivers = findMatchingDriver(zigbeeCaps);
  
  if (matchingDrivers.found) {
    console.log(`   Found ${matchingDrivers.drivers.length} matching drivers:\n`);
    matchingDrivers.drivers.forEach((driver, i) => {
      console.log(`   ${i + 1}. ${driver.name}`);
      console.log(`      Match: ${driver.matchPercent}% (${driver.matchCount}/${zigbeeCaps.length} capabilities)`);
      console.log(`      Driver ID: ${driver.driverId}\n`);
    });
  } else {
    console.log('   ⚠️  No exact match found (use generic driver)\n');
  }
  
  // Step 4: Generate guide
  console.log('📝 Step 4: Generating migration guide...');
  const guide = generateMigrationGuide(deviceInfo, identification, conversions, matchingDrivers);
  
  console.log('\n📋 MIGRATION STEPS:');
  guide.migrationSteps.forEach(step => console.log(`   ${step}`));
  
  // Save guide
  const guidePath = path.join(__dirname, '../../docs/conversion', `migration_${deviceInfo.model || 'device'}.json`);
  const guideDir = path.dirname(guidePath);
  
  if (!fs.existsSync(guideDir)) {
    fs.mkdirSync(guideDir, { recursive: true });
  }
  
  fs.writeFileSync(guidePath, JSON.stringify(guide, null, 2));
  console.log(`\n💾 Guide saved to: ${guidePath}`);
  
  console.log('\n✅ CONVERSION COMPLETE!\n');
  
  return guide;
}

/**
 * Example usage
 */
if (require.main === module) {
  // Example 1: Zigbee Motion Sensor
  const exampleZigbee = {
    model: 'TS0202',
    manufacturer: '_TZ3000_mmtwjmaq',
    description: 'PIR Motion Sensor',
    capabilities: ['pir', 'va_battery', 'bright_value_sensor']
  };
  
  // Example 2: WiFi Smart Plug
  const exampleWiFi = {
    model: 'WIFI-PLUG-001',
    manufacturer: 'Tuya',
    description: 'Smart Plug WiFi',
    capabilities: ['switch_1', 'cur_power', 'cur_current', 'add_ele']
  };
  
  // Example 3: Zigbee Switch
  const exampleSwitch = {
    model: 'TS0001',
    manufacturer: '_TZ3000_kqvb5akv',
    description: '1 Gang Switch',
    capabilities: ['switch_1']
  };
  
  console.log('Running example conversions...\n');
  console.log('═'.repeat(60));
  
  convertDevice(exampleZigbee);
  
  console.log('\n' + '═'.repeat(60) + '\n');
  
  convertDevice(exampleWiFi);
  
  console.log('\n' + '═'.repeat(60) + '\n');
  
  convertDevice(exampleSwitch);
}

module.exports = {
  identifyDeviceType,
  convertCapabilities,
  findMatchingDriver,
  generateMigrationGuide,
  convertDevice,
};
