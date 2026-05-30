/**
 * fix-fp-conflicts.js — Résout les conflits de fingerprints cross-drivers
 *
 * Stratégie par paire de drivers:
 * - switch_1gang vs switch_1_gang → fusionner dans switch_1_gang (la version canonical)
 * - contact_sensor vs sensor_contact_zigbee → garder contact_sensor (plus complet)
 * - water_leak_sensor vs water_leak_sensor_tuya → garder water_leak_sensor
 * - smoke_detector_advanced vs smoke_sensor2 → garder smoke_detector_advanced
 * - dimmer_wall_1gang vs wall_dimmer_tuya → garder dimmer_wall_1gang (Tuya DP)
 * - plug_smart vs usb_dongle_triple → garder plug_smart (doublons génériques)
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT    = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');
const DRY_RUN = process.argv.includes('--dry-run');

const log = (msg) => console.log(msg);
const changed = [];

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function writeJson(p, data) {
  if (DRY_RUN) {
    log(`[DRY] Would write: ${p}`);
    return;
  }
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getComposePath(driver) {
  return path.join(DRIVERS, driver, 'driver.compose.json');
}

/**
 * Removes entries from `source` driver's compose that also exist in `target` driver.
 * This deduplicates by removing the overlapping FPs from the secondary driver.
 * 
 * Rule: manufacturerName + productId is a PAIR — only remove if BOTH overlap.
 */
function removeDupsFromDriver(secondaryDriver, primaryDriver) {
  const primaryPath   = getComposePath(primaryDriver);
  const secondaryPath = getComposePath(secondaryDriver);
  const primary   = readJson(primaryPath);
  const secondary = readJson(secondaryPath);

  if (!primary || !secondary) {
    log(`  ⚠️  Missing compose for ${secondaryDriver} or ${primaryDriver}`);
    return;
  }

  const primMfrs = new Set([].concat(primary.zigbee?.manufacturerName || []).map(m => m.toUpperCase()));
  const primPids = new Set([].concat(primary.zigbee?.productId || []).map(p => p.toUpperCase()));

  const secMfrs = [].concat(secondary.zigbee?.manufacturerName || []);
  const secPids = [].concat(secondary.zigbee?.productId || []);

  // Only remove mfrs that are FULLY contained in primary (same mfr+pid pairs)
  // Strategy: remove from secondary's mfr list any mfr where ALL pids for that mfr are in primary
  const mfrsToRemove = secMfrs.filter(m => primMfrs.has(m.toUpperCase()));
  const remainingMfrs = secMfrs.filter(m => !primMfrs.has(m.toUpperCase()));

  // For pids: only remove pids that are in primary AND belong to removed mfrs
  // (don't remove generic pids that may be needed with unique mfrs)
  const pidsToRemove = secPids.filter(p => primPids.has(p.toUpperCase()) && 
    // Only remove if this pid can ONLY be associated with removed mfrs
    // Conservative: only remove product IDs that are explicitly generic cross-type (TS0601, TS0001...)
    isGenericPid(p));
  const remainingPids = secPids.filter(p => !pidsToRemove.includes(p));

  if (mfrsToRemove.length === 0 && pidsToRemove.length === 0) {
    log(`  ↩️  No removable FPs found in ${secondaryDriver}`);
    return;
  }

  const updated = JSON.parse(JSON.stringify(secondary));
  if (updated.zigbee) {
    updated.zigbee.manufacturerName = remainingMfrs;
    updated.zigbee.productId = remainingPids;
  }

  log(`  ✅ ${secondaryDriver}: removed ${mfrsToRemove.length} mfr + ${pidsToRemove.length} pid conflicts`);
  log(`     Removed mfrs (sample): ${mfrsToRemove.slice(0, 5).join(', ')}`);
  log(`     Removed pids (sample): ${pidsToRemove.slice(0, 3).join(', ')}`);

  writeJson(secondaryPath, updated);
  changed.push({ driver: secondaryDriver, mfrsRemoved: mfrsToRemove.length, pidsRemoved: pidsToRemove.length });
}

// Generic product IDs that should not cross multiple unrelated driver categories
const GENERIC_PIDS = new Set([
  'TS0001', 'TS0002', 'TS0003', 'TS0004',
  'TS0011', 'TS0012', 'TS0013', 'TS0014',
  'TS0021', 'TS0022',
  'TS0101', 'TS0111', 'TS0201', 'TS0202', 'TS0203', 'TS0204', 'TS0205',
  'TS0207',
  'TS0601'
]);

function isGenericPid(pid) {
  return GENERIC_PIDS.has(pid.toUpperCase());
}

log('\n╔══════════════════════════════════════════════════════╗');
log('║  FINGERPRINT CONFLICT RESOLVER');
log(`║  Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (writing changes)'}`);
log('╚══════════════════════════════════════════════════════╝\n');

if (!DRY_RUN) {
  log('⚠️  WARNING: This will modify driver.compose.json files!');
  log('   Run with --dry-run first to preview changes.\n');
}

// --- Conflict resolution pairs (secondary driver loses its duplicates) ---
// Format: [secondary (loses dups), primary (keeps all)]
const CONFLICT_PAIRS = [
  // switch_1_gang is the canonical single-gang switch driver (newer, better maintained)
  // switch_1gang (legacy) keeps only UNIQUE entries not in switch_1_gang
  ['switch_1gang',           'switch_1_gang'],
  
  // contact_sensor is more complete — sensor_contact_zigbee loses duplicates
  ['sensor_contact_zigbee',  'contact_sensor'],
  
  // water_leak_sensor (main) keeps all — _tuya variant loses generic overlaps
  ['water_leak_sensor_tuya', 'water_leak_sensor'],
  
  // smoke_detector_advanced is canonical — smoke_sensor2 loses duplicates
  ['smoke_sensor2',          'smoke_detector_advanced'],
  
  // dimmer_wall_1gang is canonical dimmer — wall_dimmer_tuya loses generic overlaps
  ['wall_dimmer_tuya',       'dimmer_wall_1gang'],
  
  // plug_smart is the main plug driver — usb_dongle_triple should only have USB-specific FPs
  ['usb_dongle_triple',      'plug_smart'],
];

for (const [secondary, primary] of CONFLICT_PAIRS) {
  log(`\n── ${secondary} (secondary) vs ${primary} (primary) ──`);
  removeDupsFromDriver(secondary, primary);
}

log('\n── SUMMARY ──────────────────────────────────────────────');
log(`Total drivers modified: ${changed.length}`);
changed.forEach(c => log(`  ${c.driver}: -${c.mfrsRemoved} mfr, -${c.pidsRemoved} pid`));

if (DRY_RUN) {
  log('\n⚠️  DRY RUN — No files were modified. Remove --dry-run to apply.');
} else {
  log('\n✅ Done. Re-run flow-card-audit.js to verify FP-003 count dropped.');
}
