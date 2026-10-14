'use strict';

/**
 * P2819 — Blakadder full couple-aware audit vs our drivers
 * WHY: mfr-only coverage (100%) hides wrong-class placements and pid gaps.
 * Contre quoi: RGB bulbs on wall dimmer, wall switches on wireless buttons, etc.
 *
 * Usage: node tools/ci/blakadder-couple-audit.js
 * Outputs: reports/blakadder-deep-YYYY-MM-DD/{COUPLE_AUDIT.json,ACTIONABLE.md}
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'reports', `blakadder-deep-${new Date().toISOString().slice(0, 10)}`);

function load(p, fb) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function norm(s) {
  return String(s || '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function uniq(arr) {
  return [...new Set(arr)];
}

const CAT_OK = {
  sensor: /sensor|climate|presence|motion|contact|leak|soil|air|smoke|gas|illuminance|humidity|temperature|radar|mmwave|sos|vibration|water/,
  switch: /switch|gang|relay|scene_switch|wall_switch/,
  plug: /plug|socket|outlet|energy|meter|din|rcbo/,
  dimmer: /dimmer|light|bulb|led/,
  cover: /curtain|cover|blind|window|garage|shutter|roller/,
  remote: /button|remote|knob|scene|doorbell/,
  hvac: /thermostat|radiator|valve|climate|heater|hvac|trv/,
  lock: /lock|door/,
  bulb: /bulb|light|rgb|cct|led|strip/,
  light: /light|bulb|led|strip|rgb|cct/,
};

function catMatch(cat, driverId) {
  const re = CAT_OK[String(cat || '').toLowerCase()];
  if (!re) return true;
  return re.test(String(driverId).toLowerCase());
}

function isSevereMismatch(cat, drivers) {
  const c = String(cat || '').toLowerCase();
  const ds = drivers.map((d) => d.toLowerCase());
  if (/^(bulb|light)$/.test(c) && ds.every((d) => /dimmer_wall/.test(d))) return 'rgb_bulb_on_wall_dimmer';
  if (/^switch$/.test(c) && ds.every((d) => /button_wireless/.test(d))) return 'wall_switch_on_wireless_button';
  if (/^plug$/.test(c) && ds.every((d) => /^switch_/.test(d)) && !ds.some((d) => /plug|outlet|socket|energy/.test(d))) {
    return 'plug_on_switch_only';
  }
  if (/smoke|gas/.test(c) && ds.some((d) => /radiator|trv/.test(d))) return 'smoke_on_radiator';
  if (/^cover$/.test(c) && !ds.some((d) => /curtain|cover|blind|shutter|roller/.test(d))) return 'cover_wrong_driver';
  return null;
}

function buildDriverIndex() {
  const coupleToDrivers = new Map();
  const mfrToDrivers = new Map();
  const driversDir = path.join(ROOT, 'drivers');
  for (const folder of fs.readdirSync(driversDir)) {
    const fp = path.join(driversDir, folder, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    const dc = load(fp, null);
    if (!dc?.zigbee) continue;
    const mfrs = [].concat(dc.zigbee.manufacturerName || []).map(String);
    const pids = [].concat(dc.zigbee.productId || []).map(String);
    for (const m of mfrs) {
      const mk = norm(m);
      if (!mk) continue;
      if (!mfrToDrivers.has(mk)) mfrToDrivers.set(mk, []);
      if (!mfrToDrivers.get(mk).includes(folder)) mfrToDrivers.get(mk).push(folder);
      for (const p of pids) {
        const key = `${mk}|${String(p).toUpperCase()}`;
        if (!coupleToDrivers.has(key)) coupleToDrivers.set(key, []);
        if (!coupleToDrivers.get(key).includes(folder)) coupleToDrivers.get(key).push(folder);
      }
    }
  }
  return { coupleToDrivers, mfrToDrivers };
}

function main() {
  const devices = load(path.join(ROOT, '.github', 'state', 'blakadder', 'devices.json'), []);
  const couples = load(path.join(ROOT, '.github', 'state', 'blakadder', 'mfr-pid.json'), []);
  const crawl = load(path.join(ROOT, 'scripts', 'sync', 'data', 'blakadder.json'), {});
  const state = load(path.join(ROOT, '.github', 'state', 'blakadder', 'state.json'), {});
  const { coupleToDrivers, mfrToDrivers } = buildDriverIndex();

  const fps = crawl.fingerprints || [];
  let exact = 0;
  let mfrOnly = 0;
  let missing = 0;
  const missingList = [];
  const mfrOnlyList = [];
  const classMismatch = [];
  const severe = [];

  for (const fp of fps) {
    const mfr = norm(fp.manufacturerName || fp.mfr);
    const pid = String(fp.productId || fp.modelId || fp.pid || '').toUpperCase().trim();
    if (!mfr) continue;
    const key = `${mfr}|${pid}`;
    const exactDrivers = coupleToDrivers.get(key) || [];
    if (exactDrivers.length) {
      exact++;
      const cat = fp.category || '';
      if (cat && !exactDrivers.some((d) => catMatch(cat, d))) {
        const row = {
          mfr,
          pid,
          cat,
          drivers: exactDrivers,
          vendor: fp.vendor,
          title: fp.title || fp.model,
        };
        classMismatch.push(row);
        const reason = isSevereMismatch(cat, exactDrivers);
        if (reason) severe.push({ ...row, reason });
      }
    } else if (mfrToDrivers.has(mfr)) {
      mfrOnly++;
      mfrOnlyList.push({
        mfr,
        pid,
        drivers: mfrToDrivers.get(mfr),
        vendor: fp.vendor,
        category: fp.category,
        model: fp.model || fp.title,
      });
    } else {
      missing++;
      missingList.push({
        mfr,
        pid,
        vendor: fp.vendor,
        category: fp.category,
        model: fp.model || fp.title,
      });
    }
  }

  // Device-level Tuya mfrs not in any driver (normalized)
  const tzLike = /^_(tz|tyzb|tyst|tze)/i;
  const notInApp = [];
  for (const d of devices) {
    for (const raw of d.zigbeeModels || []) {
      const m = String(raw);
      if (!tzLike.test(m) && !/_TZ|_TYZB|_TYST|_TZE/i.test(m)) continue;
      const mk = norm(m);
      if (!mk || !tzLike.test(mk)) continue;
      if (!mfrToDrivers.has(mk) && !notInApp.find((x) => x.mfr === mk)) {
        notInApp.push({
          mfr: mk,
          vendor: d.vendor,
          category: d.category,
          title: d.title,
          slug: d.slug,
          models: d.zigbeeModels,
        });
      }
    }
  }

  // Forum targets
  const targets = {
    gnpflcoq_in_blakadder: couples.filter((c) => /gnpflcoq/i.test(c.mfr)),
    fl8cuafl_in_blakadder: couples.filter((c) => /fl8cuafl/i.test(c.mfr)),
    gnpflcoq_in_app: mfrToDrivers.get('_tze284_gnpflcoq') || [],
    fl8cuafl_in_app: mfrToDrivers.get('_tze284_fl8cuafl') || [],
  };

  // Suggested moves for severe cases
  const suggestions = severe.map((s) => {
    let targetDriver = null;
    if (s.reason === 'rgb_bulb_on_wall_dimmer') {
      targetDriver = s.pid === 'TS0505B' ? 'bulb_rgb' : 'bulb_white';
      // pick existing
      for (const cand of ['bulb_rgb', 'light_rgb', 'bulb_color', 'rgb_bulb', 'light_bulb_rgb', 'led_strip_rgb']) {
        if (fs.existsSync(path.join(ROOT, 'drivers', cand, 'driver.compose.json'))) {
          targetDriver = cand;
          break;
        }
      }
    }
    if (s.reason === 'wall_switch_on_wireless_button') {
      targetDriver = /TS0011|TS0001/.test(s.pid) ? 'switch_1gang' : 'switch_1gang';
    }
    if (s.reason === 'plug_on_switch_only') targetDriver = 'plug_smart';
    return { ...s, suggestDriver: targetDriver };
  });

  const out = {
    generatedAt: new Date().toISOString(),
    blakadder: {
      devices: devices.length,
      sacredCouples: couples.length,
      crawlFingerprints: fps.length,
      fetchedAt: state.lastRun || null,
    },
    coverage: {
      exactCouple: exact,
      mfrOnlyPartial: mfrOnly,
      missingEntirely: missing,
      classMismatchHeuristic: classMismatch.length,
      severeMismatches: severe.length,
      tuyaMfrNotInApp: notInApp.length,
    },
    targets,
    missingList,
    mfrOnlyWithPid: mfrOnlyList.filter((x) => x.pid && /^TS/.test(x.pid)).slice(0, 80),
    severe,
    suggestions,
    notInApp,
    classMismatchTop: classMismatch.slice(0, 40),
  };

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'COUPLE_AUDIT.json'), `${JSON.stringify(out, null, 2)}\n`);

  const md = [
    '# Blakadder couple audit (P2819)',
    '',
    `Generated: ${out.generatedAt}`,
    `Blakadder devices: **${out.blakadder.devices}** · crawl FPs: **${out.blakadder.crawlFingerprints}** · sacred couples extracted: **${out.blakadder.sacredCouples}**`,
    '',
    '## Coverage (mfr+pid)',
    '',
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Exact couple in a driver | ${exact} |`,
    `| Mfr present, pid not locked | ${mfrOnly} |`,
    `| Missing entirely | ${missing} |`,
    `| Class mismatch (heuristic) | ${classMismatch.length} |`,
    `| **Severe mismatches** | **${severe.length}** |`,
    `| Tuya mfr not in any driver | ${notInApp.length} |`,
    '',
    '## Forum targets vs Blakadder',
    '',
    `- \`gnpflcoq\`: **absent** from Blakadder (expected) — in-app: \`${targets.gnpflcoq_in_app.join(', ') || '—'}\``,
    `- \`fl8cuafl\`: **absent** from Blakadder (expected) — in-app: \`${targets.fl8cuafl_in_app.join(', ') || '—'}\``,
    '',
    '## Severe wrong-class (actionable)',
    '',
  ];
  for (const s of suggestions) {
    md.push(
      `- \`${s.mfr}\`+\`${s.pid}\` (${s.vendor} ${s.title}) — ${s.reason}: now \`${s.drivers.join(',')}\` → suggest \`${s.suggestDriver}\``
    );
  }
  if (!suggestions.length) md.push('_None_');
  md.push('', '## Tuya mfrs on Blakadder not in any driver', '');
  for (const n of notInApp) {
    md.push(`- \`${n.mfr}\` — ${n.vendor} / ${n.category} / ${n.title} (\`${n.slug}\`) models: ${(n.models || []).join(', ')}`);
  }
  if (!notInApp.length) md.push('_None_');
  md.push('');
  fs.writeFileSync(path.join(OUT, 'ACTIONABLE.md'), `${md.join('\n')}\n`);

  console.log('=== P2819 Blakadder couple audit ===');
  console.log(JSON.stringify(out.coverage, null, 2));
  console.log('Severe:', severe.length);
  console.log('Not in app:', notInApp.length);
  console.log('Targets:', targets);
  console.log('Report:', OUT);
}

main();
