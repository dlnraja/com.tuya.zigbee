'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const broken = [
  'air_purifier_curtain','air_purifier_din','air_purifier_lcdtemphumidsensor',
  'air_purifier_motion','air_purifier_quality','air_purifier_sensor','button_wireless_usb',
  'device_air_purifier_climate','device_air_purifier_humidifier',
  'device_air_purifier_radiator','device_air_purifier_thermostat','device_din_rail_meter',
  'device_generic_tuya_universal','device_plug_smart','device_radiator_valve_smart',
  'device_radiator_valve_thermostat','lcdtemphumidsensor_plug_energy',
  'remote_button_wireless_plug','remote_button_wireless_usb',
  'sensor_climate_smart','sensor_contact_plug','sensor_lcdtemphumidsensor_soil',
  'sensor_motion_radar','sensor_presence_radar','thermostat_4ch'
];

let fixed = 0;

broken.forEach(dir => {
  const fp = path.join(__dirname, '..', 'drivers', dir, 'driver.js');
  if (!fs.existsSync(fp)) { console.log('⚠️ Not found:', dir); return; }
  
  let content = fs.readFileSync(fp, 'utf8');
  
  // Pattern: after "return null;" and closing brace of catch, missing closing brace of method
  // Look for: "return null;\n      }\n  async onInit" or similar
  // The issue is that getDeviceById method is not closed before async onInit
  
  // Fix: find "return null;" followed by "}" then "async onInit" without intermediate "}"
  const lines = content.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
    
    // Pattern: line is "}" (closing catch), next line is "async onInit()"
    if (line === '}' && nextLine.startsWith('async onInit(')) {
      // Check if there's a missing closing brace for the method
      // Count braces up to this point
      let braceCount = 0;
      for (let j = 0; j <= i; j++) {
        for (const ch of lines[j]) {
          if (ch === '{') braceCount++;
          if (ch === '}') braceCount--;
        }
      }
      
      // If braceCount > 0, we need to add closing braces
      if (braceCount > 0) {
        const indent = lines[i].match(/^(\s*)/)[1] || '    ';
        const closingBrace = indent.substring(0, Math.max(0, indent.length - 2)) + '}';
        lines.splice(i + 1, 0, closingBrace);
        modified = true;
        break;
      }
    }
  }
  
  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(fp, content, 'utf8');
    try {
      execSync(`node -c "${fp}"`, { stdio: 'pipe' });
      fixed++;
      console.log('✅ Fixed:', dir);
    } catch (e) {
      const line = e.message.match(/:(\d+)/)?.[1];
      console.log('⚠️ Partial fix:', dir, '- error at line', line);
    }
  } else {
    console.log('❌ No pattern found:', dir);
  }
});

console.log('\nFixed:', fixed, '/', broken.length);