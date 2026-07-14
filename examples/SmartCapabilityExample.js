/**
 * SmartCapabilityExample.js — Reference driver using SmartCapability pattern
 *
 * This is NOT a real driver. It's a reference implementation showing
 * how to use SmartCapability for multi-source data with anti-flooding,
 * cross-validation, and fallback.
 *
 * Use this as a template when refactoring real drivers to use
 * SmartCapability. The key benefits:
 *  - Same capability set from multiple sources (ZCL, Tuya DP, voltage, etc.)
 *    is automatically deduplicated via cross-validation
 *  - Anti-flooding: debounce + hysteresis prevent excess setCapabilityValue
 *  - Fallback: when primary source fails, fall back to alternative
 *  - Logging: all decisions logged with reason
 *
 * Run as test: node examples/SmartCapabilityExample.js
 */
'use strict';

// Simulate a Homey Device
class FakeDevice {
  constructor() {
    this.values = {};
    this.setCalls = [];
  }
  setCapabilityValue(cap, val) {
    this.setCalls.push({ cap, val, ts: Date.now() });
    this.values[cap] = val;
    console.log(`  setCapabilityValue(${cap}, ${val})`);
  }
  log(msg) { console.log('  [device.log]', msg); }
}

// === Real pattern: use SmartCapability ===
const { SmartCapability, installSmartCapMixin } = require('../lib/data/SmartCapability');

// Apply mixin
class SmartDevice extends FakeDevice {}
installSmartCapMixin(SmartDevice);

async function main() {
  const dev = new SmartDevice();

  // Initialize smart capabilities
  // Battery: 5 sources (zcl primary, tuya-dp, voltage, cached, last-known)
  dev.battery = dev.smartCap('measure_battery', {
    sources: {
      'zcl': { priority: 1, weight: 0.4, ttl: 60000 },
      'tuya-dp': { priority: 2, weight: 0.3, ttl: 30000 },
      'voltage': { priority: 3, weight: 0.2, ttl: 30000 },
      'cached': { priority: 8, weight: 0.05, ttl: 86400000 },
      'last-known': { priority: 9, weight: 0.05, ttl: 604800000 },
    },
    debounceMs: 500,
    hysteresisMs: 30000,
  });

  // Temperature: 3 sources
  dev.temperature = dev.smartCap('measure_temperature', {
    sources: {
      'zcl': { priority: 1, weight: 0.6, ttl: 30000 },
      'tuya-dp': { priority: 2, weight: 0.3, ttl: 30000 },
      'cached': { priority: 8, weight: 0.1, ttl: 60000 },
    },
    debounceMs: 1000,
    hysteresisMs: 60000,
  });

  // === Scenario 1: 3 sources agree on battery=72% ===
  console.log('\n--- Scenario 1: 3 sources agree on battery=72% ---');
  await sleep(10);
  dev.battery.update(dev, 'zcl', 72, 0.95);
  await sleep(10);
  dev.battery.update(dev, 'tuya-dp', 71, 0.85);
  await sleep(10);
  dev.battery.update(dev, 'voltage', 72, 0.7);
  await sleep(100);
  console.log(`  Battery value: ${dev.values.measure_battery}`);
  console.log(`  Total setCapabilityValue calls: ${dev.setCalls.filter(c => c.cap === 'measure_battery').length}`);

  // === Scenario 2: Same battery value, but rapid (anti-flooding) ===
  console.log('\n--- Scenario 2: Same value, rapid updates (hysteresis) ---');
  const beforeCount = dev.setCalls.filter(c => c.cap === 'measure_battery').length;
  dev.battery.update(dev, 'zcl', 72, 0.95);
  dev.battery.update(dev, 'tuya-dp', 72, 0.85);
  dev.battery.update(dev, 'voltage', 72, 0.7);
  const afterCount = dev.setCalls.filter(c => c.cap === 'measure_battery').length;
  console.log(`  New setCapabilityValue calls: ${afterCount - beforeCount} (should be 0 — same value)`);

  // === Scenario 3: ZCL source fails, fallback to tuya-dp ===
  console.log('\n--- Scenario 3: ZCL fails, fallback to tuya-dp ---');
  dev.battery.markFailed('zcl', 'timeout');
  await sleep(100);
  dev.battery.update(dev, 'tuya-dp', 70, 0.85);
  await sleep(100);
  console.log(`  Battery after ZCL fail: ${dev.values.measure_battery}`);

  // === Scenario 4: All sources fail, last known good ===
  console.log('\n--- Scenario 4: All sources fail, last known good ---');
  dev.battery.markFailed('tuya-dp', 'parse error');
  dev.battery.markFailed('voltage', 'read fail');
  await sleep(100);
  // Try to commit — should return last known good
  const decision = dev.battery.commit();
  console.log(`  Commit decision: value=${decision.value}, reason=${decision.reason}`);
  console.log(`  Battery after all fail: ${dev.values.measure_battery}`);

  // === Scenario 5: Temperature from 2 sources ===
  console.log('\n--- Scenario 5: Temperature from ZCL + Tuya DP ---');
  dev.temperature.update(dev, 'zcl', 22.5, 0.95);
  dev.temperature.update(dev, 'tuya-dp', 23.0, 0.85);
  await sleep(100);
  console.log(`  Temperature: ${dev.values.measure_temperature}`);

  // === Scenario 6: Final stats ===
  console.log('\n--- Final stats ---');
  const bStats = dev.battery.getStats();
  console.log('  Battery:');
  console.log(`    records: ${bStats.records}, commits: ${bStats.commits}, deduped: ${bStats.deduped}, fallbacks: ${bStats.fallbacks}`);
  const tStats = dev.temperature.getStats();
  console.log('  Temperature:');
  console.log(`    records: ${tStats.records}, commits: ${tStats.commits}, deduped: ${tStats.deduped}`);

  console.log(`\n  Total setCapabilityValue calls: ${dev.setCalls.length}`);
  console.log(`  Calls that would have happened WITHOUT SmartCapability (estimate): ~30+`);
  console.log(`  Anti-flooding saved: ~${30 - dev.setCalls.length} redundant setCapabilityValue calls`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(e => { console.error(e); process.exit(1); });
