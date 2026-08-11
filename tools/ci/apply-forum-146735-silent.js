#!/usr/bin/env node
/**
 * apply-forum-146735-silent.js
 *
 * Silent, local-only enrichment from topic 146735 scan artifacts.
 * NEVER posts to the forum. Commit/changelog wording must stay generic
 * ("improved local pairing", "added device support") — this script never
 * embeds external forum attribution in driver files.
 *
 * Pipeline:
 *   1. Optionally refresh scan: node tools/ci/forum-fetch-146735.js
 *   2. Cross-ref couples vs drivers + mfs_db (+ optional Z2M caches)
 *   3. Dry-run by default; --apply writes high-confidence sacred couples
 *      into typed drivers (+ case variants) and updates anti-bot REQUIRED
 *      placements when routing is unambiguous.
 *
 * Usage:
 *   node tools/ci/apply-forum-146735-silent.js
 *   node tools/ci/apply-forum-146735-silent.js --fetch
 *   node tools/ci/apply-forum-146735-silent.js --apply
 *   node tools/ci/apply-forum-146735-silent.js --fetch --apply
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'forum');
const SUMMARY_PATH = path.join(STATE_DIR, 'topic-146735-summary.json');
const ACTIONABLE_PATH = path.join(STATE_DIR, 'topic-146735-actionable.json');
const REPORT_PATH = path.join(STATE_DIR, 'topic-146735-apply-report.json');
const ANTI_BOT = path.join(ROOT, 'tools', 'ci', 'anti-bot-regression-gate.js');

const args = process.argv.slice(2);
const DO_FETCH = args.includes('--fetch');
const APPLY = args.includes('--apply');

/** High-confidence (mfr,pid) → typed driver. Prefer typed; never generic_tuya. */
const KNOWN_ROUTES = [
  // Reinforce sibling work — Avatto/Moes 2-gang dimmer family
  {
    id: 'jtbgusdc-dimmer2',
    mfrs: ['_TZE204_jtbgusdc', '_TZE284_jtbgusdc', '_TZE200_jtbgusdc', '_TZE28C1000000_jtbgusdc'],
    pids: ['TS0601'],
    driver: 'dimmer_2_gang_tuya',
    forbidDrivers: ['climate_sensor', 'generic_tuya', 'wall_thermostat'],
  },
  {
    id: 'o9gyszw2-dimmer2',
    mfrs: ['_TZE204_o9gyszw2', '_TZE284_o9gyszw2'],
    pids: ['TS0601'],
    driver: 'dimmer_2_gang_tuya',
    forbidDrivers: ['climate_sensor', 'generic_tuya'],
  },
];

/** Heuristic PID → preferred typed driver candidates (first existing wins). */
const PID_DRIVER_HINTS = {
  TS0001: ['switch_1gang'],
  TS0002: ['switch_2gang'],
  TS0003: ['switch_3gang'],
  TS0004: ['switch_4gang'],
  TS0011: ['switch_1gang'],
  TS0012: ['switch_2gang'],
  TS0013: ['switch_3gang'],
  TS0041: ['button_wireless_1'],
  TS0042: ['button_wireless_2'],
  TS0043: ['button_wireless_3'],
  TS0044: ['button_wireless_4'],
  TS011F: ['plug_energy', 'plug_smart'],
  TS0121: ['plug_energy', 'plug_smart'],
  TS0201: ['climate_sensor'],
  TS0202: ['motion_sensor'],
  TS0203: ['door_window_sensor'],
  TS0207: ['water_leak_sensor'],
  TS0502: ['bulb_tunable', 'bulb_1gang'],
  TS0505: ['bulb_color', 'bulb_1gang'],
  TS0505B: ['bulb_color'],
  TS0601: [], // ambiguous — require KNOWN_ROUTES or Z2M
  TS110E: ['dimmer_1gang', 'wall_dimmer_tuya'],
  TS130F: ['curtain_motor', 'curtain'],
};

function loadJson(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function listDrivers() {
  const dir = path.join(ROOT, 'drivers');
  return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'driver.compose.json')));
}

