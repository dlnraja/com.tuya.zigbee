const fs = require('fs');
const path = require('path');

const ROOT = 'c:/Users/HP/Desktop/homey app/tuya_repair';
const file = path.join(ROOT, 'lib/devices/HybridSensorBase.js');

let code = fs.readFileSync(file, 'utf8');
let original = code;

// 1. Remove deeply nested wrappers (recursive approach)
function unwrap(input) {
  let current = input;
  let changed = true;
  while (changed) {
    let before = current;
    // Regex matches: (() => { try { return [INNER]; } catch (e) { [ERROR LOG] return null; } })()
    // We must handle cases where INNER is itself another wrapper.
    // The lookahead ensures we don't match more than one level at once if they are nested but not in return.
    // Wait! In our case they ARE exactly in return.
    current = current.replace(/\(\(\) => \{ try \{ return ([\s\S]+?); \} catch \(e\) \{ [^\}]*? \} \}\)\(\)/g, '$1');
    if (before === current) changed = false;
  }
  return current;
}

code = unwrap(code);

// 2. Fix known broken blocks (like the button press detection one)
// Restore .trigger(this, {
code = code.replace(/(\.getDeviceTriggerCard\('button_pressed'\))\s*;\s*button: dp.toString\(\),/g, '$1.trigger(this, { button: dp.toString(),');

// Fix naked getDeviceTriggerCard() in lux detection
// await this.homey.flow.getDeviceTriggerCard().trigger(this, { lux: value });
code = code.replace(/this\.homey\.flow\.getDeviceTriggerCard\(\)\.trigger\(this, \{ lux: value \}\)/g, "this.homey.flow.getDeviceTriggerCard('measure_luminance_changed').trigger(this, { lux: value })");

// General fix for naked getDeviceTriggerCard()
code = code.replace(/\.getDeviceTriggerCard\(\)/g, ".getDeviceTriggerCard('unknown_trigger')");

if (code !== original) {
  fs.writeFileSync(file, code);
  console.log('✅ Cleaned up HybridSensorBase.js');
} else {
  console.log('No changes needed.');
}
