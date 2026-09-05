#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ids = ['button_wireless_usb', 'dimmer_wall_switch', 'switch_usb_dongle'];
for (const id of ids) {
  const f = path.join('drivers', id, 'device.js');
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(
    /const\s*\{\s*ZigBeeDevice\s*\}\s*=\s*require\(['"]homey-zigbeedriver['"]\)\s*;?/,
    "const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');",
  );
  s = s.replace(/PhysicalButtonMixin\(\s*ZigBeeDevice\s*\)/g, 'PhysicalButtonMixin(TuyaZigbeeDevice)');
  s = s.replace(/extends\s+ZigBeeDevice\b/g, 'extends TuyaZigbeeDevice');
  fs.writeFileSync(f, s);
  console.log(id, {
    hasTuya: /TuyaZigbeeDevice/.test(s),
    stillBare: /\bZigBeeDevice\b/.test(s) && !/TuyaZigbeeDevice/.test(s.replace(/TuyaZigbeeDevice/g, '')),
  });
}
