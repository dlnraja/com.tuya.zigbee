'use strict';
// P2942 audit (21/10/2026): every padded / invisible-char manufacturerName in drivers/*/driver.compose.json
// must reach the publish manifest unchanged (P2941 trim bug, GH#570). Today only "AOYAN  " (soil_sensor).
// Plus regression pin for Kizabgd (forum 140352, 15/10): _TZE284_9ern5sfh / TS0601 LCD sensor
// (Z2M tuya.ts TS0601_temperature_humidity_sensor_4) lives on lcdtemphumidsensor only (P2823).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const c = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
const ODD = (s) => s !== s.trim() || /[\u0000-\u001f\u007f\u00a0\u200b-\u200f\ufeff]/.test(s) || s.includes('  ');
const drivers = () => fs.readdirSync(path.join(ROOT, 'drivers')).map((id) => {
  try { return { id, zigbee: JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8')).zigbee }; } catch (_e) { return null; }
}).filter((d) => d && d.zigbee);

test('every padded manufacturer name in compose survives the compactor', () => {
  const src = drivers();
  const padded = src.flatMap((d) => (d.zigbee.manufacturerName || []).filter((m) => typeof m === 'string' && ODD(m)).map((m) => [d.id, m]));
  assert.ok(padded.length >= 1);
  const manifest = { drivers: JSON.parse(JSON.stringify(src)) };
  c.compactZigbeeIdentifiers(manifest, { repoRoot: ROOT });
  for (const [id, m] of padded) {
    const d = manifest.drivers.find((x) => x.id === id);
    assert.ok(d && d.zigbee.manufacturerName.includes(m), `${id} lost ${JSON.stringify(m)}`);
  }
});

test('_TZE284_9ern5sfh is only on lcdtemphumidsensor with TS0601', () => {
  const owners = drivers().filter((d) => (d.zigbee.manufacturerName || []).includes('_TZE284_9ern5sfh')).map((d) => d.id);
  assert.deepStrictEqual(owners, ['lcdtemphumidsensor']);
  assert.ok(drivers().find((d) => d.id === 'lcdtemphumidsensor').zigbee.productId.includes('TS0601'));
});
