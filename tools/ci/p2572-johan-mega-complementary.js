#!/usr/bin/env node
'use strict';

/**
 * P2572 — Johan issues/PRs mega → OUR app (max investigation, complementary).
 *
 * WHY: Treat ALL JohanBendz device requests/PRs in Universal Tuya only.
 * HOW: Full dump → couple harvest (issues+PRs+comments+T26439) → resolve
 *      via registry/compose/mfs/Z2M heuristic map → ComplementaryMerge apply.
 * POUR QUI: BOTH reliability FP. Never write Johan repo. Never forum POST.
 * CONTRE QUOI: invent pid; TS0601→generic; wipe compose; cross-driver OEM bleed.
 *
 *   node tools/ci/p2572-johan-mega-complementary.js
 *   node tools/ci/p2572-johan-mega-complementary.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const DUMP = path.join(ROOT, '.github', 'state', 'johan-dump');
const OUT = path.join(ROOT, 'reports', `johan-mega-${new Date().toISOString().slice(0, 10)}`);

const {
  appendExactIdentityForms,
  wouldDegradeCompose,
} = require('../../lib/enrichment/ComplementaryMerge');

let lookup = () => null;
try {
  ({ lookup } = require('../../lib/pairing/UserMisattributionRegistry'));
} catch (_e) { /* soft */ }

const MFR_RE = /_T[YZ](?:E200|E204|E284|E28[0-9A-Z]*|ZB\d{2}|Z3000|Z3002|Z3210|Z3218|ST11)[_-][A-Za-z0-9]+/gi;
const PID_RE = /\bTS\d{4}[A-Z]?\b|\bZG-[0-9A-Z]+\b/gi;

/** Keyword → preferred driver when registry/compose miss (soft heuristic only). */
const KEYWORD_DRIVER = [
  { re: /soil|moisture|plant/i, driver: 'soil_sensor' },
  { re: /radar|presence|mmwave|mm.?wave|occupancy/i, driver: 'presence_sensor_radar' },
  { re: /curtain|blind|shade|roller|tubular|am43/i, driver: 'curtain_motor' },
  { re: /\btrv\b|radiator|thermostat.?valve/i, driver: 'device_radiator_valve' },
  { re: /thermostat|wall.?thermo/i, driver: 'thermostat' },
  { re: /siren|alarm.?sound/i, driver: 'siren' },
  { re: /water.?leak|flood/i, driver: 'water_leak_sensor' },
  { re: /smoke/i, driver: 'smoke_sensor' },
  { re: /co2|carbon/i, driver: 'air_quality_co2' },
  { re: /lux|illuminance|light.?sensor/i, driver: 'light_sensor_outdoor' },
  { re: /temp.?hum|humidity.?sensor|climate|lcd.?temp/i, driver: 'lcdtemphumidsensor' },
  { re: /door|window|contact|magnetic/i, driver: 'contact_sensor' },
  { re: /motion|pir(?!.?sens)/i, driver: 'motion_sensor' },
  { re: /knob|rotary|dimmer/i, driver: 'wall_dimmer_tuya' },
  { re: /6.?gang|six.?gang/i, driver: 'wall_switch_6_gang_tuya' },
  { re: /4.?gang|four.?gang/i, driver: 'wall_switch_4_gang_tuya' },
  { re: /3.?gang|three.?gang/i, driver: 'switch_3gang' },
  { re: /2.?gang|two.?gang|usb.?switch/i, driver: 'switch_2gang' },
  { re: /1.?gang|one.?gang|single.?switch/i, driver: 'switch_1gang' },
  { re: /smart.?plug|metering.?plug|socket/i, driver: 'smart_plug' },
  { re: /irrigation|garden.?valve|water.?valve/i, driver: 'water_valve_smart' },
  { re: /button|scene.?remote|wireless.?switch/i, driver: 'button_wireless_1' },
  { re: /bed.?sensor|pressure.?pad|pressure.?contact/i, driver: 'bed_sensor' },
];

function loadJson(p, fb) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { return fb; }
}

function dualCaseForms(mfr) {
  const s = String(mfr || '').trim();
  if (!s) return [];
  const forms = new Set([s]);
  if (s.startsWith('_')) {
    forms.add(`_${s.slice(1).toLowerCase()}`);
    forms.add(`_${s.slice(1).toUpperCase()}`);
    const m = s.match(/^(_T[YZ][A-Z0-9]*_)(.+)$/i);
    if (m) {
      forms.add(`${m[1].toUpperCase()}${m[2].toLowerCase()}`);
      forms.add(`${m[1].toLowerCase()}${m[2].toLowerCase()}`);
      forms.add(`${m[1].toUpperCase()}${m[2].toUpperCase()}`);
    }
  }
  return [...forms];
}

