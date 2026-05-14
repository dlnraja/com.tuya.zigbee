const fs = require('fs');
const path = require('path');
const driversDir = path.resolve(__dirname, '../../drivers');

const MAINS_PATTERNS = [
  'switch', 'plug', 'socket', 'dimmer', 'wall_switch', 'wall_dimmer',
  'heater', 'light', 'bulb', 'relay', 'outlet', 'power_strip'
];

function isMainsPowered(driverName) {
  return MAINS_PATTERNS.some(p => driverName.toLowerCase().includes(p));
}

function processFile(filePath, driverName) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Add mainsPowered getter if missing
  if (!content.includes('get mainsPowered()')) {
    const classMatch = content.match(/class\s+\w+\s+extends/);
    if (classMatch) {
      const insertionPoint = content.indexOf('{', classMatch.index) + 1;
      content = content.slice(0, insertionPoint) + '\n\n  get mainsPowered() { return true; }' + content.slice(insertionPoint);
      changed = true;
    }
  }

  // 2. Ensure super.onNodeInit is called (already handled by apply-antigravity.js usually, but good to check)
  // 3. The removal of capabilities is handled by BatteryMixin -> UnifiedBatteryHandler if mainsPowered is true.

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[BATTERY-FIX] Standardized mains power for: ${driverName}`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isMainsPowered(entry.name)) {
        const deviceJs = path.join(fullPath, 'device.js');
        if (fs.existsSync(deviceJs)) {
          processFile(deviceJs, entry.name);
        }
      }
    }
  }
}

console.log('Starting Battery Standardization for mains-powered fleet...');
walk(driversDir);
console.log('Battery standardization complete.');
