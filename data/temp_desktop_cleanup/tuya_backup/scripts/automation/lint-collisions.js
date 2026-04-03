/**
 * Collision Lint Script - Detects manufacturerName+productId collisions
 * Run: node scripts/automation/lint-collisions.js
 */
const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../../drivers');
const collisions = new Map();

fs.readdirSync(driversDir).forEach(driver => {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const mfrs = data.zigbee?.manufacturerName || [];
    const pids = data.zigbee?.productId || [];
    
    mfrs.forEach(mfr => {
      pids.forEach(pid => {
        const key = `${mfr}|${pid}`;
        if (!collisions.has(key)) collisions.set(key, []);
        collisions.get(key).push(driver);
      });
    });
  } catch (e) { console.error(`Error parsing ${driver}:`, e.message); }
});

let critical = 0, total = 0;
collisions.forEach((drivers, key) => {
  const unique = [...new Set(drivers)];
  if (unique.length <= 1) return;
  total++;
  
  const hasSensor = unique.some(d => /sensor|detector/.test(d));
  const hasSwitch = unique.some(d => /switch|plug|breaker/.test(d));
  
  if (hasSensor && hasSwitch) {
    critical++;
    console.log(`❌ CRITICAL: ${key} → ${unique.join(', ')}`);
  }
});

console.log(`\n📊 Total: ${total} collisions | Critical: ${critical}`);
process.exit(critical > 0 ? 1 : 0);