function oemSiblings(mfr) {
  const m = String(mfr || '').match(/^_TZE(200|204|284)_(.+)$/i);
  if (!m) return [];
  const tail = m[2];
  return [
    `_TZE200_${tail}`, `_TZE204_${tail}`, `_TZE284_${tail}`,
    `_tze200_${tail.toLowerCase()}`, `_tze204_${tail.toLowerCase()}`, `_tze284_${tail.toLowerCase()}`,
  ];
}

function indexDrivers() {
  const byMfr = new Map();
  const dir = path.join(ROOT, 'drivers');
  for (const id of fs.readdirSync(dir)) {
    const fp = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (_e) { continue; }
    const mfrs = j.zigbee?.manufacturerName || [];
    const pids = j.zigbee?.productId || [];
    for (const m of mfrs) {
      const k = String(m).toLowerCase();
      if (!byMfr.has(k)) byMfr.set(k, []);
      byMfr.get(k).push({ driverId: id, pids, composePath: fp });
    }
  }
  return byMfr;
}

function hasCouple(byMfr, mfr, pid) {
  const hits = byMfr.get(String(mfr).toLowerCase()) || [];
  return hits.some((h) => (h.pids || []).some((p) => String(p).toUpperCase() === String(pid).toUpperCase()));
}

function keywordDriver(text) {
  for (const row of KEYWORD_DRIVER) {
    if (row.re.test(text) && fs.existsSync(path.join(ROOT, 'drivers', row.driver, 'driver.compose.json'))) {
      return row.driver;
    }
  }
  return null;
}

function resolveDriver(mfr, pid, text, byMfr, mfs) {
  const reg = lookup(mfr, pid);
  if (reg?.canonicalDriver && fs.existsSync(path.join(ROOT, 'drivers', reg.canonicalDriver, 'driver.compose.json'))) {
    return { driverId: reg.canonicalDriver, reason: `registry:${reg.id || 'case'}`, confidence: 'high' };
  }
  const hits = byMfr.get(String(mfr).toLowerCase()) || [];
  if (hits.length === 1) {
    return { driverId: hits[0].driverId, reason: 'compose-mfr', confidence: 'high' };
  }
  if (hits.length > 1 && pid) {
    const withPid = hits.filter((h) => (h.pids || []).some((p) => String(p).toUpperCase() === String(pid).toUpperCase()));
    if (withPid.length === 1) {
      return { driverId: withPid[0].driverId, reason: 'compose-couple', confidence: 'high' };
    }
  }
  for (const sib of oemSiblings(mfr)) {
    const sh = byMfr.get(sib.toLowerCase()) || [];
    if (sh.length === 1) {
      return { driverId: sh[0].driverId, reason: `oem-sibling:${sib}`, confidence: 'medium' };
    }
    if (sh.length > 1 && pid) {
      const withPid = sh.filter((h) => (h.pids || []).some((p) => String(p).toUpperCase() === String(pid).toUpperCase()));
      if (withPid.length === 1) {
        return { driverId: withPid[0].driverId, reason: `oem-sibling-couple:${sib}`, confidence: 'medium' };
      }
    }
  }
  const entry = mfs?.devices?.[String(mfr).toLowerCase()] || mfs?.devices?.[mfr];
  if (entry?.driverId && fs.existsSync(path.join(ROOT, 'drivers', entry.driverId, 'driver.compose.json'))) {
    return { driverId: entry.driverId, reason: 'mfs_db', confidence: 'medium' };
  }
  const kw = keywordDriver(text || '');
  if (kw) return { driverId: kw, reason: 'keyword-heuristic', confidence: 'low' };
  return null;
}

