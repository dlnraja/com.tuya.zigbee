'use strict';

/**
 * P2530 — Recent-device complementary variant + capability completer
 * Seeds = recently enriched sacred couples; search catalogs for OEM siblings
 * (TZE200/204/284), case forms; union missing capabilities.
 * NEVER invent pid. Complementary only (P2520).
 *
 *   node tools/ci/recent-variant-capability-completer.js
 *   node tools/ci/recent-variant-capability-completer.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const {
  unionStrings,
  unionCapabilities,
  appendIdentityStrings,
} = require('../../lib/enrichment/ComplementaryMerge');

const SEEDS = [
  // Curtains / covers
  { suffix: '5slehgeo', driver: 'curtain_motor', family: 'moes_cover', caps: ['windowcoverings_state', 'windowcoverings_set'] },
  { suffix: 'nhyj64w2', driver: 'curtain_motor', family: 'moes_cover', caps: ['windowcoverings_state', 'windowcoverings_set'] },
  { suffix: '127x7wnl', driver: 'curtain_motor', family: 'moes_cover', caps: ['windowcoverings_state', 'windowcoverings_set'] },
  { suffix: 'upt8lzi0', driver: 'curtain_motor', family: 'moes_cover', caps: ['windowcoverings_state', 'windowcoverings_set'] },
  { suffix: 'i8sdouy0', driver: 'curtain_motor', family: 'moes_cover', caps: ['windowcoverings_state', 'windowcoverings_set'] },
  { suffix: 'fodv6bkr', driver: 'curtain_motor', family: 'tubular', caps: ['windowcoverings_state', 'windowcoverings_set', 'measure_battery'] },
  { suffix: 'libht6ua', driver: 'curtain_motor', family: 'tubular', caps: ['windowcoverings_state', 'windowcoverings_set', 'measure_battery'] },
  { suffix: 'icka1clh', driver: 'curtain_motor', family: 'am43', caps: ['windowcoverings_state', 'windowcoverings_set', 'measure_battery'] },
  { suffix: 'zah67ekd', driver: 'curtain_motor', family: 'am43', caps: ['windowcoverings_state', 'windowcoverings_set', 'measure_battery'] },
  { suffix: '3mzb0sdz', driver: 'curtain_motor', family: 'zm16b', caps: ['windowcoverings_state', 'windowcoverings_set', 'measure_battery'] },
  // WHY(P2530b): Moes SFC02 wall curtain switch — never curtain_motor
  { suffix: 'kq1l5eu5', driver: 'wall_curtain_switch', family: 'moes_sfc02', prefix: 'TZE', caps: ['windowcoverings_state', 'windowcoverings_set'] },
  // Radar / presence (mains — no measure_battery)
  { suffix: 'gkfbdvyx', driver: 'presence_sensor_radar', family: 'ceiling_24g', prefix: 'TZE', caps: ['alarm_motion', 'alarm_human', 'measure_luminance'] },
  { suffix: 'clrdrnya', driver: 'presence_sensor_radar', family: 'mtg075', prefix: 'TZE', caps: ['alarm_motion', 'alarm_human', 'measure_luminance'] },
  { suffix: 'iadro9bf', driver: 'presence_sensor_radar', family: 'ceiling_24g', prefix: 'TZE', caps: ['alarm_motion', 'alarm_human', 'measure_luminance'] },
  { suffix: 'qasjif9e', driver: 'presence_sensor_radar', family: 'ceiling_24g', prefix: 'TZE', caps: ['alarm_motion', 'alarm_human', 'measure_luminance'] },
  { suffix: 'sxm7l9xa', driver: 'presence_sensor_radar', family: 'ceiling_24g', prefix: 'TZE', caps: ['alarm_motion', 'alarm_human', 'measure_luminance'] },
  // Dimmer / valves / sensors
  { suffix: 'm1cvyneb', driver: 'wall_dimmer_tuya', family: 'bseed_dimmer', prefix: 'TZE', caps: ['onoff', 'dim'] },
  { suffix: 'fhvpaltk', driver: 'valve_dual_irrigation', family: 'insoma', prefix: 'TZE', caps: ['onoff.valve_1', 'onoff.valve_2', 'measure_battery'] },
  { suffix: 'nt4pquef', driver: 'soil_sensor', family: 'sgs02', prefix: 'TZE', caps: ['measure_humidity.soil', 'measure_temperature', 'measure_battery'] },
  { suffix: '6ocnqlhn', driver: 'din_rail_meter', family: 'tongou', prefix: 'TZE', caps: ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'] },
  { suffix: 'pay2byax', driver: 'contact_sensor_zigbee', family: 'contact_ef00', prefix: 'TZE', caps: ['alarm_contact', 'measure_battery'] },
  // TZ3000 buttons / knobs / switches
  { suffix: 'mrpevh8p', driver: 'button_wireless_1', family: 'smartbutton', prefix: 'TZ3000', caps: ['measure_battery'] },
  { suffix: '4upl1fcj', driver: 'button_wireless_1', family: 'smartbutton', prefix: 'TZ3000', caps: ['measure_battery'] },
  { suffix: 'zgyzgdua', driver: 'scene_switch_4', family: 'ts0044', prefix: 'TZ3000', caps: ['measure_battery', 'button.1', 'button.2', 'button.3', 'button.4'] },
  { suffix: 'uri7ongn', driver: 'smart_knob', family: 'ers10', prefix: 'TZ3000', caps: ['dim', 'measure_battery'] },
  { suffix: 'ixla93vd', driver: 'smart_knob', family: 'ers10', prefix: 'TZ3000', caps: ['dim', 'measure_battery'] },
  { suffix: 'g9g2xnch', driver: 'smart_knob', family: 'ers10', prefix: 'TZ3000', caps: ['dim', 'measure_battery'] },
  { suffix: '402vrq2i', driver: 'smart_knob', family: 'zg101zd', prefix: 'TZ3000', caps: ['dim', 'measure_battery'] },
  { suffix: 'kaflzta4', driver: 'smart_knob', family: 'scene_knob', prefix: 'TZ3000', caps: ['measure_battery'] },
  { suffix: 'ja5osu5g', driver: 'smart_knob', family: 'scene_knob', prefix: 'TZ3000', caps: ['measure_battery'] },
  { suffix: 'xffhmvhv', driver: 'button_wireless_4', family: 'nobo', prefix: 'TZ3000', caps: ['measure_battery', 'button.1', 'button.2', 'button.3', 'button.4'] },
  { suffix: 'abrsvsou', driver: 'button_wireless_4', family: 'ts004f_4btn', prefix: 'TZ3000', caps: ['measure_battery', 'button.1', 'button.2', 'button.3', 'button.4'] },
  { suffix: 'kfu8zapd', driver: 'button_wireless_4', family: 'ts0044', prefix: 'TZ3000', caps: ['measure_battery', 'button.1', 'button.2', 'button.3', 'button.4'] },
  { suffix: 'k4ej3ww2', driver: 'water_leak_sensor', family: 'ias_leak', prefix: 'TZ3000', caps: ['alarm_water', 'measure_battery'] },
  { suffix: 'lwthnp7j', driver: 'wall_switch_4gang_1way', family: 'gabriel_4g', prefix: 'TZ3000', caps: ['onoff', 'onoff.gang2', 'onoff.gang3', 'onoff.gang4'] },
  { suffix: 'okaz9tjs', driver: 'plug_energy_monitor', family: 'ts011f', prefix: 'TZ3000', caps: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'] },
  { suffix: 'fgwhjm9j', driver: 'plug_energy_monitor', family: 'ts011f', prefix: 'TZ3210', caps: ['onoff', 'measure_power', 'meter_power'] },
  { suffix: 'qeuvnohg', driver: 'din_rail_switch', family: 'din_switch', prefix: 'TZ3000', caps: ['onoff'] },
  { suffix: 'w5xztuy7', driver: 'switch_2gang', family: 'bseed_zcl', prefix: 'TZ3000', caps: ['onoff'] },
  // ZHA PR #4363 / Z2M somgoms TS0601 gang switches — OEM overlays
  { suffix: '7tdtqgwv', driver: 'switch_1gang', family: 'somgoms', prefix: 'TZE', caps: ['onoff'] },
  { suffix: 'nkjintbl', driver: 'switch_2gang', family: 'somgoms', prefix: 'TZE', caps: ['onoff'] },
  { suffix: 'seq9cm6u', driver: 'bed_sensor', family: 'pir_bed', prefix: 'TZE', caps: ['alarm_motion', 'measure_battery'] },
];

// WHY(P2531): union SSOT highRiskLocks as complementary seeds (OEM overlays on generics)
(function absorbSacredSsotSeeds() {
  try {
    const ssotPath = path.join(ROOT, 'config/architecture/sacred-couple-ssot.json');
    if (!fs.existsSync(ssotPath)) return;
    const ssot = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));
    const have = new Set(SEEDS.map((s) => `${s.driver}|${String(s.suffix).toLowerCase()}`));
    for (const lock of ssot.highRiskLocks || []) {
      const mfr = String(lock.mfr || '');
      const driver = lock.driver;
      if (!mfr || !driver) continue;
      let prefix = 'TZE';
      let suffix = '';
      const tze = mfr.match(/^_TZE(?:200|204|284)_([A-Za-z0-9]+)$/i);
      const tz3 = mfr.match(/^_TZ3000_([A-Za-z0-9]+)$/i);
      const tz3210 = mfr.match(/^_TZ3210_([A-Za-z0-9]+)$/i);
      if (tze) {
        prefix = 'TZE';
        suffix = tze[1].toLowerCase();
      } else if (tz3) {
        prefix = 'TZ3000';
        suffix = tz3[1].toLowerCase();
      } else if (tz3210) {
        prefix = 'TZ3210';
        suffix = tz3210[1].toLowerCase();
      } else continue;
      const key = `${driver}|${suffix}`;
      if (have.has(key)) continue;
      have.add(key);
      SEEDS.push({
        suffix,
        driver,
        family: 'ssot_high_risk',
        prefix,
        caps: [],
      });
    }
  } catch (e) {
    console.warn('[P2530] SSOT seed absorb soft-fail', e.message);
  }
}());

// Default prefix TZE for curtain seeds above — patch first block
for (const s of SEEDS) {
  if (!s.prefix) s.prefix = 'TZE';
}

function readBuf(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

function collectCorpus() {
  const parts = [];
  const files = [
    'data/community-sync/all-enriched.json',
    'data/community-sync/new-fingerprints.json',
    'data/community-sync/existing-fingerprints.json',
    'data/dp_registry.json',
    'data/mfs_db.json',
    'lib/tuya/fingerprints.json',
    'data/fingerprints.json',
    '.github/state/z2m-tuya-raw.txt',
  ];
  for (const f of files) {
    const b = readBuf(f);
    if (b) parts.push(b.toString('utf8'));
  }
  const driversDir = path.join(ROOT, 'drivers');
  for (const id of fs.readdirSync(driversDir)) {
    const c = path.join(driversDir, id, 'driver.compose.json');
    if (fs.existsSync(c)) parts.push(fs.readFileSync(c, 'utf8'));
  }
  return parts.join('\n');
}

function findSuffixHits(corpus, suffix, prefixKind = 'TZE') {
  let re;
  if (prefixKind === 'TZ3000') re = new RegExp(`_TZ3000_${suffix}`, 'gi');
  else if (prefixKind === 'TZ3210') re = new RegExp(`_TZ3210_${suffix}`, 'gi');
  else re = new RegExp(`_TZE(?:200|204|284)_${suffix}`, 'gi');
  const hits = new Set();
  let m;
  while ((m = re.exec(corpus))) hits.add(m[0]);
  return [...hits];
}

function driverHasSuffix(compose, suffix) {
  const names = compose.zigbee?.manufacturerName || [];
  const s = String(suffix).toLowerCase();
  return names.some((m) => String(m).toLowerCase().includes(s));
}

function expandOemFamily(suffix, compose, foundInCorpus, prefixKind = 'TZE') {
  if (!driverHasSuffix(compose, suffix) && !(foundInCorpus && foundInCorpus.length)) {
    return [];
  }
  const out = [];
  if (prefixKind === 'TZ3000') {
    out.push(`_TZ3000_${suffix}`, `_tz3000_${suffix}`, `_TZ3000_${suffix.toUpperCase()}`, `_tz3000_${suffix.toUpperCase()}`);
    return out;
  }
  if (prefixKind === 'TZ3210') {
    out.push(`_TZ3210_${suffix}`, `_tz3210_${suffix}`, `_TZ3210_${suffix.toUpperCase()}`, `_tz3210_${suffix.toUpperCase()}`);
    return out;
  }
  for (const p of ['_TZE200_', '_TZE204_', '_TZE284_']) out.push(`${p}${suffix}`);
  for (const p of ['_tze200_', '_tze204_', '_tze284_']) out.push(`${p}${suffix}`);
  return out;
}

function caseForms(mfr) {
  const s = String(mfr);
  const lower = s.toLowerCase();
  const upper = s.toUpperCase();
  let canon = s;
  if (/^_tze(200|204|284)_/i.test(s)) {
    canon = s
      .replace(/^(_tze)(200|204|284)_/i, (_, _a, n) => `_TZE${n}_`)
      .replace(/_TZE(\d{3})_([A-Za-z0-9]+)$/i, (_, n, suf) => `_TZE${n}_${String(suf).toLowerCase()}`);
  } else if (/^_tz3000_/i.test(s)) {
    canon = s.replace(/^_tz3000_/i, '_TZ3000_').replace(/_TZ3000_([A-Za-z0-9]+)$/i, (_, suf) => `_TZ3000_${String(suf).toLowerCase()}`);
  } else if (/^_tz3210_/i.test(s)) {
    canon = s.replace(/^_tz3210_/i, '_TZ3210_').replace(/_TZ3210_([A-Za-z0-9]+)$/i, (_, suf) => `_TZ3210_${String(suf).toLowerCase()}`);
  }
  return unionStrings([], [canon, s, lower, upper]);
}

function loadCompose(driverId) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) return null;
  return { path: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function capabilityGaps(compose, wanted) {
  const have = new Set((dataCaps(compose)).map((c) => String(c).toLowerCase()));
  return (wanted || []).filter((c) => !have.has(String(c).toLowerCase()));
}

function dataCaps(compose) {
  return Array.isArray(compose.capabilities) ? compose.capabilities : [];
}


function frontPin(names, primary) {
  const list = Array.isArray(names) ? names.slice() : [];
  const want = String(primary).toLowerCase();
  const idx = list.findIndex((x) => String(x).toLowerCase() === want);
  if (idx > 0) {
    const [hit] = list.splice(idx, 1);
    list.unshift(hit);
  } else if (idx < 0) {
    list.unshift(primary);
  }
  return unionStrings(list, []);
}

function main() {
  const apply = process.argv.includes('--apply');
  const corpus = collectCorpus();
  const report = { generatedAt: new Date().toISOString(), apply, drivers: {} };
  const touched = new Set();
  const byDriver = new Map();

  for (const seed of SEEDS) {
    const loaded = loadCompose(seed.driver);
    if (!loaded) {
      console.warn('[P2530] missing driver', seed.driver);
      continue;
    }
    const { path: composePath, data } = loaded;
    // Reload if we already mutated this driver earlier in the loop
    const live = byDriver.has(seed.driver)
      ? { path: composePath, data: byDriver.get(seed.driver) }
      : loaded;
    const composeData = live.data;

    const found = findSuffixHits(corpus, seed.suffix, seed.prefix || 'TZE');
    const oem = expandOemFamily(seed.suffix, composeData, found, seed.prefix || 'TZE');
    const allMfr = unionStrings(found, oem);
    const withCase = [];
    for (const m of allMfr) withCase.push(...caseForms(m));
    const mfrUnion = unionStrings(composeData.zigbee?.manufacturerName || [], withCase);
    const beforeMfr = (composeData.zigbee?.manufacturerName || []).length;
    const missingCaps = capabilityGaps(composeData, seed.caps);

    if (apply) {
      const nextMfr = appendIdentityStrings(composeData.zigbee?.manufacturerName || [], withCase);
      composeData.zigbee = composeData.zigbee || {};
      composeData.zigbee.manufacturerName = nextMfr;
      if (missingCaps.length) {
        composeData.capabilities = unionCapabilities(composeData.capabilities, missingCaps);
      }
      byDriver.set(seed.driver, composeData);
      touched.add(seed.driver);
    }

    report.drivers[seed.driver] = report.drivers[seed.driver] || { seeds: [] };
    report.drivers[seed.driver].seeds.push({
      suffix: seed.suffix,
      family: seed.family,
      foundInCorpus: found,
      oemExpanded: oem,
      mfrUnionCount: mfrUnion.length,
      beforeMfr,
      afterMfr: apply ? (composeData.zigbee.manufacturerName || []).length : null,
      missingCaps,
      capsAdded: apply ? missingCaps : [],
      skippedNoPresence: !driverHasSuffix(composeData, seed.suffix) && !found.length,
    });
  }

  // WHY(P2522/P2530): sacred recent couples stay front-pinned after multi-seed union
  const FRONT = {
    curtain_motor: ['_TZE204_5slehgeo', '_TZE284_5slehgeo', '_TZE200_5slehgeo', '_TZE200_icka1clh', '_TZE284_fodv6bkr'],
    wall_curtain_switch: ['_TZE284_kq1l5eu5', '_TZE204_kq1l5eu5', '_TZE200_kq1l5eu5'],
    presence_sensor_radar: ['_TZE204_gkfbdvyx', '_TZE200_gkfbdvyx', '_TZE284_gkfbdvyx', '_TZE204_clrdrnya'],
    wall_dimmer_tuya: ['_TZE284_m1cvyneb', '_TZE204_m1cvyneb', '_TZE200_m1cvyneb'],
    button_wireless_1: ['_TZ3000_mrpevh8p', '_TZ3000_4upl1fcj'],
    scene_switch_4: ['_TZ3000_zgyzgdua'],
    smart_knob: ['_TZ3000_uri7ongn', '_TZ3000_ixla93vd', '_TZ3000_g9g2xnch', '_TZ3000_kaflzta4'],
    contact_sensor_zigbee: ['_TZE200_pay2byax', '_TZE204_pay2byax'],
    valve_dual_irrigation: ['_TZE284_fhvpaltk'],
    soil_sensor: ['_TZE284_nt4pquef'],
    din_rail_meter: ['_TZE284_6ocnqlhn'],
    water_leak_sensor: ['_TZ3000_k4ej3ww2'],
    wall_switch_4gang_1way: ['_TZ3000_lwthnp7j'],
    button_wireless_4: ['_TZ3000_xffhmvhv', '_TZ3000_abrsvsou'],
    plug_energy_monitor: ['_TZ3000_okaz9tjs', '_TZ3210_fgwhjm9j'],
    din_rail_switch: ['_TZ3000_qeuvnohg'],
    switch_2gang: ['_TZ3000_w5xztuy7'],
  };

  if (apply) {
    for (const [driverId, data] of byDriver.entries()) {
      const pri = FRONT[driverId] || [];
      let names = data.zigbee.manufacturerName || [];
      for (const p of [...pri].reverse()) {
        if (names.some((m) => String(m).toLowerCase() === p.toLowerCase()) || /_TZE|_TZ3000/i.test(p)) {
          // only pin if present (case-insensitive) OR we just added OEM form
          const hit = names.find((m) => String(m).toLowerCase() === p.toLowerCase());
          if (hit || oemFormsPresent(names, p)) {
            names = frontPin(names, hit || p);
          }
        }
      }
      data.zigbee.manufacturerName = names;
      const composePath = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
      fs.writeFileSync(composePath, `${JSON.stringify(data, null, 2)}\n`);
    }
  }

  function oemFormsPresent(names, primary) {
    const suf = String(primary).replace(/^_TZE\d{3}_|^_TZ3000_/i, '').toLowerCase();
    return names.some((m) => String(m).toLowerCase().includes(suf));
  }

  const outDir = path.join(ROOT, `reports/variant-complete-${new Date().toISOString().slice(0, 10)}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'VARIANT_COMPLETE.json'), `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    `# Variant + capability completer (P2530) — ${report.generatedAt.slice(0, 10)}`,
    '',
    apply ? 'Mode: **APPLY** (complementary union)' : 'Mode: dry-run',
    '',
    '| Driver | Suffix | Corpus | OEM# | Caps gap |',
    '|--------|--------|--------|------|----------|',
  ];
  for (const [drv, block] of Object.entries(report.drivers)) {
    for (const s of block.seeds) {
      lines.push(
        `| ${drv} | \`${s.suffix}\` | ${s.foundInCorpus.join(', ') || '—'} | ${s.oemExpanded.length} | ${(s.missingCaps || []).join(', ') || 'ok'} |`,
      );
    }
  }
  fs.writeFileSync(path.join(outDir, 'VARIANT_COMPLETE.md'), `${lines.join('\n')}\n`);
  console.log('[P2530]', apply ? 'APPLY' : 'dry-run', '→', outDir);
  console.log('  touched drivers:', [...touched].join(', ') || '(none)');
  for (const [drv, block] of Object.entries(report.drivers)) {
    const gaps = block.seeds.flatMap((s) => s.missingCaps || []);
    console.log(`  ${drv}: seeds=${block.seeds.length} capGaps=${gaps.length ? gaps.join('|') : 'ok'}`);
  }
}

main();
