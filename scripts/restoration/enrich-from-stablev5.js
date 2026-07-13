#!/usr/bin/env node
'use strict';

// enrich-from-stablev5.js
// Porte les 891 fingerprints de stable-v5 smart_fingerprints.js vers
// les drivers master, avec un mapping intelligent stable vers master.
// Source : stable-v5:lib/data/smart_fingerprints.js (1322 FPs Z2M 2025)
// Cible : drivers/*/driver.compose.json (429 drivers master)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const VERBOSE = args.includes('--verbose');

// ─── Mapping stable-v5 driverId → master driverId ───
// Les noms ont évolué entre stable-v5 et master. Ce tableau fait la passerelle.
const DRIVER_MAPPING = {
  'switch_1gang': 'switch_1gang',
  'switch_wireless': 'button_wireless_switch',
  'light_dimmable': 'bulb_dimmable_dimmer',
  'light_color': 'light_bulb_rgb_rgbw',
  'light_temperature': 'bulb_tunable_white',
  'cover_motor': 'curtain_motor',
  'thermostat_ts0601': 'thermostat_tuya_dp',
  'thermostat_trv': 'radiator_valve',
  'climate_sensor': 'climate_sensor',
  'presence_sensor_radar': 'presence_sensor_radar',
  'energy_meter': 'plug_energy_monitor',
  'dimmer_1gang': 'wall_dimmer_tuya',
  'plug_1socket': 'plug_eu_tuya',
  'contact_sensor': 'sensor_contact_zigbee',
  'motion_sensor': 'motion_sensor',
  'zigbee_universal': 'generic_tuya',
  'water_leak_sensor': 'water_leak_sensor_tuya',
  'soil_sensor': 'soil_sensor_ec',
  'smoke_detector_advanced': 'smoke_sensor_tuya',
  'gas_sensor': 'gas_sensor',
  'vibration_sensor': 'vibration_sensor_tuya',
  'water_valve_smart': 'valve_smart',
  'light_sensor': 'light_sensor_tuya',
  'button_wireless': 'button_wireless_2',
  'siren': 'siren_alarm_tuya',
  'door_lock': 'lock_tuya',
  'fan': 'fan_controller_tuya',
};

function log(...a) { console.log(...a); }
function ok(...a) { console.log('✅', ...a); }
function warn(...a) { console.warn('⚠️ ', ...a); }

