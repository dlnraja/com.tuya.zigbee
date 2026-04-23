/**
 * Collision Lint Script - Detects manufacturerName+productId collisions
 * Run: node scripts/automation/lint-collisions.js
 */
const { findConflicts } = require('../lib/drivers');

const collisions = findConflicts();
let critical = 0, total = 0;

collisions.forEach((drivers, key) => {
  const unique = [...new Set(drivers)];
  if (unique.length <= 1) return;
  total++;
  const hasSensor = unique.some(d => /sensor|detector/.test(d));
  const hasSwitch = unique.some(d => /switch|plug|breaker/.test(d));
  if (hasSensor && hasSwitch) {
    critical++;
    console.log(`\u274C CRITICAL: ${key} \u2192 ${unique.join(', ')}`);
  }
});

console.log(`\n\uD83D\uDCCA Total: ${total} collisions | Critical: ${critical}`);
process.exit(critical > 0 ? 1 : 0)      ;
