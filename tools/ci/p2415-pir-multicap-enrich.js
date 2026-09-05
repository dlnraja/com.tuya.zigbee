'use strict';

/**
 * P2415 — PIR / multi-cap presence enrich (verified couples only)
 *
 * WHY: ZG-204ZV TZE200 siblings sat on motion_sensor; ZG-204* pids polluted
 * motion cartesian; soil o9ofysmo wrongly listed in radar configs; curtain
 * r0jdjrvi wrongly in ZY_M100 radar config.
 *
 * Sources: Z2M ZG-204ZV, ZHA #4268, Z2M #27955 (soil — NOT radar).
 * Never invent productIds.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function loadCompose(rel) {
  const p = path.join(ROOT, rel);
  return { p, j: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function saveCompose(entry) {
  fs.writeFileSync(entry.p, `${JSON.stringify(entry.j, null, 2)}\n`);
}

function normList(arr) {
  return Array.isArray(arr) ? arr : [];
}

function addMfr(compose, mfrs) {
  const zig = compose.j.zigbee || (compose.j.zigbee = {});
  const list = normList(zig.manufacturerName);
  const lower = new Set(list.map((x) => String(x).toLowerCase()));
  let added = 0;
  for (const m of mfrs) {
    if (!lower.has(String(m).toLowerCase())) {
      list.push(m);
      lower.add(String(m).toLowerCase());
      added++;
    }
  }
  zig.manufacturerName = list;
  return added;
}

function removeMfr(compose, mfrs) {
  const zig = compose.j.zigbee || {};
  const drop = new Set(mfrs.map((x) => String(x).toLowerCase()));
  const before = normList(zig.manufacturerName).length;
  zig.manufacturerName = normList(zig.manufacturerName).filter((x) => !drop.has(String(x).toLowerCase()));
  return before - zig.manufacturerName.length;
}

function removePids(compose, pids) {
  const zig = compose.j.zigbee || {};
  const drop = new Set(pids.map((x) => String(x)));
  const before = normList(zig.productId).length;
  zig.productId = normList(zig.productId).filter((x) => !drop.has(String(x)));
  return before - zig.productId.length;
}

const presence = loadCompose('drivers/presence_sensor_radar/driver.compose.json');
const motion = loadCompose('drivers/motion_sensor/driver.compose.json');
const illum = loadCompose('drivers/sensor_illuminance_presence/driver.compose.json');

const zg204zvTze200 = [
  '_TZE200_grgol3xp', '_tze200_grgol3xp',
  '_TZE200_uli8wasj', '_tze200_uli8wasj',
  '_TZE200_rhgsbacq', '_tze200_rhgsbacq', // already on presence — idempotent
];

const muvkrjr5Siblings = [
  '_TZE200_muvkrjr5', '_tze200_muvkrjr5',
];

const y8jijhbaAll = [
  '_TZE204_y8jijhba', '_tze204_y8jijhba',
  '_TZE200_y8jijhba', '_tze200_y8jijhba',
];

const report = {
  patch: 'P2415',
  addedPresence: 0,
  removedMotion: 0,
  removedIllum: 0,
  removedMotionPids: 0,
  configFixes: [],
};

report.addedPresence += addMfr(presence, zg204zvTze200);
report.addedPresence += addMfr(presence, muvkrjr5Siblings);
report.addedPresence += addMfr(presence, y8jijhbaAll);

report.removedMotion += removeMfr(motion, [
  '_TZE200_grgol3xp', '_tze200_grgol3xp',
  '_TZE200_uli8wasj', '_tze200_uli8wasj',
]);

report.removedIllum += removeMfr(illum, [
  '_TZE204_y8jijhba', '_tze204_y8jijhba',
]);

// WHY(P2415): HOBEIAN ZG-204*/205* belong on presence_sensor_radar with HOBEIAN mfr —
// listing those pids on motion_sensor creates cartesian false matches.
report.removedMotionPids += removePids(motion, [
  'ZG-204Z', 'ZG-204ZE', 'ZG-204ZH', 'ZG-204ZK', 'ZG-204ZL',
  'ZG-204ZM', 'ZG-204ZQ', 'ZG-204ZV', 'ZG-205Z', 'ZG-205ZL',
]);

