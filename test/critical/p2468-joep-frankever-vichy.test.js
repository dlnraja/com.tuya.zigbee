'use strict';

/**
 * P2468 — Joep irrigation + FrankEver NEED_INTERVIEW + VicHY #2232
 * - Joep #2218: Insoma fhvpaltk interview is [0,4,5,61184] — compose must NOT require OnOff(6)
 * - FrankEver: FK_V02 vs FK-BV05 DP maps + sacred-keep couples (no invent live pid)
 * - VicHY #2232: longer mains radar phantom re-heal after tip update
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const dualCompose = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'drivers', 'valve_dual_irrigation', 'driver.compose.json'), 'utf8'));
const dualClusters = dualCompose.zigbee.endpoints['1'].clusters;
assert.deepStrictEqual(dualClusters, [0, 4, 5, 61184],
  'P2468: valve_dual_irrigation clusters must match Joep interview (no OnOff 6)');
assert.ok(!dualClusters.includes(6), 'P2468: must not require cluster 6');

const valveJs = fs.readFileSync(path.join(ROOT, 'drivers', 'water_valve_smart', 'device.js'), 'utf8');
assert.ok(valveJs.includes('FRANKEVER_FK_V02_MFRS'), 'P2468: FK_V02 mfr list');
assert.ok(valveJs.includes('FRANKEVER_FK_BV05_MFRS'), 'P2468: FK-BV05 mfr list');
assert.ok(valveJs.includes('isFrankeverFkV02'), 'P2468: FK_V02 DP path');
assert.ok(/9:\s*\{\s*capability:\s*null,\s*internal:\s*'countdown_seconds'/.test(valveJs)
  || valveJs.includes("internal: 'countdown_seconds'"),
  'P2468: FK_V02 DP9 timer');

const radarJs = fs.readFileSync(path.join(ROOT, 'drivers', 'presence_sensor_radar', 'device.js'), 'utf8');
assert.ok(radarJs.includes('600_000') || radarJs.includes('600000'),
  'P2468: VicHY 10min phantom re-heal');
assert.ok(radarJs.includes('P2468') || radarJs.includes('2232'),
  'P2468: VicHY marker');

const keep = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json'), 'utf8'));
const couples = keep.couples || [];
for (const mfr of ['_TZE200_wt9agwf3', '_TZE200_5uodvhgc', '_TZE200_1n2zev06', '_TZE200_nbqnmkee', '_TZE284_eaet5qt5']) {
  assert.ok(couples.some((c) => String(c.mfr).toLowerCase() === mfr.toLowerCase()),
    `P2468: sacred-keep missing ${mfr}`);
}

console.log('P2468 Joep irrigation + FrankEver + VicHY: PASS');
