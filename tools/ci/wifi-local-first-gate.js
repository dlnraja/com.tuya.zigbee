#!/usr/bin/env node
'use strict';

/**
 * wifi-local-first-gate.js (P194)
 *
 * Tuya wifi_* drivers (not eWeLink / Sonoff) must stay local-first:
 *   - settings expose device_id, local_key, and an IP field
 *   - protocol_version includes auto (client walks 3.1–3.5)
 *   - device.js extends TuyaLocalDevice (or LocalWiFiTuyaBridge path)
 *
 * Usage: node tools/ci/wifi-local-first-gate.js [--json]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const JSON_MODE = process.argv.includes('--json');
const SKIP = /ewelink|sonoff/;
const errors = [];
const warnings = [];

function settingsIds(compose) {
  const ids = [];
  for (const group of compose.settings || []) {
    for (const c of group.children || []) {ids.push(c.id);}
  }
  return ids;
}

function protocolValues(compose) {
  for (const group of compose.settings || []) {
    for (const c of group.children || []) {
      if (c.id === 'protocol_version') {return (c.values || []).map((v) => v.id);}
    }
  }
  return [];
}

function main() {
  const ids = fs.readdirSync(DRIVERS).filter((id) => {
    if (!id.startsWith('wifi_') || SKIP.test(id)) {return false;}
    return fs.existsSync(path.join(DRIVERS, id, 'driver.compose.json'));
  });

  for (const id of ids) {
    const compose = JSON.parse(fs.readFileSync(path.join(DRIVERS, id, 'driver.compose.json'), 'utf8'));
    const sids = settingsIds(compose);
    if (!sids.includes('device_id') && !sids.includes('tuya_device_id')) {
      errors.push(`${id}: missing device_id setting`);
    }
    if (!sids.includes('local_key')) {errors.push(`${id}: missing local_key setting`);}
    if (!sids.includes('ip') && !sids.includes('device_ip') && !sids.includes('ip_address')) {
      errors.push(`${id}: missing ip setting`);
    }
    const proto = protocolValues(compose);
    if (sids.includes('protocol_version') && !proto.includes('auto')) {
      errors.push(`${id}: protocol_version must include auto`);
    }
    const deviceJs = path.join(DRIVERS, id, 'device.js');
    if (fs.existsSync(deviceJs)) {
      const src = fs.readFileSync(deviceJs, 'utf8');
      if (!/TuyaLocalDevice|LocalWiFiTuyaBridge|eWeLink/.test(src)) {
        warnings.push(`${id}: device.js does not extend TuyaLocalDevice`);
      }
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    drivers: ids.length,
    errors: errors.length,
    warnings: warnings.length,
    errorDetails: errors,
    warningDetails: warnings,
  };
  if (JSON_MODE) {console.log(JSON.stringify(report, null, 2));}
  else {
    console.log('═══════════════════════════════════════════════');
    console.log('  WiFi local-first gate (P194)');
    console.log('═══════════════════════════════════════════════');
    for (const w of warnings) {console.log(`  ~ ${w}`);}
    if (errors.length) {
      for (const e of errors) {console.log(`  ❌ ${e}`);}
      console.log(`\nFAILED: ${errors.length}`);
    } else {console.log(`  ✅ ${ids.length} Tuya wifi_* drivers expose local-first settings`);}
  }
  if (errors.length) {process.exit(1);}
}

main();
