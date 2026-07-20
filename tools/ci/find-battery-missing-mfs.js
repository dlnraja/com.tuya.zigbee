#!/usr/bin/env node
// P77.1: Find battery drivers that need enrichment
// Battery drivers are 247 of 431. Many don't have manufacturerName
// or use basic patterns. This tool identifies enrichment opportunities.

const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(process.cwd(), 'drivers');

const drivers = fs.readdirSync(DRIVERS).filter(x => {
  const stat = fs.statSync(path.join(DRIVERS, x));
  return stat.isDirectory() && !x.startsWith('.');
});

const battery = [];
for (const d of drivers) {
  const composeFile = path.join(DRIVERS, d, 'driver.compose.json');
  const devFile = path.join(DRIVERS, d, 'device.js');
  if (!fs.existsSync(composeFile) || !fs.existsSync(devFile)) continue;
  const c = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  if (!(c.capabilities || []).some(x => x === 'measure_battery' || x === 'alarm_battery')) continue;
  const dev = fs.readFileSync(devFile, 'utf8');
  battery.push({
    driver: d,
    mfrs: (c.zigbee?.manufacturerName || []).length,
    safeSet: /safeSetCapabilityValue/.test(dev),
    destroyed: /_destroyed/.test(dev),
    onDeleted: /onDeleted/.test(dev),
    zclNode: /zclNode|onZigBeeMessage/.test(dev),
    batteryCore: /BatteryCore|UnifiedBatteryHandler|BatteryCascadeEngine|BatteryMasterEngine|BatteryHealthIntelligence/.test(dev),
    buttonCount: (c.capabilities || []).filter(x => x.startsWith('button') || x === 'alarm_battery').length,
  });
}

console.log(`Total battery drivers: ${battery.length}`);
console.log('\n=== Enrichment opportunities (sorted by missing patterns) ===');
const enriched = battery
  .map(b => ({
    ...b,
    missingSafeSet: !b.safeSet ? 1 : 0,
    missingDestroyed: !b.destroyed ? 1 : 0,
    missingBatteryCore: !b.batteryCore ? 1 : 0,
    missingZcl: !b.zclNode ? 1 : 0,
    score: (b.safeSet ? 0 : 2) + (b.destroyed ? 0 : 1) + (b.batteryCore ? 0 : 3) + (b.zclNode ? 0 : 1)
  }))
  .sort((a, b) => b.score - a.score);

const noSafeSet = enriched.filter(b => b.missingSafeSet);
const noDestroyed = enriched.filter(b => b.missingDestroyed);
const noBatteryCore = enriched.filter(b => b.missingBatteryCore);
const noZcl = enriched.filter(b => b.missingZcl);

console.log(`  No safeSet: ${noSafeSet.length}`);
console.log(`  No _destroyed: ${noDestroyed.length}`);
console.log(`  No batteryCore/UnifiedBatteryHandler: ${noBatteryCore.length}`);
console.log(`  No zclNode: ${noZcl.length}`);

console.log('\n=== Top 20 to enrich (highest score first) ===');
for (const b of enriched.slice(0, 20)) {
  console.log(`  ${b.driver}: score=${b.score} safeSet=${b.safeSet} destroyed=${b.destroyed} core=${b.batteryCore} zcl=${b.zclNode}`);
}

console.log('\n=== Drivers with all safety patterns (gold standard) ===');
const perfect = enriched.filter(b => b.score === 0);
console.log(`  Count: ${perfect.length}/${battery.length}`);
for (const b of perfect.slice(0, 5)) {
  console.log(`    ${b.driver}`);
}
