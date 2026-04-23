const fs = require('fs');
const file = 'drivers/switch_3gang/device.js';
let content = fs.readFileSync(file, 'utf8');

// The issue states:
// "The device is now totally unresponsive. The App UI (device tiles) does not work anymore, and the Flow cards still don't work. The physical clicks also no longer trigger the 'WHEN' Flow cards."
// "When I try to use the Flow Action cards for this switch, it actually CRASHES the entire Universal Tuya Zigbee app."
// Wait, if it crashes on Flow Action, let's look at how _setGangOnOff is handled.

// Does Switch3GangDevice implement `requiresPerEndpointControl`? // Let's check what `isZclOnlyDevice` does in _setGangOnOff override.
const isZclOverrides = content.includes('_setGangOnOff(') || content.includes('setGangOnOff(' );
console.log('Overrides setGangOnOff in switch_3gang:', isZclOverrides);

