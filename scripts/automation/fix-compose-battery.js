const fs = require('fs');
const path = require('path');
const driversDir = path.resolve(__dirname, '../../drivers');

function processFile(filePath, driverName) {
  let changed = false;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const compose = JSON.parse(content);

    if (compose.capabilities) {
      const hasMeasure = compose.capabilities.includes('measure_battery');
      const hasAlarm = compose.capabilities.includes('alarm_battery');

      if (hasMeasure && hasAlarm) {
        // Remove alarm_battery (SDK3 rule: don't have both)
        compose.capabilities = compose.capabilities.filter(c => c !== 'alarm_battery');
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(compose, null, 2), 'utf8');
      console.log(`[COMPOSE-FIX] Removed dual battery capability from: ${driverName}`);
    }
  } catch (err) {
    console.error(`[ERROR] Processing ${filePath}: ${err.message}`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const composeFile = path.join(fullPath, 'driver.compose.json');
      if (fs.existsSync(composeFile)) {
        processFile(composeFile, entry.name);
      }
    }
  }
}

console.log('Starting driver.compose.json battery cleanup...');
walk(driversDir);
console.log('Cleanup complete.');
