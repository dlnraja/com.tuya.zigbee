const fs = require('fs');
const path = require('path');
const glob = require('glob').sync;

const driverDirs = glob('drivers/wifi_*').filter(f => fs.lstatSync(f).isDirectory());

const commonTuyaDps = {
  'onoff': '1',
  'onoff.1': '1',
  'onoff.2': '2',
  'onoff.3': '3',
  'onoff.4': '4',
  'dim': '22',
  'light_temperature': '23',
  'light_hue': '24', // special converter needed usually, but basic is 24
  'light_mode': '21',
  'measure_temperature': '3',
  'target_temperature': '2',
  'measure_humidity': '4',
  'measure_battery': '6',
  'windowcoverings_state': '1',
  'windowcoverings_set': '2',
  'measure_power': '19',
  'measure_voltage': '20',
  'measure_current': '18',
  'alarm_motion': '1',
  'alarm_contact': '1',
  'alarm_smoke': '1',
  'alarm_water': '1'
};

const customOverrides = {
  'wifi_light': {
    'onoff': '20',
    'dim': '22',
    'light_temperature': '23',
    'light_hue': '24',
    'light_mode': '21'
  },
  'wifi_dimmer': {
    'onoff': '1',
    'dim': '2'
  },
  'wifi_led_strip': {
    'onoff': '20',
    'dim': '22',
    'light_temperature': '23'
  }
};

let modifiedCount = 0;

for (const dir of driverDirs) {
  const composePath = path.join(dir, 'driver.compose.json');
  const devicePath = path.join(dir, 'device.js');
  
  if (!fs.existsSync(composePath) || !fs.existsSync(devicePath)) continue;

  // Read capabilities
  let composeData;
  try {
    composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch(e) { continue; }

  const driverName = path.basename(dir);
  const isEwelinkOrSonoff = driverName.includes('ewelink') || driverName.includes('sonoff') || driverName.includes('camera') || driverName.includes('generic');
  if (isEwelinkOrSonoff) continue; // Let's skip sonoff/ewelink because they have different engines.

  let capabilities = composeData.capabilities || [];
  
  // Decide DPs
  let dpLines = [];
  const overrides = customOverrides[driverName] || commonTuyaDps;

  for (const cap of capabilities) {
    let dp = overrides[cap] || commonTuyaDps[cap];
    
    // Fallback guesses
    if (!dp) {
      if (cap.includes('onoff')) dp = '1';
      else if (cap.includes('measure_pm25')) dp = '2'; // standard purifier
      else if (cap.includes('fan_speed')) dp = '3';
      else if (cap.includes('alarm_')) dp = '1';
    }

    if (dp) {
      if (cap.includes('onoff') || cap.includes('alarm')) {
          dpLines.push(`      '${dp}': { capability: '${cap}', transform: (v) => !!v, reverseTransform: (v) => !!v }`);
      } else if (cap.includes('temperature') || cap.includes('humidity') || cap.includes('power') || cap.includes('voltage') || cap.includes('current')) {
          dpLines.push(`      '${dp}': { capability: '${cap}', transform: (v) => (v / 10), reverseTransform: (v) => (v * 10) }`);
      } else {
          dpLines.push(`      '${dp}': { capability: '${cap}' }`);
      }
    }
  }

  if (dpLines.length === 0) continue;

  const dpMappingCode = `
  get dpMappings() {
    return {
${dpLines.join(',\n')}
    };
  }
`;

  let deviceCode = fs.readFileSync(devicePath, 'utf8');
  
  // Skip if already has capabilityMap or dpMappings
  if (deviceCode.includes('get dpMappings') || deviceCode.includes('get capabilityMap')) {
    continue;
  }
  
  // Insert dpMappings into the class
  // It matches "class X extends TuyaLocalDevice {" or similar
  const classMatch = deviceCode.match(/class\s+[A-Za-z0-9_]+\s+extends\s+[A-Za-z0-9_.]+\s*\{/);
  if (classMatch) {
    const insertPos = classMatch.index + classMatch[0].length;
    deviceCode = deviceCode.slice(0, insertPos) + dpMappingCode + deviceCode.slice(insertPos);
    fs.writeFileSync(devicePath, deviceCode);
    console.log(`Updated ${driverName}`);
    modifiedCount++;
  }
}

console.log(`Done! Modified ${modifiedCount} files.`);
