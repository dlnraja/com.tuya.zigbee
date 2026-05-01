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
  
  // Fix 1: Missing } for getDeviceById
  content = content.replace(
    /(return null;\s*\n\s*\})\s*\n(\s*async onInit\(\))/,
    '$1\n    }\n$2'
  );

  // Fix 2: Replace ALL corrupted IIFE chains with null
  // Pattern: (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); ...
  // This is a chain of IIFEs that should just be null
  content = content.replace(
    /\(\(\) => \{ try \{ return ; \} catch \(e\) \{ return null; \} \}\)\(\); \} catch \(e\) \{ return null; \} \}\)\(\);/g,
    'null;'
  );
  // Clean up any remaining IIFE fragments
  content = content.replace(
    /\(\(\) => \{ try \{ return ; \} catch \(e\) \{ return null; \} \}\)\(\);/g,
    'null;'
  );
  // Remove orphan "} catch (e) { return null; } })();" fragments
  content = content.replace(
    /\s*\} catch \(e\) \{ return null; \} \}\)\(\);/g,
    ''
  );

  // Fix 3: Replace corrupted reg/r function definitions
  content = content.replace(
    /const (?:reg|r) =?\s*\(?(?:id|i),?\s*(?:fn)?\)?\s*=>\s*\{[^\n]*Removed corrupted nested block[^\n]*/g,
    `const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) card.registerRunListener(fn);
      } catch (e) { this.log('[Flow]', id, e.message); }
    };`
  );

  // Fix 4: Remove orphan catch blocks
  content = content.replace(/\n\s*\} catch \(e\) \{ this\.log\('\[Flow\]', (?:id|i), e\.message\);\s*\}\n/g, '\n');
  content = content.replace(/\n\s*\}catch\(e\)\{this\.log\('\[Flow\]',(?:id|i),e\.message\);\s*\}\n/g, '\n');

  // Fix 5: Remove "Removed corrupted nested block" comments
  content = content.replace(/\s*\/\/ Removed corrupted nested block[^\n]*/g, '');

  // Fix 6: Ensure class is properly closed
  if (content.includes('module.exports')) {
    let braceCount = 0;
    const lines = content.split('\n');
    let lastExportLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('module.exports')) lastExportLine = i;
      if (i < lastExportLine || lastExportLine === -1) {
        for (const ch of lines[i]) {
          if (ch === '{') braceCount++;
          if (ch === '}') braceCount--;
        }
      }
    }
    
    if (braceCount > 0 && lastExportLine > 0) {
      const closingBraces = '}\n'.repeat(braceCount);
      const exportLines = lines.splice(lastExportLine);
      content = lines.join('\n') + '\n' + closingBraces + exportLines.join('\n');
    }
  }

  // Fix 7: Clean up excessive blank lines
  content = content.replace(/\n{4,}/g, '\n\n');

  fs.writeFileSync(fp, content, 'utf8');
  
  try {
    execSync(`node -c "${fp}"`, { stdio: 'pipe' });
    fixed++;
    console.log('✅ Fixed:', dir);
  } catch (e) {
    const line = e.message.match(/:(\d+)/)?.[1];
    const errLine = e.message.split('\n')[2]?.trim() || '';
    console.log('❌ Still broken:', dir, '- line', line, '-', errLine.substring(0, 60));
  }
});

console.log('\nFixed:', fixed, '/', broken.length);