/**
 * fix-fp-conflicts-batch2.js — Résout les 129 erreurs FP-003 restantes
 *
 * Stratégie: Pour chaque paire en conflit, le driver "secondaire" (moins spécifique)
 * perd les PIDs partagés. On ne supprime que les PIDS spécifiques qui créent le conflit.
 * 
 * Règle: MFR peut exister dans plusieurs drivers (légitime).
 *        MFR + PID exact NE PEUT PAS exister dans 2 drivers incompatibles.
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT    = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');
const DRY_RUN = process.argv.includes('--dry-run');
const changed = [];

function log(msg) { console.log(msg); }

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function writeJson(p, data) {
  if (DRY_RUN) { log(`  [DRY] Would write: ${path.basename(p)} in ${path.dirname(p).split(path.sep).pop()}`); return; }
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Remove specific conflicting PIDs from `secondary` driver's compose.
 * Only removes PIDs that are EXACTLY listed in conflictPids AND exist in secondary.
 */
function removeConflictingPids(secondaryDriver, primaryDriver, conflictPids) {
  const secPath = path.join(DRIVERS, secondaryDriver, 'driver.compose.json');
  const secondary = readJson(secPath);
  if (!secondary) { log(`  ⚠️  Missing compose: ${secondaryDriver}`); return 0; }

  const secPids = [].concat(secondary.zigbee?.productId || []);
  const conflictSet = new Set(conflictPids.map(p => p.toUpperCase()));

  const removed = secPids.filter(p => conflictSet.has(p.toUpperCase()));
  const remaining = secPids.filter(p => !conflictSet.has(p.toUpperCase()));

  if (removed.length === 0) { 
    log(`  ↩️  ${secondaryDriver}: No matching PIDs to remove`);
    return 0;
  }

  const updated = JSON.parse(JSON.stringify(secondary));
  if (updated.zigbee) {
    updated.zigbee.productId = remaining;
  }

  log(`  ✅ ${secondaryDriver} ← ${primaryDriver}: removed PIDs [${removed.join(', ')}]`);
  writeJson(secPath, updated);
  changed.push({ driver: secondaryDriver, primary: primaryDriver, pidsRemoved: removed });
  return removed.length;
}

/**
 * Remove specific conflicting MFRs+PIDs from secondary driver.
 * Only removes MFR entries where that MFR+PID combo creates a conflict.
 */
function removeConflictingMfrs(secondaryDriver, primaryDriver, conflictMfrs) {
  const secPath = path.join(DRIVERS, secondaryDriver, 'driver.compose.json');
  const secondary = readJson(secPath);
  if (!secondary) { log(`  ⚠️  Missing compose: ${secondaryDriver}`); return 0; }

  const secMfrs = [].concat(secondary.zigbee?.manufacturerName || []);
  const conflictSet = new Set(conflictMfrs.map(m => m.toUpperCase()));

  const removed = secMfrs.filter(m => conflictSet.has(m.toUpperCase()));
  const remaining = secMfrs.filter(m => !conflictSet.has(m.toUpperCase()));

  if (removed.length === 0) {
    log(`  ↩️  ${secondaryDriver}: No matching MFRs to remove`);
    return 0;
  }

  const updated = JSON.parse(JSON.stringify(secondary));
  if (updated.zigbee) {
    updated.zigbee.manufacturerName = remaining;
  }

  log(`  ✅ ${secondaryDriver} ← ${primaryDriver}: removed ${removed.length} MFRs`);
  writeJson(secPath, updated);
  changed.push({ driver: secondaryDriver, primary: primaryDriver, mfrsRemoved: removed.length });
  return removed.length;
}

