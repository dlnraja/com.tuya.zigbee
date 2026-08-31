#!/usr/bin/env node
/**
 * P2347 — Gabriel/A_Tas/Cam/Peter batch enrich (silent).
 * Lock verified couples only; strip #2173 Cartesian DO_NOT_LOCK stubs from catalog.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}
function writeJson(rel, obj) {
  fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(obj, null, 2) + '\n');
}

const VERIFIED_GABRIEL = [
  { mfr: '_TZ3000_OVYAISIP', pid: 'TS0001', driverId: 'wall_switch_1gang_1way', note: 'P2347 Gabriel HS TB25-1 only' },
  { mfr: '_TZ3000_PK8TGTDB', pid: 'TS0001', driverId: 'wall_switch_1gang_1way', note: 'P2347 Gabriel HS 1-gang' },
  { mfr: '_TZ3000_YWUBFUVT', pid: 'TS0002', driverId: 'wall_switch_2gang_1way', note: 'P2347 Z2M TB26-2' },
  { mfr: '_TZ3000_KGXEJ1DV', pid: 'TS0002', driverId: 'wall_switch_2gang_1way', note: 'P2347 Gabriel HS 2-gang' },
  { mfr: '_TZ3000_JJDKHUEQ', pid: 'TS0002', driverId: 'wall_switch_2gang_1way', note: 'P2347 Gabriel HS 2-gang touch' },
  { mfr: '_TZ3000_YERVJNLJ', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', note: 'P2347 Gabriel HS / Johan #1051' },
  { mfr: '_TZ3000_VJHCENZO', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', note: 'P2347 Gabriel 3-gang ZCL' },
  { mfr: '_TZ3000_QXCNWV26', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', note: 'P2347 Gabriel 3-gang ZCL' },
  { mfr: '_TZ3000_EQSAIR32', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', note: 'P2347 Z2M TB26-3' },
  { mfr: '_TZ3000_F09J9QJB', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', note: 'P2347 Gabriel HS 3-gang' },
  { mfr: '_TZ3000_FAWK5XJV', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', note: 'P2347 Z2M 3-gang' },
  { mfr: '_TZ3000_OK0GGPK7', pid: 'TS0003', driverId: 'wall_switch_3gang_1way', note: 'P2347 Z2M 3-gang backlight' },
  { mfr: '_TZ3000_lwthnp7j', pid: 'TS0004', driverId: 'wall_switch_4gang_1way', note: 'P2347 Gabriel 4-gang ZCL touch' },
  { mfr: '_TZE200_SHKXSGIS', pid: 'TS0601', driverId: 'wall_switch_4_gang_tuya', note: 'P2347 HS 4-gang MCU' },
  { mfr: '_TZE284_SHKXSGIS', pid: 'TS0601', driverId: 'wall_switch_4_gang_tuya', note: 'P2347 HS 4-gang MCU' },
  { mfr: '_TZE204_AAGRXLBD', pid: 'TS0601', driverId: 'wall_switch_4_gang_tuya', note: 'P2347 Z2M 4-gang MCU' },
  { mfr: '_TZE200_R731ZLXK', pid: 'TS0601', driverId: 'wall_switch_6_gang_tuya', note: 'P2347 Blakadder TB26-6' },
  { mfr: '_TZE284_R731ZLXK', pid: 'TS0601', driverId: 'wall_switch_6_gang_tuya', note: 'P2347 Z2M 6-gang' },
];

// Soft OEM siblings already in compose — keep compact pins but mark soft
const SOFT_SIBLINGS = [
  { mfr: '_TZE204_SHKXSGIS', pid: 'TS0601', driverId: 'wall_switch_4_gang_tuya', note: 'P2347 soft OEM sibling (HS lists TZE200/284)' },
  { mfr: '_TZE284_AAGRXLBD', pid: 'TS0601', driverId: 'wall_switch_4_gang_tuya', note: 'P2347 soft OEM sibling of TZE204_AAGRXLBD' },
  { mfr: '_TZE204_R731ZLXK', pid: 'TS0601', driverId: 'wall_switch_6_gang_tuya', note: 'P2347 soft OEM sibling R731ZLXK' },
];

function coupleKey(c) {
  return `${String(c.mfr).toLowerCase()}|${String(c.pid).toLowerCase()}|${c.driverId}`;
}

// --- sacred-keep ---
const sk = readJson('config/architecture/publish-sacred-keep-couples.json');
const have = new Set(sk.couples.map(coupleKey));
let added = 0;
for (const c of [...VERIFIED_GABRIEL, ...SOFT_SIBLINGS]) {
  if (!have.has(coupleKey(c))) {
    sk.couples.push(c);
    have.add(coupleKey(c));
    added++;
  } else {
    const hit = sk.couples.find((x) => coupleKey(x) === coupleKey(c));
    if (hit && c.note) hit.note = c.note;
  }
}
// Ensure Cam soft button pin note
const camBtn = sk.couples.find(
  (c) => String(c.mfr).toLowerCase() === '_tz3000_5bpeda8u' && String(c.pid).toUpperCase() === 'TS0041'
);
if (camBtn) camBtn.note = 'P2347 Cam soft smart-button hypothesis NEED_DIAG (hist INT-010)';
writeJson('config/architecture/publish-sacred-keep-couples.json', sk);
console.log('[sacred-keep] added', added, 'total', sk.couples.length);

// --- user-impact-catalog ---
const cat = readJson('data/user-impact-catalog.json');
cat._meta = cat._meta || {};
cat._meta.updated = '2026-08-31';
cat._meta.lastInvestigation = new Date().toISOString();
cat._meta.p2347 = 'Gabriel verified-only + A_Tas/Cam/Peter batch';

const gDevices = [
  {
    tile: '4-gang ZCL touch (NovaDigital)',
    driver: 'wall_switch_4gang_1way',
    couple: '_TZ3000_lwthnp7j+TS0004',
    symptoms: ['gang jitter', 'offline after rejoin', 'pid often ABSENT in #2186/#2188'],
    fixes: ['sacred-keep + compose', 'endpoint jitter hardening', 'P2347 SK pin'],
    userAction: 'Update Test ≥9.0.741; re-pair if still on switch_4gang; send interview if pid absent',
  },
];
for (const c of VERIFIED_GABRIEL) {
  if (c.mfr.toLowerCase() === '_tz3000_lwthnp7j') continue;
  gDevices.push({
    tile: `Zemismart/NovaDigital ${c.driverId}`,
    driver: c.driverId,
    couple: `${c.mfr}+${c.pid}`,
    symptoms: ['#2173 Cartesian dump — only this pid verified (HS/Z2M/BA)'],
    fixes: ['P2347 sacred-keep verified couple', 'compose wall_switch_*'],
    userAction: 'Update Test; re-pair only if wrong driver class',
    verified: true,
  });
}

cat.users.Gabriel_Pedrosa_Mach = {
  ...(cat.users.Gabriel_Pedrosa_Mach || {}),
  forumTopic: 140352,
  posts: [2168, 2172, 2173, 2178, 2182, 2186, 2188],
  diags: [],
  devices: gDevices,
  forbiddenInvent: [
    'Do NOT lock mfr×{TS0001,TS0002,TS0003,TS0601} Cartesian from #2173',
    'Only one verified pid per mfr (HomeSuite / Z2M / Blakadder)',
    'Do not invent TS0004 onto #2186 posts when pid ABSENT — lock is compose-side only',
    'Do not route Gabriel wall family to switch_Ngang or wall_dimmer_tuya',
  ],
  investigationNote:
    'P2347: 18 verified couples locked; Cartesian auto-stubs (wall_dimmer + wrong pids) purged. Soft OEM siblings TZE204_SHKXSGIS / TZE284_AAGRXLBD / TZE204_R731ZLXK kept for compact only.',
  dualApp: 'BOTH',
};

cat.users.A_Tas = {
  ...(cat.users.A_Tas || {}),
  forumTopic: 140352,
  posts: [2199],
  diags: [],
  devices: [
    {
      tile: 'Linptech / Moes mmWave ES1',
      driver: 'motion_sensor_radar_mmwave',
      couple: '_TZ3218_t9ynfz4x+TS0225',
      coupleSource: 'Z2M ES1ZZ(TY) + Gabriel T158757 #2 — A_Tas posts are mfr-only MISSING_PID',
      symptoms: [
        'presence settings save error on stale EF00 DP9 path',
        'forum #2199 / T158757 #1 omit productId',
      ],
      fixes: [
        'P2261 Linptech 0xE002 ZCL settings',
        'P2289 mfr-only ES1 detect',
        'P2298 onSettings soft-fail',
        'P2343/P2347 sacred-keep',
      ],
      userAction:
        'Update Test ≥9.0.741 / Stable after P2343; re-pair mmWave; use Motion/Static/Distance settings; send Homey diag UUID for live cluster confirm',
      needDiag: true,
    },
  ],
  forbiddenInvent: ['Do not invent pid onto A_Tas forum posts; Z2M lock is separate from post text'],
  dualApp: 'BOTH',
};

cat.users.Cam = {
  ...(cat.users.Cam || {}),
  forumTopic: 146735,
  posts: [8],
  diags: [
    {
      logIdShort: '4d7b45a5',
      date: 'historical',
      notes: 'Cam #1160 smart button — TREAT summary empty / access blocked; couple not re-proven',
    },
  ],
  devices: [
    {
      tile: 'HOBEIAN ZG-204ZL motion',
      driver: 'presence_sensor_radar',
      couple: 'HOBEIAN+ZG-204ZL',
      symptoms: ['LED flashes but flows dead', 'HOBEIAN mfr stripped by compact'],
      fixes: ['P2340 sacred-keep HOBEIAN+ZG-204ZL'],
      userAction: 'Update Test ≥9.0.741 + re-pair presence_sensor_radar',
    },
    {
      tile: 'Smart button (T146735 #8)',
      driver: 'button_wireless_1',
      couple: null,
      softHypothesis: '_TZ3000_5bpeda8u+TS0041',
      symptoms: ['pairing no devices found', 'couple ABSENT in post'],
      fixes: ['soft sacred-keep 5bpeda8u+TS0041 (NEED_DIAG)', 'compose button_wireless_1'],
      userAction: 'Send Homey diag + interview with zb_manufacturer_name + zb_model_id while pressing button',
      needDiag: true,
    },
  ],
  forbiddenInvent: ['Do not hard-lock 5bpeda8u from expectations alone onto T146735 #8'],
  dualApp: 'BOTH',
};

const peter = cat.users.Peter_van_Werkhoven || {};
peter.investigationNote =
  'P2347: #2190 tiles remain couple ABSENT (diag 0cea6870 extract empty mfr/pid). Do not invent k4ej3ww2 / mrpevh8p / TS0207. Reliability BOTH already shipped (IAS coerce, skip EF00 IAS-only, SOS battery). Next: fresh diag with [SOS-INIT]/[CONTACT-WAKE] lines.';
peter.forbiddenInvent = [
  ...(peter.forbiddenInvent || []),
  'Do not glue k4ej3ww2, mrpevh8p, or TS0207 onto #2190 tiles',
  'Historical HOBEIAN ZG-204ZV / vvmbj46n are pre-#2190 — do not attach',
];
peter.needDiag = true;
cat.users.Peter_van_Werkhoven = peter;

cat.users.Peter_Kawa = {
  ...(cat.users.Peter_Kawa || {}),
  forumTopic: 146667,
  posts: [23, 25],
  diags: [],
  devices: [],
  investigationNote: 'P2347: soil/button threads — couples ABSENT; NEED_DIAG before lock',
  needDiag: true,
  dualApp: 'BOTH',
};

cat.users.Peter_N = {
  ...(cat.users.Peter_N || {}),
  forumTopic: 89271,
  posts: [668],
  diags: [],
  devices: [
    {
      tile: 'Soil sensor (T89271 #668)',
      driver: 'soil_sensor',
      couple: '_TZE200_myd45weu+TS0601',
      symptoms: ['soil / battery'],
      fixes: ['compose soil_sensor MYD45WEU', 'processor ROUTED_OK'],
      userAction: 'Update Test; re-pair as soil_sensor if wrong class',
    },
  ],
  forbiddenInvent: ['Catalog stub must not map MYD45WEU to wall_dimmer_tuya'],
  dualApp: 'BOTH',
};

writeJson('data/user-impact-catalog.json', cat);
console.log('[catalog] Gabriel devices', gDevices.length);

// --- PECULIARITIES patch ---
const pecPath = path.join(ROOT, 'docs/knowledge/PECULIARITIES.md');
let pec = fs.readFileSync(pecPath, 'utf8');
const block = `### \`gabriel-zemismart-bulk-2173\` (forum #2173 / #2186 / lwthnp7j)

- **#2173 is a Cartesian OEM dump** — each mfr expanded to TS0001|2|3|0601. Lock **one verified pid per mfr** only (HomeSuite + Z2M + Blakadder).
- Verified 1-gang: \`_TZ3000_OVYAISIP\`+\`TS0001\`, \`_TZ3000_PK8TGTDB\`+\`TS0001\` → \`wall_switch_1gang_1way\`
- Verified 2-gang: \`YWUBFUVT\`/\`KGXEJ1DV\`/\`JJDKHUEQ\`+\`TS0002\` → \`wall_switch_2gang_1way\`
- Verified 3-gang: \`YERVJNLJ\`/\`VJHCENZO\`/\`QXCNWV26\`/\`EQSAIR32\`/\`F09J9QJB\`/\`FAWK5XJV\`/\`OK0GGPK7\`+\`TS0003\` → \`wall_switch_3gang_1way\`
- Verified 4-gang ZCL: \`_TZ3000_lwthnp7j\`+\`TS0004\` → \`wall_switch_4gang_1way\` (never \`switch_4gang\` / EF00)
- Verified 4-gang MCU: \`_TZE200/_TZE284_SHKXSGIS\`, \`_TZE204_AAGRXLBD\`+\`TS0601\` → \`wall_switch_4_gang_tuya\`
- Verified 6-gang MCU: \`_TZE200/_TZE284_R731ZLXK\`+\`TS0601\` → \`wall_switch_6_gang_tuya\`
- Soft OEM siblings (compact pins only): \`_TZE204_SHKXSGIS\`, \`_TZE284_AAGRXLBD\`, \`_TZE204_R731ZLXK\`
- **Forbidden:** Cartesian cross-pids; routing to \`switch_Ngang\` or \`wall_dimmer_tuya\`; inventing pid onto #2186 when ABSENT
- P2343/P2347 sacred-keep pins prevent compact drop
- Sources: HomeSuite device table, Z2M herdsman, Blakadder TB26-6, forum-140352#2173

### \`p2347-cam-smart-button-need-diag\` → \`button_wireless_1\` (Cam T146735 #8)

- Motion locked: \`HOBEIAN\`+\`ZG-204ZL\` → \`presence_sensor_radar\` (P2340)
- Smart button couple **ABSENT** in post; hist diag \`4d7b45a5\` (#1160) not re-proven
- Soft hypothesis only: \`_TZ3000_5bpeda8u\`+\`TS0041\` — NEED_DIAG interview
- Do not invent Cam button pid from Peter / 4x4_Pete radar posts

### \`p2347-peter-2190-absent\` → multi-tile (Peter_van_Werkhoven)

- Diags \`0cea6870\` / \`1cf775a2\` known; extract has **0** mfr/pid lines
- Tiles SOS / contact / water / smartbutton remain \`couple: null\`
- Do not glue \`k4ej3ww2\`, \`mrpevh8p\`, \`TS0207\` onto #2190
- Reliability BOTH already: IAS coerce, skip IAS-only EF00 TX, SOS battery debounce
`;

if (pec.includes('### `gabriel-zemismart-bulk-2173`')) {
  pec = pec.replace(
    /### `gabriel-zemismart-bulk-2173`[\s\S]*?(?=\n### |\n## |$)/,
    `${block}\n`
  );
} else {
  pec += `\n${block}\n`;
}
fs.writeFileSync(pecPath, pec);
console.log('[PECULIARITIES] updated');

console.log('P2347 enrich OK');