function harvest() {
  const couples = new Map();
  const add = (mfr, pid, source, text) => {
    const m = String(mfr || '').trim();
    const p = String(pid || '').trim().toUpperCase();
    if (!m || !/^_T/i.test(m) || !p) return;
    if (/ABC123|placeholder|XXXX|000000|invent|100000/i.test(m)) return;
    const key = `${m.toLowerCase()}|${p}`;
    const cur = couples.get(key) || { mfr: m, pid: p, sources: [], texts: [] };
    if (!cur.sources.includes(source)) cur.sources.push(source);
    if (text && cur.texts.length < 3) cur.texts.push(String(text).slice(0, 180));
    couples.set(key, cur);
  };

  const devices = loadJson(path.join(DUMP, 'devices.json'), []);
  for (const d of devices) {
    for (const m of d.mfrs || []) {
      for (const p of d.pids || []) add(m, p, `johan-device:${d.issue}`, d.title);
    }
  }

  for (const name of ['issues.json', 'issues-open.json', 'issues-closed.json']) {
    const issues = loadJson(path.join(DUMP, name), []);
    if (!Array.isArray(issues)) continue;
    for (const issue of issues) {
      const blob = `${issue.title || ''}\n${issue.body || ''}`;
      const mfrs = [...new Set((blob.match(MFR_RE) || []).map((x) => x.trim()))];
      const pids = [...new Set((blob.match(PID_RE) || []).map((x) => x.toUpperCase()))];
      // Prefer clean: if 1 mfr + 1 pid, lock that; else cartesian but capped later by resolve
      if (mfrs.length === 1 && pids.length === 1) {
        add(mfrs[0], pids[0], `johan-issue#${issue.number}`, issue.title);
      } else if (mfrs.length && pids.length && mfrs.length * pids.length <= 6) {
        for (const m of mfrs) for (const p of pids) add(m, p, `johan-issue#${issue.number}`, issue.title);
      }
    }
  }

  const prs = loadJson(path.join(DUMP, 'prs.json'), []);
  if (Array.isArray(prs)) {
    for (const pr of prs) {
      const blob = `${pr.title || ''}\n${pr.body || ''}`;
      const mfrs = [...new Set((blob.match(MFR_RE) || []).map((x) => x.trim()))];
      const pids = [...new Set((blob.match(PID_RE) || []).map((x) => x.toUpperCase()))];
      if (mfrs.length === 1 && pids.length === 1) {
        add(mfrs[0], pids[0], `johan-pr#${pr.number}`, pr.title);
      } else if (mfrs.length && pids.length && mfrs.length * pids.length <= 6) {
        for (const m of mfrs) for (const p of pids) add(m, p, `johan-pr#${pr.number}`, pr.title);
      }
    }
  }

  // Merge T26439 harvest if present
  const t26439 = path.join(ROOT, 'reports', `forum-t26439-${new Date().toISOString().slice(0, 10)}`, 'HARVEST.json');
  const alt26439 = [...fs.readdirSync(path.join(ROOT, 'reports')).filter((d) => d.startsWith('forum-t26439-'))].sort().reverse()[0];
  const harvestPath = fs.existsSync(t26439)
    ? t26439
    : alt26439
      ? path.join(ROOT, 'reports', alt26439, 'HARVEST.json')
      : null;
  if (harvestPath && fs.existsSync(harvestPath)) {
    const h = loadJson(harvestPath, {});
    for (const c of h.couples || []) {
      if (c.mfr && c.pid) add(c.mfr, c.pid, `t26439#${(c.posts || [])[0] || '?'}`, '');
    }
  }

  return [...couples.values()];
}

function applyToDriver(driverId, mfrs, pids, byMfr) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  const before = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const after = JSON.parse(JSON.stringify(before));
  after.zigbee = after.zigbee || {};
  const forms = [];
  for (const m of mfrs) {
    forms.push(...dualCaseForms(m));
    if (/_TZE(200|204|284)_/i.test(m)) {
      for (const sib of oemSiblings(m)) {
        const hits = byMfr.get(String(sib).toLowerCase()) || [];
        const other = hits.filter((h) => h.driverId !== driverId);
        if (other.length) continue;
        forms.push(sib);
      }
    }
  }
  after.zigbee.manufacturerName = appendExactIdentityForms(after.zigbee.manufacturerName, forms);
  after.zigbee.productId = appendExactIdentityForms(after.zigbee.productId, pids);
  if (wouldDegradeCompose(before, after)) return { ok: false, reason: 'would_degrade' };
  const addedMfr = (after.zigbee.manufacturerName?.length || 0) - (before.zigbee.manufacturerName?.length || 0);
  const addedPid = (after.zigbee.productId?.length || 0) - (before.zigbee.productId?.length || 0);
  if (addedMfr === 0 && addedPid === 0) return { ok: true, changed: false };
  if (APPLY) fs.writeFileSync(fp, `${JSON.stringify(after, null, 2)}\n`);
  return { ok: true, changed: true, addedMfr, addedPid };
}