log('\n╔══════════════════════════════════════════════════════╗');
log('║  FP-003 BATCH FIX — Round 2');
log(`║  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
log('╚══════════════════════════════════════════════════════╝\n');

// ──────────────────────────────────────────────────────────
// GROUP 1: plug_smart conflicts
// plug_smart is the canonical smart plug driver.
// Other drivers should NOT have TS011F/S26R2ZB/S31 entries.
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 1: plug_smart conflicts ═══');

// switch_1gang has TS011F which is a smart plug PID — remove from switch
removeConflictingPids('switch_1gang', 'plug_smart', ['TS011F', 'S26R2ZB', 'TS000F']);
// switch_2gang has TS011F — remove from switch_2gang
removeConflictingPids('switch_2gang', 'plug_smart', ['TS011F']);
// button_wireless_2 has TS011F/TS000F — remove (buttons ≠ plugs)
removeConflictingPids('button_wireless_2', 'plug_smart', ['TS011F', 'TS000F']);
// smartplug has TS011F — keep in plug_smart, remove from smartplug (legacy)
removeConflictingPids('smartplug', 'plug_smart', ['TS011F']);
// socket_power_strip_four_two has TS011F — remove (power strip != plug)
removeConflictingPids('socket_power_strip_four_two', 'plug_smart', ['TS011F', 'S26R2ZB', 'S31 LITE ZB', 'S40LITE']);
// socket_power_strip has TS011F
removeConflictingPids('socket_power_strip', 'plug_smart', ['TS011F']);
// wall_socket has TS011F
removeConflictingPids('wall_socket', 'plug_smart', ['TS011F']);
// device_din_rail has TS011F — din rail != generic plug
removeConflictingPids('device_din_rail', 'plug_smart', ['TS011F']);
// device_plug_energy has TS011F
removeConflictingPids('device_plug_energy', 'plug_smart', ['TS011F']);
// remote_button_wireless_plug has TS011F — remote ≠ plug
removeConflictingPids('remote_button_wireless_plug', 'plug_smart', ['TS011F']);
// double_power_point_2 has TS011F
removeConflictingPids('double_power_point_2', 'plug_smart', ['TS011F']);
// outdoor_2_socket has TS011F
removeConflictingPids('outdoor_2_socket', 'plug_smart', ['TS011F']);
// generic_diy has S26R2ZB
removeConflictingPids('generic_diy', 'plug_smart', ['S26R2ZB']);

// ──────────────────────────────────────────────────────────
// GROUP 2: climate_sensor vs soil_sensor (ZG-303Z)
// soil_sensor is specific — keep. climate_sensor should not claim soil PIDs.
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 2: climate_sensor vs soil_sensor ═══');
removeConflictingPids('climate_sensor', 'soil_sensor', ['ZG-303Z']);

// ──────────────────────────────────────────────────────────
// GROUP 3: climate_sensor vs illuminance_sensor (TS0222)
// TS0222 is a SPECIFIC illuminance sensor PID — remove from climate_sensor
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 3: climate_sensor vs illuminance_sensor ═══');
removeConflictingPids('climate_sensor', 'illuminance_sensor', ['TS0222']);

// ──────────────────────────────────────────────────────────
// GROUP 4: gas_sensor vs sensor_gas_presence
// Both legitimate — remove specific PIDs from the less specific one
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 4: gas_sensor vs sensor_gas_presence ═══');
// sensor_gas_presence is the newer specific driver, gas_sensor is generic
// gas_sensor should not have ZG-225Z, TS0301 (presence-specific)
// but keep TS0601_GAS (generic gas) in gas_sensor
removeConflictingPids('gas_sensor', 'sensor_gas_presence', ['ZG-225Z', 'TS0301']);

// ──────────────────────────────────────────────────────────
// GROUP 5: contact_sensor vs sensor_contact_water (Q9MPFHW)
// Q9MPFHW is a water contact sensor — specific to sensor_contact_water
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 5: contact_sensor vs sensor_contact_water ═══');
removeConflictingPids('contact_sensor', 'sensor_contact_water', ['Q9MPFHW']);

// ──────────────────────────────────────────────────────────
// GROUP 6: bulb_dimmable vs wall_dimmer_tuya (TS110E, TS110F, TS0052, TS1101)
// These PIDs are actually DIMMER MODULE PIDs — bulb_dimmable should not have them
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 6: bulb_dimmable vs wall_dimmer_tuya ═══');
removeConflictingPids('bulb_dimmable', 'wall_dimmer_tuya', ['TS110E', 'TS110F', 'TS0052', 'TS1101']);

// ──────────────────────────────────────────────────────────
// GROUP 7: bulb_dimmable vs led_controller_dimmable (TS0501B)
// TS0501B is an LED controller PID — remove from bulb_dimmable
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 7: bulb_dimmable vs led_controller_dimmable ═══');
removeConflictingPids('bulb_dimmable', 'led_controller_dimmable', ['TS0501B']);

// ──────────────────────────────────────────────────────────
// GROUP 8: button_wireless_1 vs smart_button_switch (SNZB-01, SNZB-01P)
// smart_button_switch is the specific driver — button_wireless_1 loses these
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 8: button_wireless_1 vs smart_button_switch ═══');
removeConflictingPids('button_wireless_1', 'smart_button_switch', ['SNZB-01', 'SNZB-01P']);

// ──────────────────────────────────────────────────────────
// GROUP 9: button_wireless_4 vs handheld_remote_4_buttons (TS004F, SNZB-01M)
// handheld_remote is specific — button_wireless_4 loses these PIDs
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 9: button_wireless_4 remotes ═══');
removeConflictingPids('button_wireless_4', 'handheld_remote_4_buttons', ['TS004F', 'SNZB-01M']);
removeConflictingPids('button_wireless_4', 'remote_button_wireless_wall', ['TS004F']);

// ──────────────────────────────────────────────────────────
// GROUP 10: illuminance_sensor vs sensor_illuminance_presence (TS0222, ZG-106Z)
// sensor_illuminance_presence is more specific — remove from illuminance_sensor
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 10: illuminance_sensor vs sensor_illuminance_presence ═══');
removeConflictingPids('illuminance_sensor', 'sensor_illuminance_presence', ['ZG-106Z']);
// TS0222 in illuminance+sensor_illuminance: keep in illuminance_sensor (primary)
// remove from sensor_illuminance_presence (variant)
removeConflictingPids('sensor_illuminance_presence', 'illuminance_sensor', ['TS0222']);

// ──────────────────────────────────────────────────────────
// GROUP 11: curtain_motor vs generic_diy (TS0105)
// curtain_motor is specific — generic_diy should not claim curtain PIDs
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 11: curtain_motor vs generic_diy ═══');
removeConflictingPids('generic_diy', 'curtain_motor', ['TS0105']);

// ──────────────────────────────────────────────────────────
// GROUP 12: contact_sensor vs generic_diy (SNZB-04, SNZB-04P)
// contact_sensor is specific — generic_diy should not claim SONOFF contact PIDs
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 12: contact_sensor vs generic_diy ═══');
removeConflictingPids('generic_diy', 'contact_sensor', ['SNZB-04', 'SNZB-04P']);

// ──────────────────────────────────────────────────────────
// GROUP 13: motion_sensor vs generic_diy (SNZB-03, SNZB-03P)
// motion_sensor is specific — generic_diy should not claim SONOFF motion PIDs
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 13: motion_sensor vs generic_diy ═══');
removeConflictingPids('generic_diy', 'motion_sensor', ['SNZB-03', 'SNZB-03P']);

// ──────────────────────────────────────────────────────────
// GROUP 14: dimmer_wall_1gang vs generic_diy (TS0052)
// TS0052 is a dimmer module — remove from generic_diy
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 14: dimmer_wall_1gang vs generic_diy ═══');
removeConflictingPids('generic_diy', 'dimmer_wall_1gang', ['TS0052']);

// ──────────────────────────────────────────────────────────
// GROUP 15: climate_sensor vs ir_blaster (TS1201)
// TS1201 is an IR blaster specific PID — remove from climate_sensor
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 15: climate_sensor vs ir_blaster ═══');
removeConflictingPids('climate_sensor', 'ir_blaster', ['TS1201']);

// ──────────────────────────────────────────────────────────
// GROUP 16: device_air_purifier_* cross-conflicts
// These share TS0601_AIR_PURIFIER — they need unique MFR sets
// Strategy: each sub-driver keeps only its specific MFRs
// Keep in device_air_purifier_smart (most generic), remove from others
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 16: device_air_purifier cross-conflicts ═══');
// Check what MFRs overlap between the siren and smart variants
{
  const purifierDir = path.join(DRIVERS);
  const smartCompose = readJson(path.join(purifierDir, 'device_air_purifier_smart', 'driver.compose.json'));
  const sirenCompose = readJson(path.join(purifierDir, 'device_air_purifier_siren', 'driver.compose.json'));
  
  if (smartCompose && sirenCompose) {
    const smartMfrs = new Set([].concat(smartCompose.zigbee?.manufacturerName || []).map(m => m.toUpperCase()));
    const sirenMfrs = [].concat(sirenCompose.zigbee?.manufacturerName || []);
    const overlapMfrs = sirenMfrs.filter(m => smartMfrs.has(m.toUpperCase()));
    
    log(`  air_purifier_siren overlap MFRs with smart: ${overlapMfrs.length}`);
    if (overlapMfrs.length > 0) {
      removeConflictingMfrs('device_air_purifier_siren', 'device_air_purifier_smart', overlapMfrs);
    }
  }
}

// ──────────────────────────────────────────────────────────
// GROUP 17: switch_1gang vs switch_2gang (TS011F, TS0726)
// TS011F/TS0726 are 2-gang PIDs — remove from switch_1gang
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 17: switch_1gang vs switch_2gang ═══');
removeConflictingPids('switch_1gang', 'switch_2gang', ['TS011F', 'TS0726']);

// ──────────────────────────────────────────────────────────
// GROUP 18: dimmer_1_gang_2 vs dimmer_wall_1gang (TS110E)
// dimmer_wall_1gang is canonical — dimmer_1_gang_2 loses TS110E
// ──────────────────────────────────────────────────────────
log('\n═══ GROUP 18: dimmer_1_gang_2 vs dimmer_wall_1gang ═══');
removeConflictingPids('dimmer_1_gang_2', 'dimmer_wall_1gang', ['TS110E']);

// ──────────────────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────────────────
log('\n── SUMMARY ──────────────────────────────────────────────');
log(`Total driver modifications: ${changed.length}`);
changed.forEach(c => {
  const p = c.pidsRemoved ? `PIDs: ${c.pidsRemoved.join(', ')}` : `${c.mfrsRemoved} MFRs`;
  log(`  ${c.driver} (← ${c.primary}): removed ${p}`);
});
if (DRY_RUN) {
  log('\n⚠️  DRY RUN — No files modified. Remove --dry-run to apply.');
} else {
  log('\n✅ Done. Re-run flow-card-audit.js to verify FP-003 count.');
}
