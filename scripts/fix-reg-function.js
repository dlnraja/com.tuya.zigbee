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
  let modified = false;

  // Pattern 1: Corrupted reg function with IIFE chain
  // Replace: const reg = (id, fn) => { // Removed corrupted nested block ... }.registerRunListener(fn)
  // With: const reg = (id, fn) => { try { const card = this.homey.flow.getActionCard(id); if (card) card.registerRunListener(fn); } catch (e) { this.log('[Flow]', id, e.message); } };
  const regPattern = /const reg = \(id, fn\) => \{[^}]*Removed corrupted nested block[^}]*\}\)\(\)\.registerRunListener\(fn\)[^\n]*/;
  if (regPattern.test(content)) {
    content = content.replace(regPattern, 
      "const reg = (id, fn) => {\n      try {\n        const card = this.homey.flow.getActionCard(id);\n        if (card) card.registerRunListener(fn);\n      } catch (e) { this.log('[Flow]', id, e.message); }\n    };");
    modified = true;
  }

  // Pattern 2: Corrupted r function (shorter version)
  const rPattern = /const r=\(i,fn\)=>\{[^}]*Removed corrupted nested block[^}]*\}\)\(\)\.registerRunListener\(fn\)[^\n]*/;
  if (rPattern.test(content)) {
    content = content.replace(rPattern,
      "const reg = (id, fn) => {\n      try {\n        const card = this.homey.flow.getActionCard(id);\n        if (card) card.registerRunListener(fn);\n      } catch (e) { this.log('[Flow]', id, e.message); }\n    };");
    modified = true;
  }

  // Pattern 3: Dangling "} catch (e) { this.log('[Flow]', id, e.message); }" after the reg definition
  // Remove orphan catch blocks
  content = content.replace(/\n\s*\} catch \(e\) \{ this\.log\('\[Flow\]', id, e\.message\);\s*\}\n/g, '\n');

  // Pattern 4: Corrupted IIFE chains in try blocks for action cards
  // Replace: try {  const card = (() => { try { return ; } catch ... })(); 
  // With proper this.homey.flow.getActionCard call
  const iifePattern = /try\s*\{\s*const card = \(\(\) => \{ try \{ return ; \} catch \(e\) \{ return null; \} \}\)\(\);[^\n]*/g;
  if (iifePattern.test(content)) {
    // We need to find the action name from the context
    // Look for the error message in the catch block after
    content = content.replace(
      /try\s*\{\s*const card = \(\(\) => \{ try \{ return ; \} catch \(e\) \{ return null; \} \}\)\(\);[^\n]*\n(\s*if \(card\) \{[\s\S]*?\}\s*\}\s*\} catch \(e\) \{ this\.error\('Action ([^']+)':)/g,
      (match, after, actionName) => {
        return `try {\n      const card = this.homey.flow.getActionCard('${dir}_${actionName}');\n${after}`;
      }
    );
    modified = true;
  }

  if (modified) {
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
    // Try syntax check anyway
    try {
      execSync(`node -c "${fp}"`, { stdio: 'pipe' });
      console.log('✅ Already OK:', dir);
      fixed++;
    } catch (e) {
      console.log('❌ No pattern matched:', dir);
    }
  }
});

console.log('\nFixed:', fixed, '/', broken.length);