#!/usr/bin/env node
'use strict';

/**
 * Build the per-driver device-truth catalog for AI agents.
 *
 * WHY: Every prompt must look up manufacturerName+productId facts instead of
 * inventing pids or mixing climate/dimmer/switch drivers.
 * HOW: Read driver.compose.json + user-misattribution-registry + known zcl_only.
 * WHO: IDE agents (Cursor). Not loaded on Homey (docs/ is .homeyignore).
 * WHEN: After compose/registry edits; weekly self-improve; this session.
 * AGAINST: Stale DEVICE_MATRIX.md and guessing from retail SKUs.
 *
 * Usage: node tools/ci/build-device-truth.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const REG_PATH = path.join(ROOT, 'data', 'user-misattribution-registry.json');
const OUT_DIR = path.join(ROOT, 'docs', 'knowledge');
const OUT_JSON = path.join(OUT_DIR, 'device-truth.json');
const OUT_MD = path.join(OUT_DIR, 'DEVICE_TRUTH.md');

const SYNTHETIC_RX = /_hybrid_|needs_device_assignment|_GENERIC_|_dummy_|placeholder/i;
const EF00 = 61184;

const ZCL_ONLY_MFRS = [
  '_TZ3000_l9brjwau', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk',
  '_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt',
  '_TZ3000_cauq1okq', '_TZ3000_w5xztuy7',
].map((s) => s.toLowerCase());

function uniq(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function collectClusters(zigbee) {
  const ids = new Set();
  const eps = zigbee.endpoints || {};
  for (const ep of Object.values(eps)) {
    for (const c of ep.clusters || []) {
      const n = typeof c === 'number' ? c : Number(c);
      if (Number.isFinite(n)) ids.add(n);
    }
  }
  return [...ids];
}

function inferProtocol(driverId, zigbee, batteries, clusters, registryHits) {
  const protoHit = (registryHits.find((c) => c.protocol) || {}).protocol;
  if (protoHit === 'zcl' || protoHit === 'zcl_only' || protoHit === 'ias_zone') return protoHit === 'zcl' ? 'zcl' : protoHit;
  if (protoHit === 'tuya_ef00' || protoHit === 'ef00') return 'tuya_ef00';
  const mfrs = (zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
  if (mfrs.some((m) => ZCL_ONLY_MFRS.includes(m))) return 'zcl_only';
  if (clusters.includes(EF00)) return 'tuya_ef00';
  const pids = zigbee.productId || [];
  if (pids.includes('TS0601') && mfrs.some((m) => m.startsWith('_tze'))) return 'tuya_ef00';
  if (batteries.length) return 'zcl_sleepy';
  return 'zcl';
}

function loadRegistry() {
  try {
    return JSON.parse(Buffer.from(fs.readFileSync(REG_PATH)).toString('utf8'));
  } catch {
    return { cases: [] };
  }
}

function main() {
  const registry = loadRegistry();
  const cases = registry.cases || [];
  const byDriver = new Map();
  for (const c of cases) {
    const id = c.canonicalDriver;
    if (!id) continue;
    if (!byDriver.has(id)) byDriver.set(id, []);
    byDriver.get(id).push(c);
  }

  const driverIds = fs.readdirSync(DRIVERS).filter((d) => {
    return fs.existsSync(path.join(DRIVERS, d, 'driver.compose.json'));
  }).sort();

  const drivers = {};
  for (const id of driverIds) {
    let compose;
    try {
      compose = JSON.parse(fs.readFileSync(path.join(DRIVERS, id, 'driver.compose.json'), 'utf8'));
    } catch {
      continue;
    }
    const zigbee = compose.zigbee || {};
    const rawMfrs = zigbee.manufacturerName || [];
    const mfrs = uniq(rawMfrs.map((m) => String(m))).filter((m) => !SYNTHETIC_RX.test(m));
    const pids = uniq(zigbee.productId || []);
    const caps = compose.capabilities || [];
    const batteries = compose.energy?.batteries || [];
    const clusters = collectClusters(zigbee);
    const hits = byDriver.get(id) || [];
    const protocol = inferProtocol(id, zigbee, batteries, clusters, hits);
    const mains = !batteries.length && (
      caps.includes('measure_power')
      || /switch|plug|dimmer|relay|wall_|curtain|thermostat/i.test(id)
    );
    const peculiarities = [];
    if (id === 'wall_dimmer_tuya') {
      peculiarities.push('MCU brightness 0–1000 via TuyaBrightnessScale; never write >1000');
      peculiarities.push('Sacred couple _TZE284_m1cvyneb+TS0601 only; forbid climate/soil/universal');
    }
    if (id === 'button_emergency_sos' || id === 'water_leak_sensor' || id === 'contact_sensor') {
      peculiarities.push('Sleepy IAS: enroll on wake, no boot poll storm, no leftover EF00 TX');
    }
    if (id === 'water_leak_sensor') {
      peculiarities.push('TS0207 pid is shared with mains repeaters — lock k4ej3ww2 IAS, never rain/repeater default');
    }
    if (id === 'soil_sensor') {
      peculiarities.push('nt4pquef+TS0601: DP2 light enum (not moisture), DP3 soil %, DP5 temp/10; do not compose 0xED00');
    }
    if (id === 'plug_energy_monitor') {
      peculiarities.push('okaz9tjs TS011F_plug_3: fw 1.0.5+ needs electrical poll; pid TS011F is also DIN/strip/double-outlet');
    }
    if (id === 'switch_temp_sensor') {
      peculiarities.push('7fiyo3kv/ya5d6wth + TS000F hybrid: ZCL onoff + EF00 DP102 temp/10; re-pair if 1-gang');
    }
    if (id === 'zigbee_repeater') {
      peculiarities.push('TS0207_repeater family (5k5vh43t) — no IAS, not water leak');
    }
    if (/wall_switch_\dgang/.test(id)) {
      peculiarities.push('Sub-device tiles; EP1-only backlight/mode; leftover 0xEF00 is zcl_only');
    }
    for (const c of hits) {
      if (c.notes) peculiarities.push(c.notes);
    }

    drivers[id] = {
      id,
      class: compose.class || null,
      name: compose.name?.en || id,
      protocol,
      productIds: pids,
      manufacturerCount: mfrs.length,
      manufacturersSample: mfrs.slice(0, 8),
      capabilities: caps.slice(0, 16),
      batteries,
      mainsPowered: Boolean(mains && !batteries.length),
      hasEf00Cluster: clusters.includes(EF00),
      endpointCount: Object.keys(zigbee.endpoints || {}).length,
      locks: hits.map((c) => ({
        caseId: c.id,
        mfr: [].concat(c.mfr || []).slice(0, 6),
        productId: c.productId || [],
        forbidden: (c.forbiddenDrivers || []).slice(0, 10),
        protocol: c.protocol || null,
        notes: c.notes || null,
      })),
      peculiarities: uniq(peculiarities).slice(0, 6),
    };
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'tools/ci/build-device-truth.js',
    doctrine: 'Fingerprint = manufacturerName + productId. Never invent a pid. Never POST on Homey forum.',
    driverCount: Object.keys(drivers).length,
    lockCount: cases.length,
    lookup: {
      byDriver: 'drivers.<driverId>',
      byCouple: 'scan locks[].mfr + locks[].productId, or Grep compose',
    },
    crossLinks: [
      'AI_CONTEXT_MANDATE.md',
      'docs/GLOBAL_INVESTIGATION_PLAN.md',
      'docs/ARCHITECTURE_AI.md',
      'docs/rules/WHY_INTERROGATION.md',
      'docs/rules/DUAL_APP_VISION.md',
      'docs/rules/FORUM_SILENT_HUMANIZE.md',
      'data/user-misattribution-registry.json',
      'docs/knowledge/PECULIARITIES.md',
      'drivers/<id>/driver.compose.json',
      '.cursor/rules/device-truth.mdc',
    ],
    drivers,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);

  const lines = [
    '# Device truth catalog (every AI prompt)',
    '',
    '> Generated by `tools/ci/build-device-truth.js`. **Not** Homey runtime — `docs/` is excluded from the app bundle.',
    '',
    '## Why / How / Who / When / Against',
    '',
    '| | |',
    '|---|---|',
    '| **Pourquoi** | Stop inventing productIds and mixing climate / dimmer / switch / SOS drivers. |',
    '| **Comment** | Look up `docs/knowledge/device-truth.json` → then lock the couple in `drivers/<id>/driver.compose.json` + `data/user-misattribution-registry.json`. |',
    '| **Pour qui** | Cursor / CI agents. Homey users benefit via correct pairing. |',
    '| **Quand** | Every prompt that touches a device, fingerprint, Flow, or publish. |',
    '| **Contre quoi** | Retail SKU-as-pid, mfr-only routing, forum auto-replies, Publish Stable→Test while 9.x soaks. |',
    '',
    '## Lookup (do this every prompt)',
    '',
    '1. Extract **manufacturerName + productId** from the user / log / forum / PM. Never invent the pid.',
    '2. Grep this folder + `data/user-misattribution-registry.json` + `drivers/*/driver.compose.json` for that couple.',
    '3. Read `docs/knowledge/device-truth.json` key `drivers.<driverId>` for protocol, batteries, locks, peculiarities.',
    '4. Cross-check rules: `AI_CONTEXT_MANDATE.md`, `docs/ARCHITECTURE_AI.md`, `docs/rules/WHY_INTERROGATION.md`, `docs/rules/DUAL_APP_VISION.md`, `docs/rules/FORUM_SILENT_HUMANIZE.md`, `.cursorrules`.',
    '5. **Publish** means Homey App Store (master Test 9.0.x). **Do not post** means no Homey Community / PM replies.',
    '',
    `Catalog: **${payload.driverCount}** drivers, **${payload.lockCount}** locked community cases.`,
    '',
    '## Locked couples (canonical, 1 by 1)',
    '',
    '| Case | Driver | Couple | Forbidden | Protocol |',
    '|---|---|---|---|---|',
  ];

  for (const c of cases) {
    const mfr = [].concat(c.mfr || [])[0] || '';
    const pid = (c.productId || []).join(', ');
    const forbid = (c.forbiddenDrivers || []).slice(0, 4).join(', ');
    lines.push(`| ${c.id} | \`${c.canonicalDriver}\` | \`${mfr}\` + ${pid} | ${forbid} | ${c.protocol || ''} |`);
  }

  lines.push('', '## All drivers (1 by 1)', '', '| Driver | Class | Protocol | Product IDs | Power | Mfrs | Locks | Peculiarities |', '|---|---|---|---|---|---|---|---|');

  for (const id of Object.keys(drivers).sort()) {
    const d = drivers[id];
    const power = d.batteries.length ? d.batteries.join('/') : (d.mainsPowered ? 'mains' : 'unknown');
    const pec = (d.peculiarities[0] || '').replace(/\|/g, '/').slice(0, 90);
    lines.push(`| \`${id}\` | ${d.class || ''} | ${d.protocol} | ${(d.productIds || []).slice(0, 6).join(', ')} | ${power} | ${d.manufacturerCount} | ${d.locks.length} | ${pec} |`);
  }

  lines.push('', 'Regenerate: `node tools/ci/build-device-truth.js`', '');
  fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`);
  console.log(`[device-truth] drivers=${payload.driverCount} locks=${payload.lockCount}`);
  console.log('[device-truth] wrote', path.relative(ROOT, OUT_JSON), path.relative(ROOT, OUT_MD));
}

main();