saveCompose(presence);
saveCompose(motion);
saveCompose(illum);

// configs.js — remove soil/curtain false positives from radar config lists
const configsPath = path.join(ROOT, 'drivers/presence_sensor_radar/configs.js');
let configs = fs.readFileSync(configsPath, 'utf8');
const beforeConfigs = configs;
// Remove r0jdjrvi from ZY_M100 list (curtain couple)
configs = configs.replace(/,?\s*'_TZE204_r0jdjrvi'/g, '');
configs = configs.replace(/,?\s*'_TZE200_r0jdjrvi'/g, '');
// Remove soil sensors from TZE284_IADRO9BF (Z2M ZS-301Z)
configs = configs.replace(/,?\s*'_TZE284_o9ofysmo'/g, '');
configs = configs.replace(/,?\s*'_TZE284_xc3vwx5a'/g, '');
// Remove unverified curtain collision from KA8 battery list (leave on curtain until Z2M couple)
configs = configs.replace(/,?\s*'_TZE200_zbfmvj13'/g, '');
configs = configs.replace(/,?\s*'_tze200_zbfmvj13'/g, '');
configs = configs.replace(/,?\s*'_TZE200_ZBFMVJ13'/g, '');
if (configs !== beforeConfigs) {
  fs.writeFileSync(configsPath, configs);
  report.configFixes.push('stripped r0jdjrvi / o9ofysmo / xc3vwx5a / zbfmvj13 from radar configs');
}

// misattribution registry enrich
const regPath = path.join(ROOT, 'data/user-misattribution-registry.json');
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
const cases = Array.isArray(reg.cases) ? reg.cases : (reg.cases = []);
const id = 'p2415-zg204zv-tze200-presence';
if (!cases.some((c) => c.id === id)) {
  cases.push({
    id,
    patch: 'P2415',
    couple: ['_TZE200_grgol3xp+TS0601', '_TZE200_uli8wasj+TS0601', '_TZE200_rhgsbacq+TS0601'],
    canonicalDriver: 'presence_sensor_radar',
    forbidDrivers: ['motion_sensor', 'sensor_illuminance_presence', 'climate_sensor'],
    note: 'ZG-204ZV multi-cap (PIR+radar+climate+lux) — Z2M/ZHA verified; TZE200 siblings lock to presence',
    sources: ['Z2M ZG-204ZV', 'ZHA #4268'],
  });
  fs.writeFileSync(regPath, `${JSON.stringify(reg, null, 2)}\n`);
  report.configFixes.push('misattribution registry +p2415');
}

const outDir = path.join(ROOT, 'reports/pir-p2415-2026-09-03');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'TREAT.md'), `# P2415 PIR / multi-cap presence enrich — 2026-09-03

Silent only. Verified couples only (no invented pids).

## Locks
| Couple | Driver |
|--------|--------|
| \`_TZE200_grgol3xp\`+\`TS0601\` | \`presence_sensor_radar\` (was motion) |
| \`_TZE200_uli8wasj\`+\`TS0601\` | \`presence_sensor_radar\` (was motion) |
| \`_TZE204_y8jijhba\`+\`TS0601\` | \`presence_sensor_radar\` (was illuminance_presence) |
| \`_TZE200_muvkrjr5\`+\`TS0601\` | \`presence_sensor_radar\` sibling |

## Cartesian harden
Removed ZG-204*/ZG-205* productIds from \`motion_sensor\` (HOBEIAN couples stay on presence).

## Config clean
- Drop curtain \`r0jdjrvi\` from ZY_M100 radar list
- Drop soil \`o9ofysmo\`/\`xc3vwx5a\` (Z2M ZS-301Z) from IADRO9BF radar list
- Drop unverified \`zbfmvj13\` from KA8 battery radar list (stays curtain until proven)

## Report
\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`

## Dual-app
**BOTH** — pairing reliability / misroute.

## Broader
Forum silent + apply-mfr-pid dry cycles continue separately for other device classes.
`);

console.log(JSON.stringify(report, null, 2));