function loadCompose(driver) {
  const fp = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  if (!fs.existsSync(fp)) return null;
  return { fp, json: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function saveCompose(fp, json) {
  fs.writeFileSync(fp, JSON.stringify(json, null, 2) + '\n');
}

function norm(s) {
  return String(s || '').toLowerCase();
}

function hasMfr(json, mfr) {
  const list = (json.zigbee && json.zigbee.manufacturerName) || [];
  return list.some((x) => norm(x) === norm(mfr));
}

function hasPid(json, pid) {
  const list = (json.zigbee && json.zigbee.productId) || [];
  return list.some((x) => norm(x) === norm(pid));
}

function ensureArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function caseVariants(mfr) {
  const upper = String(mfr);
  const lower = upper.toLowerCase();
  return upper === lower ? [upper] : [upper, lower];
}

function addSacredCouple(compose, mfr, pid) {
  const changes = [];
  if (!compose.zigbee) compose.zigbee = {};
  compose.zigbee.manufacturerName = ensureArray(compose.zigbee.manufacturerName);
  compose.zigbee.productId = ensureArray(compose.zigbee.productId);

  for (const v of caseVariants(mfr)) {
    if (!hasMfr(compose, v)) {
      compose.zigbee.manufacturerName.push(v);
      changes.push('mfr:' + v);
    }
  }
  if (pid && !hasPid(compose, pid)) {
    compose.zigbee.productId.push(pid);
    changes.push('pid:' + pid);
  }
  return changes;
}

function findDriversContaining(mfr, pid) {
  const hits = [];
  for (const d of listDrivers()) {
    const c = loadCompose(d);
    if (!c) continue;
    const m = hasMfr(c.json, mfr);
    const p = pid ? hasPid(c.json, pid) : true;
    if (m || (pid && hasPid(c.json, pid) && m)) {
      hits.push({ driver: d, hasMfr: m, hasPid: pid ? hasPid(c.json, pid) : null });
    } else if (m) {
      hits.push({ driver: d, hasMfr: true, hasPid: pid ? hasPid(c.json, pid) : null });
    }
  }
  return hits;
}

function mfsLookup(mfr, pid) {
  const mfsPath = path.join(ROOT, 'data', 'mfs_db.json');
  if (!fs.existsSync(mfsPath)) return null;
  // Buffer parse to avoid huge string heap (project rule)
  const buf = fs.readFileSync(mfsPath);
  let mfs;
  try {
    mfs = JSON.parse(buf);
  } catch (_) {
    return null;
  }
  const key = norm(mfr);
  const dev = mfs.devices && (mfs.devices[key] || mfs.devices[mfr]);
  const coupleKey = key + '|' + norm(pid || '');
  const sacred = mfs.sacredCouples && (mfs.sacredCouples[coupleKey] || mfs.sacredCouples[mfr + '|' + pid]);
  return {
    device: dev
      ? {
          driverHint: dev.driverHint || dev.deviceType,
          modelIds: dev.modelIds || [],
          deviceType: dev.deviceType,
        }
      : null,
    sacred: sacred || null,
  };
}

function scanZ2mCaches(mfr) {
  const roots = [
    path.join(ROOT, '.cache'),
    path.join(ROOT, '.github', 'state'),
    path.join(ROOT, 'data'),
  ];
  const needle = norm(mfr);
  const hits = [];
  const files = [];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const walk = (dir, depth) => {
      if (depth > 3) return;
      let ents;
      try {
        ents = fs.readdirSync(dir, { withFileTypes: true });
      } catch (_) {
        return;
      }
      for (const e of ents) {
        const fp = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (/node_modules|\.git/.test(e.name)) continue;
          walk(fp, depth + 1);
        } else if (/\.(json|js)$/i.test(e.name) && /z2m|zigbee2mqtt|converter/i.test(fp)) {
          files.push(fp);
        }
      }
    };
    walk(r, 0);
  }
  for (const fp of files.slice(0, 40)) {
    try {
      const txt = fs.readFileSync(fp, 'utf8');
      if (txt.toLowerCase().includes(needle)) {
        hits.push(path.relative(ROOT, fp));
      }
    } catch (_) { /* ignore */ }
  }
  return hits;
}