function main() {
  // 1. Extraire smart_fingerprints.js depuis stable-v5
  log('📋 Extraction smart_fingerprints.js depuis stable-v5...');
  const sfContent = execSync('git show stable-v5:lib/data/smart_fingerprints.js', {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  });

  // 2. Parser les entrées : '_TZE...': { driverId: 'xxx', ... } AND brand names like 'HOBEIAN'
  // v9.0.50: Broadened regex to include non-_T manufacturer names (HOBEIAN, BSEED, etc.)
  const entryRe = /'([A-Za-z0-9_-]+)':\s*\{\s*driverId:\s*'([a-z_0-9]+)'/g;
  const entries = [];
  let m;
  while ((m = entryRe.exec(sfContent)) !== null) {
    entries.push({ fingerprint: m[1], stableDriver: m[2] });
  }
  log(`📊 ${entries.length} entrées parsées depuis smart_fingerprints.js`);

  // 3. Charger les fingerprints actuels de master (UNIQUEMENT driver.compose.json, pas app.json)
  // Important : app.json est généré et contient déjà tous les FPs consolidés,
  // mais les driver.compose.json (sources) peuvent en manquer.
  const currentFps = new Set();
  for (const dir of fs.readdirSync(DRIVERS_DIR)) {
    const compose = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (!fs.existsSync(compose)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(compose, 'utf8'));
      const mfr = c?.zigbee?.manufacturerName || [];
      for (const fp of mfr) currentFps.add(String(fp).toLowerCase());
    } catch (_e) {}
  }
  log(`📊 ${currentFps.size} fingerprints déjà présents dans driver.compose.json (sources)`);

  // 4. Mapper stable→master et filtrer les doublons
  const plan = {}; // {masterDriver: [fingerprints]}
  let skippedDup = 0, skippedUnmapped = 0, injectable = 0;
  const unmappedDrivers = {};

  for (const { fingerprint, stableDriver } of entries) {
    if (currentFps.has(fingerprint.toLowerCase())) { skippedDup++; continue; }
    const masterDriver = DRIVER_MAPPING[stableDriver];
    if (!masterDriver) {
      unmappedDrivers[stableDriver] = (unmappedDrivers[stableDriver] || 0) + 1;
      skippedUnmapped++;
      continue;
    }
    const composePath = path.join(DRIVERS_DIR, masterDriver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      unmappedDrivers[stableDriver] = (unmappedDrivers[stableDriver] || 0) + 1;
      skippedUnmapped++;
      continue;
    }
    if (!plan[masterDriver]) plan[masterDriver] = [];
    plan[masterDriver].push(fingerprint);
    injectable++;
  }

  log(`\n═══════════════════════════════════════════════`);
  log(`📊 PLAN D'ENRICHISSEMENT`);
  log(`   Injectables : ${injectable}`);
  log(`   Doublons skip : ${skippedDup}`);
  log(`   Non-mappables : ${skippedUnmapped}`);
  log(`   Drivers cibles : ${Object.keys(plan).length}`);
  log(`═══════════════════════════════════════════════\n`);

  if (VERBOSE) {
    for (const [drv, fps] of Object.entries(plan).sort((a, b) => b[1].length - a[1].length)) {
      log(`  ${drv}: +${fps.length}`);
    }
  }

  if (Object.keys(unmappedDrivers).length > 0) {
    log('\n📋 Drivers stable-v5 sans équivalent master exact :');
    for (const [d, n] of Object.entries(unmappedDrivers).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      log(`   ${d}: ${n} FPs (mapping manuel requis)`);
    }
  }

  // 5. Injection
  if (!APPLY) {
    log('\n💡 Mode DRY-RUN. Relancez avec --apply pour injecter.');
    return;
  }

  let totalInjected = 0;
  let driversModified = 0;
  const report = [];

  for (const [driverId, fingerprints] of Object.entries(plan)) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    let content;
    try {
      content = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (e) { warn(`JSON invalide ${driverId}`); continue; }

    const mfrArr = content?.zigbee?.manufacturerName;
    if (!Array.isArray(mfrArr)) { warn(`${driverId}: pas de manufacturerName[]`); continue; }

    const existingLower = new Set(mfrArr.map((x) => String(x).toLowerCase()));
    let injected = 0;
    const added = [];

    for (const fp of fingerprints) {
      if (existingLower.has(fp.toLowerCase())) continue;
      mfrArr.push(fp);
      existingLower.add(fp.toLowerCase());
      added.push(fp);
      injected++;
      totalInjected++;
    }

    if (injected > 0) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(composePath, `${composePath}.backup-sv5-${ts}`);
      fs.writeFileSync(composePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
      try { JSON.parse(fs.readFileSync(composePath, 'utf8')); }
      catch (e) { fs.copyFileSync(`${composePath}.backup-sv5-${ts}`, composePath); continue; }
      driversModified++;
      ok(`${driverId}: +${injected}`);
      report.push({ driverId, injected, added });
    }
  }

  log(`\n═══════════════════════════════════════════════`);
  log(`📊 RAPPORT D'ENRICHISSEMENT stable-v5`);
  log(`   Drivers modifiés : ${driversModified}`);
  log(`   Fingerprints injectés : ${totalInjected}`);
  log(`═══════════════════════════════════════════════\n`);

  // Sauvegarde rapport
  fs.writeFileSync(path.join(ROOT, 'stablev5_enrichment_report.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    source: 'stable-v5:lib/data/smart_fingerprints.js',
    driversModified, totalInjected,
    skippedDup, skippedUnmapped,
    unmappedDrivers,
    details: report,
  }, null, 2));
}

main();
