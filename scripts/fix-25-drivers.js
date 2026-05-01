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
  
  // Fix 1: Add missing } for getDeviceById before async onInit
  // Pattern: "return null;\n      }\n  async onInit"
  content = content.replace(
    /(return null;\s*\n\s*\})\s*\n(\s*async onInit\(\))/,
    '$1\n    }\n$2'
  );

  // Fix 2: Replace corrupted reg function with clean version
  // Pattern: const reg = (id, fn) => { // Removed corrupted nested block ... }.registerRunListener(fn)
  // Then: } catch (e) { this.log('[Flow]', id, e.message);   }
  content = content.replace(
    /const reg = \(id, fn\) => \{[^\n]*Removed corrupted nested block[^\n]*\n[\s\n]*\} catch \(e\) \{ this\.log\('\[Flow\]', id, e\.message\);\s*\}/g,
    `const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) card.registerRunListener(fn);
      } catch (e) { this.log('[Flow]', id, e.message); }
    }`
  );

  // Fix 3: Replace corrupted r= function
  content = content.replace(
    /const r=\(i,fn\)=>\{[^\n]*Removed corrupted nested block[^\n]*\n[\s\n]*\} catch \(e\) \{ this\.log\('\[Flow\]', id, e\.message\);\s*\}/g,
    `const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) card.registerRunListener(fn);
      } catch (e) { this.log('[Flow]', id, e.message); }
    }`
  );

  // Fix 4: Remove remaining "Removed corrupted nested block" comments
  content = content.replace(/\s*\/\/ Removed corrupted nested block[^\n]*/g, '');

  // Fix 5: Clean up excessive blank lines
  content = content.replace(/\n{4,}/g, '\n\n');

  fs.writeFileSync(fp, content, 'utf8');
  
  try {
    execSync(`node -c "${fp}"`, { stdio: 'pipe' });
    fixed++;
    console.log('✅ Fixed:', dir);
  } catch (e) {
    const line = e.message.match(/:(\d+)/)?.[1];
    console.log('❌ Still broken:', dir, '- line', line);
  }
});

console.log('\nFixed:', fixed, '/', broken.length);