function main() {
  console.log(`[P2572] Johan mega complementary — ${APPLY ? 'APPLY' : 'DRY'}`);
  if (!fs.existsSync(path.join(DUMP, 'issues.json'))) {
    console.error('Missing dump. Run: node tools/ci/johan-dump.js');
    process.exit(1);
  }

  const byMfr = indexDrivers();
  const mfs = loadJson(path.join(ROOT, 'data', 'mfs_db.json'), { devices: {} });
  const couples = harvest();
  console.log(`[P2572] harvested couples: ${couples.length}`);

  const applied = [];
  const skipped = [];
  const needInterview = [];
  const already = [];
  const byDriver = new Map();

  for (const c of couples) {
    const text = (c.texts || []).join(' ');
    if (hasCouple(byMfr, c.mfr, c.pid)) {
      already.push(c);
      // still boost dual-case
      const hits = byMfr.get(String(c.mfr).toLowerCase()) || [];
      for (const h of hits.filter((x) => (x.pids || []).some((p) => String(p).toUpperCase() === c.pid))) {
        if (!byDriver.has(h.driverId)) byDriver.set(h.driverId, { mfrs: new Set(), pids: new Set(), sources: [], confidence: 'high' });
        const b = byDriver.get(h.driverId);
        b.mfrs.add(c.mfr);
        b.pids.add(c.pid);
        b.sources.push(...c.sources);
      }
      continue;
    }

    const res = resolveDriver(c.mfr, c.pid, text, byMfr, mfs);
    if (!res) {
      needInterview.push({ ...c, reason: 'unresolved' });
      skipped.push({ ...c, reason: 'unresolved' });
      continue;
    }
    if (res.confidence === 'low' && !APPLY) {
      // dry: list as soft-candidate; apply only medium+ unless --force-low
      skipped.push({ ...c, reason: `soft:${res.reason}`, driverId: res.driverId });
      if (!process.argv.includes('--force-low')) continue;
    }
    if (/generic_tuya|zigbee_universal|unknown/i.test(res.driverId) && /TS0601/i.test(c.pid)) {
      skipped.push({ ...c, reason: 'refuse_ts0601_generic', driverId: res.driverId });
      continue;
    }
    if (!byDriver.has(res.driverId)) {
      byDriver.set(res.driverId, { mfrs: new Set(), pids: new Set(), sources: [], confidence: res.confidence });
    }
    const bucket = byDriver.get(res.driverId);
    bucket.mfrs.add(c.mfr);
    bucket.pids.add(c.pid);
    bucket.sources.push(...c.sources);
  }

  for (const [driverId, bucket] of byDriver) {
    const r = applyToDriver(driverId, [...bucket.mfrs], [...bucket.pids], byMfr);
    applied.push({
      driverId,
      mfrCount: bucket.mfrs.size,
      pidCount: bucket.pids.size,
      confidence: bucket.confidence,
      ...r,
    });
  }

  fs.mkdirSync(OUT, { recursive: true });
  const report = {
    id: 'P2572',
    mode: APPLY ? 'apply' : 'dry-run',
    generatedAt: new Date().toISOString(),
    harvested: couples.length,
    alreadyCovered: already.length,
    driversTouched: applied.filter((a) => a.changed).length,
    applied,
    skipped: skipped.slice(0, 300),
    skippedTotal: skipped.length,
    needInterview: needInterview.slice(0, 100),
    needInterviewTotal: needInterview.length,
    policy: {
      targetApp: 'com.dlnraja.tuya.zigbee',
      notJohanRepo: true,
      forumPost: false,
      complementaryOnly: true,
      neverInventPid: true,
      refuseTs0601Generic: true,
      dualApp: 'BOTH',
    },
  };
  fs.writeFileSync(path.join(OUT, 'REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT, 'NEED_INTERVIEW.md'), [
    '# P2572 NEED_INTERVIEW / unresolved Johan couples',
    '',
    `Total unresolved: **${needInterview.length}**`,
    '',
    ...needInterview.slice(0, 80).map((c) => `- \`${c.mfr}\`+\`${c.pid}\` sources=${c.sources.slice(0, 3).join(',')}`),
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(OUT, 'REPORT.md'), [
    '# P2572 Johan mega complementary (OUR app)',
    '',
    `Mode: **${report.mode}** · couples: ${report.harvested} · already: ${report.alreadyCovered}`,
    `Drivers changed: ${report.driversTouched} · skipped: ${report.skippedTotal} · NEED_INTERVIEW: ${report.needInterviewTotal}`,
    '',
    'Silent only. Never forum POST. Never invent pid.',
    '',
  ].join('\n'));

  console.log(`[P2572] changed=${report.driversTouched} already=${already.length} skipped=${skipped.length} needInterview=${needInterview.length}`);
  if (!APPLY) console.log('[P2572] re-run with --apply to write (add --force-low for keyword soft locks)');
}

main();
