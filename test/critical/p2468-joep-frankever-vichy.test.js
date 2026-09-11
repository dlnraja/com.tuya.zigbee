'use strict';

/**
 * P2468 — Joep irrigation + FrankEver NEED_INTERVIEW + VicHY #2232
 * Contre quoi:
 * - Joep #2218 Insoma: compose must match interview [0,4,5,61184] (never force OnOff 6 → Unknown)
 * - FrankEver: FK_V02 vs FK-BV05 DP maps + sacred-keep (never invent live Gmail pid)
 * - VicHY #2232: mains radar phantom re-heal must include 10min delay after tip update
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// --- Joep / Insoma dual irrigation ---
const dualCompose = readJson('drivers/valve_dual_irrigation/driver.compose.json');
const dualClusters = dualCompose.zigbee.endpoints['1'].clusters;
assert.deepStrictEqual(dualClusters, [0, 4, 5, 61184],
  'P2468: valve_dual_irrigation clusters must match Joep interview (no OnOff 6)');
assert.ok(!dualClusters.includes(6), 'P2468: must not require cluster 6');

const dualMfrs = (dualCompose.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
for (const mfr of ['_tze284_fhvpaltk', '_tze284_eaet5qt5']) {
  assert.ok(dualMfrs.includes(mfr), `P2468: compose missing ${mfr}`);
}
assert.ok((dualCompose.zigbee.productId || []).includes('TS0601'), 'P2468: dual irrigation pid TS0601');

const app = readJson('app.json');
const dualApp = (app.drivers || []).find((d) => d.id === 'valve_dual_irrigation');
assert.ok(dualApp, 'P2468: valve_dual_irrigation in app.json');
assert.deepStrictEqual(dualApp.zigbee.endpoints['1'].clusters, [0, 4, 5, 61184],
  'P2468: app.json zigbee clusters must stay synced with compose (auto-fix-all regress)');

// --- FrankEver water valve (soft family; live diag = NEED_INTERVIEW) ---
const valveJs = readText('drivers/water_valve_smart/device.js');
assert.ok(valveJs.includes('FRANKEVER_FK_V02_MFRS'), 'P2468: FK_V02 mfr list');
assert.ok(valveJs.includes('FRANKEVER_FK_BV05_MFRS'), 'P2468: FK-BV05 mfr list');
assert.ok(valveJs.includes('isFrankeverFkV02'), 'P2468: FK_V02 DP path');
assert.ok(valveJs.includes('isFrankeverFkBv05'), 'P2468: FK-BV05 DP path');
assert.ok(valveJs.includes("'_tze200_wt9agwf3'") || valveJs.includes('_tze200_wt9agwf3'),
  'P2468: FK_V02 wt9agwf3');
assert.ok(valveJs.includes("'_tze200_nbqnmkee'") || valveJs.includes('_tze200_nbqnmkee'),
  'P2468: FK-BV05 nbqnmkee');
assert.ok(/9:\s*\{\s*capability:\s*null,\s*internal:\s*'countdown_seconds'/.test(valveJs),
  'P2468: FK_V02 DP9 countdown_seconds');
assert.ok(/101:\s*\{\s*capability:\s*null,\s*internal:\s*'threshold_pct'/.test(valveJs),
  'P2468: FK_V02 DP101 threshold_pct');
assert.ok(/2:\s*\{\s*capability:\s*null,\s*internal:\s*'threshold_pct'/.test(valveJs),
  'P2468: FK-BV05 DP2 threshold_pct');
assert.ok(!/invent.*frankever.*pid/i.test(valveJs), 'P2468: no invent-pid comments as live lock');

const keep = readJson('config/architecture/publish-sacred-keep-couples.json');
const couples = keep.couples || [];
for (const mfr of [
  '_TZE200_wt9agwf3', '_TZE200_5uodvhgc', '_TZE200_1n2zev06',
  '_TZE200_nbqnmkee', '_TZE284_eaet5qt5', '_TZE284_fhvpaltk',
]) {
  assert.ok(
    couples.some((c) => String(c.mfr || c.manufacturerName || '').toLowerCase() === mfr.toLowerCase()),
    `P2468: sacred-keep missing ${mfr}`,
  );
}

const registry = readJson('data/user-misattribution-registry.json');
const registryText = JSON.stringify(registry);
for (const token of ['wt9agwf3', 'nbqnmkee', 'fhvpaltk', 'P2468']) {
  assert.ok(registryText.toLowerCase().includes(token.toLowerCase()),
    `P2468: misattribution registry missing ${token}`);
}

// --- VicHY #2232 radar phantom re-heal ---
const radarJs = readText('drivers/presence_sensor_radar/device.js');
assert.ok(/_scheduleRadarPhantomReheal\s*\(/.test(radarJs), 'P2468: re-heal scheduler');
assert.ok(
  /delays\s*=\s*\[[^\]]*(600_000|600000)/.test(radarJs),
  'P2468: VicHY 10min delay in phantom re-heal schedule',
);
assert.ok(radarJs.includes('P2468') || radarJs.includes('2232'), 'P2468: VicHY marker');

console.log('P2468 Joep irrigation + FrankEver + VicHY: PASS');
