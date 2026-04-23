const fs = require('fs');
const path = require('path');

// Fix "Missing Capability Listener" in devices by ensuring registerCapabilityListener
// is called BEFORE super.onNodeInit(args) in onNodeInit

const filesToFix = [
  'drivers/air_purifier/device.js',
  'drivers/bulb_rgb/device.js',
  'drivers/bulb_rgbw/device.js',
  'drivers/button_wireless_4/device.js',
  'drivers/floor_heating_thermostat/device.js',
  'drivers/garage_door/device.js',
  'drivers/garage_door_opener/device.js',
  'drivers/hvac_controller/device.js',
  'drivers/motion_sensor_radar_mmwave/device.js',
  'drivers/pet_feeder_zigbee/device.js',
  'drivers/radiator_valve/device.js',
  'drivers/radiator_valve_zigbee/device.js',
  'drivers/siren/device.js',
  'drivers/smart_lcd_thermostat/device.js',
  'drivers/smart_scene_panel/device.js',
  'drivers/switch_2gang/device.js',
  'drivers/switch_3gang/device.js',
  'drivers/switch_4gang/device.js',
  'drivers/switch_dimmer_1gang/device.js',
  'drivers/switch_wall_5gang/device.js',
  'drivers/switch_wall_6gang/device.js',
  'drivers/switch_wall_7gang/device.js',
  'drivers/switch_wall_8gang/device.js',
  'drivers/usb_outlet_advanced/device.js',
  'drivers/wall_curtain_switch/device.js',
  'drivers/wall_dimmer_1gang_1way/device.js'
];

let fixedCount = 0;

for (const file of filesToFix) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // A simplistic approach: move super.onNodeInit down to just before 'this.log(XXX Initialized)'
  // or at least after the bulk of registerCapabilityListeners.
  // Because the exact structure varies, we need a robust regex or careful replacement.
  
  // Find super.onNodeInit
  const superInitMatch = content.match(/\s*await\s+super\.onNodeInit\s*\([^)]*\)\s*;/);
  if (superInitMatch) {
    const superInitStr = superInitMatch[0];
    
    // Check if it's inside a try/catch block (like switch_2gang)
    const tryCatchPattern = new RegExp(`try\\s*\\{\\s*${superInitStr.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\s*\\}\\s*catch\\s*\\([^)]*\\)\\s*\\{[^}]*\\}`)       ;
    const matchTryCatch = content.match(tryCatchPattern);
    
    let toMove = matchTryCatch ? matchTryCatch[0] : superInitStr      ;
    
    // Find the last registerCapabilityListener
    let lastListenerIndex = -1;
    let match;
    const regex = /this\.registerCapabilityListener[^\n]*\n?/g       ;
    while ((match = regex.exec(content)) !== null) {
      lastListenerIndex = regex.lastIndex;
    }
    
    if (lastListenerIndex !== -1 && content.indexOf(toMove) < lastListenerIndex) {
       // Remove it from its original position
       content = content.replace(toMove, '');
       
       // Insert it after the last listener
       const insertIndex = lastListenerIndex;
       const before = content.substring(0, insertIndex);
       const after = content.substring(insertIndex);
       
       content = before + '\n    ' + toMove.trim() + '\n' + after;
       
       fs.writeFileSync(fullPath, content);
       console.log(` Fixed order in ${file}`);
       fixedCount++;
    } else {
       console.log(` Could not automatically fix ${file} (needs manual review)`);
    }
  }
}

console.log(`\n Fixed order in ${fixedCount} files`);
