// apply-safe-timers.js
const fs = require('fs');
const path = require('path');

const files = [
  { file: 'lib/devices/UnifiedSensorBase.js', import: '../utils/safe-timers' },
  { file: 'lib/tuya/TuyaZigbeeDevice.js', import: '../utils/safe-timers' },
  { file: 'lib/devices/ButtonDevice.js', import: '../utils/safe-timers' },
  { file: 'drivers/sensor_presence_radar/device.js', import: '../../../lib/utils/safe-timers' },
  { file: 'lib/helpers/DeviceIdentificationDatabase.js', import: '../utils/safe-timers' },
  { file: 'lib/mixins/SmartFeatureEmulationMixin.js', import: '../utils/safe-timers' }
];

for (const { file, import: importPath } of files) {
  if (!fs.existsSync(file)) {
    console.log(file + ': SKIP (not found)');
    continue;
  }
  let c = fs.readFileSync(file, 'utf8');
  const before = c;
  // Add require if missing
  if (!c.includes('safe-timers')) {
    // Find first require and add after it
    const m = c.match(/^(const .+ = require\(['"][^'"]+['"]\);)/m);
    if (m) {
      c = c.replace(m[1], m[1] + '\nconst { safeSetTimeout, safeClearTimeout, isDestroyed } = require(\'' + importPath + '\');');
    }
  }
  let count = 0;
  c = c.replace(/this\.homey\.setTimeout\(/g, () => { count++; return 'safeSetTimeout(this, '; });
  c = c.replace(/this\.homey\.clearTimeout\(/g, () => { count++; return 'safeClearTimeout(this, '; });
  if (c !== before) {
    fs.writeFileSync(file, c);
    console.log(file + ': replaced ' + count + ' calls');
  } else {
    console.log(file + ': no changes');
  }
}
