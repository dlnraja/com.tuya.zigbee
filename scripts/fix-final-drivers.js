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
  if (!fs.existsSync(fp)) return;
  
  // Restore from HEAD first
  try { execSync(`git checkout HEAD -- "${fp}"`, { stdio: 'pipe' }); } catch(e) {}
  
  let content = fs.readFileSync(fp, 'utf8');
  
  // Step 1: Fix missing } for getDeviceById
  content = content.replace(
    /(return null;\s*\n\s*\})\s*\n(\s*async onInit\(\))/,
    '$1\n    }\n$2'
  );

  // Step 2: Replace corrupted reg/r function definition + orphan catch
  // Match the entire corrupted block from "const reg = " or "const r=" through the orphan catch
  content = content.replace(
    /const (?:reg|r) =?\s*\(?(?:id|i),?\s*(?:fn)?\)?\s*=>\s*\{[^\n]*Removed corrupted nested block[^\n]*\n[\s\n]*(?:\} catch \(e\) \{ this\.log\('\[Flow\]', (?:id|i), e\.message\);\s*\})?/g,
    `const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) card.registerRunListener(fn);
      } catch (e) { this.log('[Flow]', id, e.message); }
    };`
  );

  // Step 3: Remove any remaining "Removed corrupted nested block" comments
  content = content.replace(/\s*\/\/ Removed corrupted nested block[^\n]*/g, '');

  // Step 4: Remove orphan "} catch (e) { this.log('[Flow]', id, e.message); }" lines
  content = content.replace(/\n\s*\} catch \(e\) \{ this\.log\('\[Flow\]', id, e\.message\);\s*\}\n/g, '\n');

  // Step 5: Ensure class is properly closed before module.exports
  // Check if module.exports exists and if class brace count is balanced
  if (content.includes('module.exports')) {
    let braceCount = 0;
    const lines = content.split('\n');
    let lastExportLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('module.exports')) lastExportLine = i;
      // Count braces only for non-export lines
      if (i < lastExportLine || lastExportLine === -1) {
        for (const ch of line) {
          if (ch === '{') braceCount++;
          if (ch === '}') braceCount--;
        }
      }
    }
    
    // If braceCount > 0, we need to add closing braces before module.exports
    if (braceCount > 0 && lastExportLine > 0) {
      const closingBraces = '}\n'.repeat(braceCount);
      lines.splice(lastExportLine, 0, closingBraces);
      content = lines.join('\n');
    }
  }

  // Step 6: Clean up excessive blank lines
  content = content.replace(/\n{4,}/g, '\n\n');

  fs.writeFileSync(fp, content, 'utf8');
  
  try {
    execSync(`node -c "${fp}"`, { stdio: 'pipe' });
    fixed++;
    console.log('✅ Fixed:', dir);
  } catch (e) {
    const line = e.message.match(/:(\d+)/)?.[1];
    const err = e.message.split('\n')[2] || '';
    console.log('❌ Still broken:', dir, '- line', line, err.trim());
  }
});

console.log('\nFixed:', fixed, '/', broken.length);