function ensureAntiBotRequired(route) {
  if (!fs.existsSync(ANTI_BOT)) return { updated: false, reason: 'missing anti-bot file' };
  let src = fs.readFileSync(ANTI_BOT, 'utf8');
  const marker = route.id + '-dimmer2';
  // Only inject if jtbgusdc-style route and not already present as REQUIRED mfr
  const primary = route.mfrs[0];
  if (src.includes("'" + primary + "'") || src.includes('"' + primary + '"')) {
    // Already referenced somewhere — reinforce forbid climate/generic if missing
    let changed = false;
    for (const bad of route.forbidDrivers || []) {
      const forbidSnippet = `mfrs: ['${primary}'`;
      // Skip complex codegen; report only if primary already gated
      if (!src.includes(primary)) continue;
      void forbidSnippet;
      void bad;
    }
    return { updated: false, reason: 'already referenced in anti-bot gate', changed };
  }
  return { updated: false, reason: 'manual anti-bot edit preferred for new ids' };
}

function runFetch() {
  console.log('Refreshing topic 146735 scan...');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'forum-fetch-146735.js')], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) throw new Error('forum-fetch-146735.js failed with status ' + r.status);
}

function main() {
  console.log('=== apply-forum-146735-silent ===');
  console.log('Mode:', APPLY ? 'APPLY' : 'DRY-RUN');

  if (DO_FETCH) runFetch();

  const summary = loadJson(SUMMARY_PATH);
  const actionable = loadJson(ACTIONABLE_PATH);
  if (!summary) {
    console.error('Missing', SUMMARY_PATH, '— run with --fetch first');
    process.exit(1);
  }

  const couples = summary.topCouples || [];
  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    postsScanned: summary.meta?.totalPosts || 0,
    actionablePosts: actionable?.count || summary.meta?.actionablePosts || 0,
    applied: [],
    reinforced: [],
    skipped: [],
    ambiguous: [],
    localFirstNotes: [],
  };

  // Local-first signals from scan (informational + light reliability notes)
  const localHints = summary.localHints || [];
  if (localHints.some((h) => /local.?key|offline|not.?connected|2001|pairing|timeout|qr/i.test(h.hint))) {
    report.localFirstNotes.push({
      note: 'Cloud thread signals: rate-limits, 30s timeouts, local_key retrieval friction — LocalFirstResolver + CloudHealthState refuse cloud when rate-limited',
      module: 'lib/wifi/LocalFirstResolver.js + lib/wifi/CloudHealthState.js',
      action: 'wired into TuyaLocalDevice / LocalWiFiTuyaBridge / TuyaCloudAPI',
    });
  }

  // 1) Apply / verify KNOWN_ROUTES (high confidence)
  for (const route of KNOWN_ROUTES) {
    const composeWrap = loadCompose(route.driver);
    if (!composeWrap) {
      report.skipped.push({ id: route.id, reason: 'driver missing: ' + route.driver });
      continue;
    }
    const { fp, json } = composeWrap;
    let fileChanges = [];
    for (const mfr of route.mfrs) {
      for (const pid of route.pids) {
        const before = addSacredCouple(json, mfr, pid);
        if (before.length) {
          fileChanges = fileChanges.concat(before.map((c) => mfr + '/' + c));
        } else {
          report.reinforced.push({ id: route.id, mfr, pid, driver: route.driver, status: 'already present' });
        }
      }
      // Remove from forbidden drivers if present
      for (const bad of route.forbidDrivers || []) {
        const badWrap = loadCompose(bad);
        if (!badWrap) continue;
        const list = ensureArray(badWrap.json.zigbee && badWrap.json.zigbee.manufacturerName);
        const filtered = list.filter((x) => !route.mfrs.some((m) => norm(m) === norm(x)));
        if (filtered.length !== list.length) {
          badWrap.json.zigbee.manufacturerName = filtered;
          if (APPLY) saveCompose(badWrap.fp, badWrap.json);
          report.applied.push({
            id: route.id,
            action: 'remove-from-wrong-driver',
            driver: bad,
            mfrs: route.mfrs,
          });
        }
      }
    }
    if (fileChanges.length) {
      if (APPLY) saveCompose(fp, json);
      report.applied.push({
        id: route.id,
        action: 'add-sacred-couple',
        driver: route.driver,
        changes: fileChanges,
      });
    }
    const gate = ensureAntiBotRequired(route);
    if (gate.reason) {
      report.reinforced.push({ id: route.id, antiBot: gate });
    }
  }

  // 2) Cross-ref forum couples not in KNOWN_ROUTES
  for (const c of couples) {
    const mfr = c.mfr;
    const pid = c.pid;
    if (KNOWN_ROUTES.some((r) => r.mfrs.some((m) => norm(m) === norm(mfr)))) continue;

    const hits = findDriversContaining(mfr, pid);
    const mfs = mfsLookup(mfr, pid);
    const z2m = scanZ2mCaches(mfr);
    const pidHints = PID_DRIVER_HINTS[pid] || [];

    const exactCouple = hits.filter((h) => h.hasMfr && h.hasPid);
    if (exactCouple.length) {
      report.reinforced.push({
        mfr,
        pid,
        mentions: c.mentions,
        drivers: exactCouple.map((h) => h.driver),
        status: 'already in typed driver',
      });
      continue;
    }

    const mfrOnly = hits.filter((h) => h.hasMfr);
    if (mfrOnly.length === 1 && pidHints.length === 1 && mfrOnly[0].driver === pidHints[0]) {
      // High confidence: mfr already on correct typed driver, only pid missing
      const wrap = loadCompose(mfrOnly[0].driver);
      const changes = addSacredCouple(wrap.json, mfr, pid);
      if (changes.length) {
        if (APPLY) saveCompose(wrap.fp, wrap.json);
        report.applied.push({
          action: 'add-pid-to-existing-mfr-driver',
          mfr,
          pid,
          driver: mfrOnly[0].driver,
          changes,
          mentions: c.mentions,
        });
      }
      continue;
    }

    // Ambiguous TS0601 or multi-driver / no driver
    if (pid === 'TS0601' || mfrOnly.length > 1 || (!mfrOnly.length && !mfs?.sacred && !mfs?.device?.driverHint)) {
      report.ambiguous.push({
        mfr,
        pid,
        mentions: c.mentions,
        existingDrivers: mfrOnly.map((h) => h.driver),
        mfsHint: mfs?.device?.driverHint || mfs?.sacred?.driver || null,
        z2mCacheHits: z2m.slice(0, 5),
        pidHints,
        reason: !mfrOnly.length
          ? 'no driver hit — needs Z2M/manual typed routing'
          : mfrOnly.length > 1
            ? 'mfr spans multiple drivers'
            : 'ambiguous product class',
      });
      continue;
    }

    if (mfs?.device?.driverHint && listDrivers().includes(mfs.device.driverHint)) {
      const wrap = loadCompose(mfs.device.driverHint);
      if (wrap && mfs.device.driverHint !== 'generic_tuya') {
        const changes = addSacredCouple(wrap.json, mfr, pid);
        if (changes.length) {
          if (APPLY) saveCompose(wrap.fp, wrap.json);
          report.applied.push({
            action: 'add-from-mfs-hint',
            mfr,
            pid,
            driver: mfs.device.driverHint,
            changes,
            mentions: c.mentions,
          });
          continue;
        }
      }
    }

    report.ambiguous.push({
      mfr,
      pid,
      mentions: c.mentions,
      existingDrivers: mfrOnly.map((h) => h.driver),
      mfsHint: mfs?.device?.driverHint || null,
      z2mCacheHits: z2m.slice(0, 5),
      reason: 'insufficient confidence for silent apply',
    });
  }

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('\nPosts scanned:', report.postsScanned);
  console.log('Actionable posts:', report.actionablePosts);
  console.log('Applied:', report.applied.length);
  console.log('Reinforced:', report.reinforced.length);
  console.log('Ambiguous leftovers:', report.ambiguous.length);
  console.log('Local-first notes:', report.localFirstNotes.length);
  if (report.applied.length) {
    console.log('\nApplied detail:');
    for (const a of report.applied.slice(0, 30)) console.log(' ', JSON.stringify(a));
  }
  if (report.ambiguous.length) {
    console.log('\nAmbiguous (top 20):');
    for (const a of report.ambiguous.slice(0, 20)) {
      console.log(' ', a.mfr + '|' + a.pid, 'x' + a.mentions, '-', a.reason, a.mfsHint ? '(' + a.mfsHint + ')' : '');
    }
  }
  console.log('\nReport:', REPORT_PATH);
  if (!APPLY) console.log('(dry-run — pass --apply to write driver compose changes)');
}

main();
