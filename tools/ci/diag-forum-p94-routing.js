'use strict';

/**
 * tools/ci/diag-forum-p94-routing.js
 *
 * Read-only diagnostic for forum P94 fingerprint placements.
 * No secrets. Safe to run locally or in CI.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

function find(mfr) {
  const hits = [];
  const driversDir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(driversDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const f = path.join(driversDir, d.name, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch {
      continue;
    }
    const mfrs = (j.zigbee && j.zigbee.manufacturerName) || [];
    if (mfrs.some((x) => String(x).toLowerCase() === mfr.toLowerCase())) {
      hits.push({
        driver: d.name,
        class: j.class,
        caps: (j.capabilities || []).slice(0, 8),
      });
    }
  }
  return hits;
}

const checks = [
  { forum: '#2133', mfr: '_TZE284_m1cvyneb', expect: 'wall_dimmer_tuya' },
  { forum: '#2130', mfr: '_TZ3000_w5xztuy7', expect: 'switch_2gang' },
  { forum: '#2131', mfr: '_TZ3210_imaccztn', expect: 'relay_board_4_channel' },
  { forum: 'P93', mfr: '_TZ3000_xabckq1v', expect: 'switch_1gang' },
  { forum: 'P93', mfr: '_TZ3000_czuyt8lz', expect: 'switch_1gang' },
  { forum: '#2120', mfr: '_TZE204_clrdrnya', expect: 'presence_sensor_radar' },
  { forum: 'Moes4', mfr: '_TZ3000_kfu8zapd', expect: 'button_wireless_4' },
];

console.log(`diag-forum-p94-routing root=${ROOT}`);
let bad = 0;
for (const c of checks) {
  const hits = find(c.mfr);
  const drivers = hits.map((h) => h.driver);
  const ok = drivers.includes(c.expect);
  if (!ok) bad++;
  console.log(
    `${ok ? 'OK' : 'BAD'} ${c.forum} ${c.mfr} expect=${c.expect} got=[${drivers.join(', ') || 'NONE'}]`
  );
}

const gas = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'drivers/gas_sensor_switch/driver.compose.json'), 'utf8')
);
const zg = (gas.zigbee.productId || []).includes('ZG-222Z');
console.log(`${zg ? 'BAD' : 'OK'} P93 gas_sensor_switch must NOT have ZG-222Z (has=${zg})`);
if (zg) bad++;

// Radar settings surface for #2132
const radar = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8')
);
const needed = [
  'radar_sensitivity',
  'detection_range',
  'shield_range',
  'entry_sensitivity',
  'departure_delay',
  'illuminance_threshold',
  'sensor_mode',
];
const ids = (radar.settings || []).map((s) => s.id);
const missing = needed.filter((n) => !ids.includes(n));
console.log(
  `${missing.length ? 'BAD' : 'OK'} #2132 radar settings missing=[${missing.join(', ') || 'none'}] total=${ids.length}`
);
if (missing.length) bad++;

process.exit(bad ? 1 : 0);
