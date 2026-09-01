#!/usr/bin/env node
'use strict';

/**
 * couple-absent-search.js (P2365)
 *
 * When a diag has couple ABSENT: search / cross-ref / soft-hypothesize —
 * NEVER invent pid, NEVER write compose.
 *
 * Usage:
 *   node tools/ci/couple-absent-search.js --uuid=05867379
 *   node tools/ci/couple-absent-search.js --driver=curtain_motor
 *   node tools/ci/couple-absent-search.js --uuid=05867379 --json
 */

const fs = require('fs');
const path = require('path');
const { lookupZ2m } = require('./market-driver-infer');

const ROOT = path.resolve(__dirname, '..', '..');
const DIAG_DIR = path.join(ROOT, '.github', 'state', 'homey-app-diag');
const REGISTRY = path.join(ROOT, 'data', 'user-misattribution-registry.json');
const INTERVIEWS = path.join(ROOT, 'docs', 'data', 'DEVICE_INTERVIEWS.json');
const IMPACT = path.join(ROOT, 'data', 'user-impact-catalog.json');

const UUID_ARG = (process.argv.find((a) => a.startsWith('--uuid=')) || '').split('=')[1];
const DRIVER_ARG = (process.argv.find((a) => a.startsWith('--driver=')) || '').split('=')[1];
const JSON_MODE = process.argv.includes('--json');

function norm(s) {
  return String(s || '').toLowerCase().trim();
}

function loadJson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function extractFromLog(text) {
  const t = String(text || '');
  const drivers = [...new Set((t.match(/\[Driver:([a-z0-9_]+)\]/gi) || [])
    .map((x) => x.replace(/\[Driver:/i, '').replace(']', '')))];
  const mfrs = [...new Set(t.match(/_T[ZY][A-Z0-9]+_[a-z0-9]+/gi) || [])];
  const pids = [...new Set((t.match(/\bpid=([A-Z0-9_]+)/gi) || [])
    .map((x) => x.replace(/^pid=/i, ''))
    .concat(t.match(/\b(TS[0-9]{4}[A-Z]?|ZG-[A-Z0-9]+|SMD[0-9]+|SM[0-9]+)\b/g) || []))];
  const couples = [];
  for (const m of mfrs) {
    for (const p of pids) {
      if (/^TS|^ZG|^SMD|^SM/i.test(p)) couples.push({ mfr: m, pid: p });
    }
  }
  const fleetMfr = (t.match(/mfr=(_T[ZY][A-Z0-9]+_[a-z0-9]+)/i) || [])[1];
  const fleetPid = (t.match(/pid=(TS[0-9A-Z]+)/i) || [])[1];
  if (fleetMfr && fleetPid) couples.unshift({ mfr: fleetMfr, pid: fleetPid, source: 'fleet_log' });
  return { drivers, mfrs, pids, couples };
}

function findDiag(uuidShort) {
  if (!fs.existsSync(DIAG_DIR)) return null;
  const needle = String(uuidShort || '').slice(0, 8).toLowerCase();
  const hits = fs.readdirSync(DIAG_DIR).filter((f) => f.toLowerCase().startsWith(needle));
  const hit = hits.find((f) => f.includes('.sanitized.')) || hits[0];
  if (!hit) return null;
  const j = loadJson(path.join(DIAG_DIR, hit));
  const log = j?.logSanitized || '';
  const ex = extractFromLog(log);
  return {
    file: hit,
    uuid: j?.uuid || hit.replace('.sanitized.json', ''),
    version: j?.version,
    createdAt: j?.createdAt,
    userMessage: (log.match(/User Message:\s*([\s\S]*?)\n\s*stdout:/i) || [])[1]?.trim() || null,
    ...ex,
    coupleAbsent: ex.couples.length === 0 && ex.mfrs.length === 0,
  };
}

function registryHypotheses(driver) {
  const reg = loadJson(REGISTRY, { cases: [] });
  const cases = reg.cases || reg.entries || [];
  const out = [];
  for (const c of cases) {
    const canon = c.canonicalDriver || c.driver;
    if (driver && canon !== driver) continue;
    const mfrs = [].concat(c.mfr || c.manufacturerName || []);
    const pids = [].concat(c.productId || c.productIds || c.pid || []);
    for (const m of mfrs) {
      for (const p of pids) {
        if (!m || !p) continue;
        out.push({
          mfr: m,
          pid: p,
          driver: canon,
          confidence: 'registry_locked',
          reason: c.id || c.notes?.slice(0, 80) || 'registry',
          sources: c.sources || [],
        });
      }
    }
  }
  return out;
}

function interviewHypotheses(driver) {
  const db = loadJson(INTERVIEWS, {});
  const buckets = db.interviews || db;
  const rows = [];
  if (Array.isArray(buckets)) {
    rows.push(...buckets);
  } else if (buckets && typeof buckets === 'object') {
    for (const v of Object.values(buckets)) {
      if (Array.isArray(v)) rows.push(...v);
    }
  }
  const out = [];
  for (const r of rows) {
    const drv = r.driver || r.driverId || r.suggestedDriver;
    const hay = `${r.deviceName || ''} ${(r.symptoms || []).join(' ')} ${r.notes || ''}`.toLowerCase();
    if (driver) {
      if (drv && norm(drv) !== norm(driver)) continue;
      if (!drv && !/(curtain|cover|blind|shutter|moes|zts|roller|motor)/i.test(hay)) continue;
    }
    const mfr = r.manufacturerName || r.mfr || r.zb_manufacturer_name;
    const pid = r.productId || r.pid || r.modelId || r.zb_model_id;
    if (!mfr || !pid || /^unknown$/i.test(mfr)) continue;
    out.push({
      mfr,
      pid,
      driver: drv,
      confidence: 'interview',
      reason: r.id || r.source || 'DEVICE_INTERVIEWS',
      sources: ['interview'],
    });
  }
  return out;
}

function githubContext(driver) {
  const out = [];
  const community = path.join(ROOT, 'reports', 'community-inbox.md');
  const text = fs.existsSync(community) ? fs.readFileSync(community, 'utf8') : '';
  if (/curtain|moes|5slehgeo|#533/i.test(text) && (!driver || driver === 'curtain_motor')) {
    out.push({
      mfr: '_TZE204_5slehgeo',
      pid: 'TS0601',
      driver: 'curtain_motor',
      confidence: 'github_context_soft',
      reason: 'GitHub #533 Salvagr Moes ZTS-EUR-C — NOT proven in target diag log',
      sources: ['github-533', 'diag-724d4bc9', 'PECULIARITIES-p2348'],
    });
  }
  return out;
}

function relatedDiags(driver) {
  if (!fs.existsSync(DIAG_DIR)) return [];
  const out = [];
  for (const f of fs.readdirSync(DIAG_DIR).filter((x) => x.endsWith('.sanitized.json'))) {
    const j = loadJson(path.join(DIAG_DIR, f));
    const log = j?.logSanitized || '';
    const ex = extractFromLog(log);
    if (driver && !ex.drivers.includes(driver)) continue;
    if (ex.couples.length === 0) continue;
    for (const c of ex.couples) {
      out.push({
        ...c,
        confidence: 'related_diag',
        reason: `same driver in diag ${f.slice(0, 8)} @ ${j?.version || '?'}`,
        sources: [f.slice(0, 8)],
      });
    }
  }
  return out;
}

function dedupeHypotheses(list) {
  const seen = new Set();
  return list.filter((h) => {
    const k = `${norm(h.mfr)}|${norm(h.pid)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function rankConfidence(c) {
  const order = {
    fleet_log: 0,
    proven_log: 1,
    github_context_soft: 2,
    registry_locked: 3,
    related_diag: 4,
    interview: 5,
    z2m_desc: 6,
  };
  return order[c] ?? 9;
}

function main() {
  const diag = UUID_ARG ? findDiag(UUID_ARG) : null;
  const driver = DRIVER_ARG || diag?.drivers?.[0] || null;

  const report = {
    generatedAt: new Date().toISOString(),
    policy: 'search-not-invent — never write compose from soft hypotheses',
    query: { uuid: UUID_ARG || null, driver },
    diag: diag ? {
      uuid: diag.uuid,
      version: diag.version,
      createdAt: diag.createdAt,
      userMessage: diag.userMessage,
      drivers: diag.drivers,
      coupleAbsent: diag.coupleAbsent,
      couplesInLog: diag.couples,
    } : null,
    hypotheses: [],
    action: 'Request fresh Homey diag with [COVER-INIT] or [FLEET] mfr=… pid=… lines',
  };

  let hypotheses = [];
  if (diag?.couples?.length) {
    hypotheses = diag.couples.map((c) => ({
      ...c,
      confidence: c.source === 'fleet_log' ? 'fleet_log' : 'proven_log',
      reason: 'present in diag log',
    }));
  } else {
    hypotheses = [
      ...githubContext(driver),
      ...registryHypotheses(driver),
      ...relatedDiags(driver),
      ...interviewHypotheses(driver),
    ];
    for (const h of hypotheses) {
      const z2m = lookupZ2m(h.mfr, h.pid);
      if (z2m?.description) {
        h.z2mDesc = z2m.description.slice(0, 120);
        if (h.confidence === 'github_context_soft') h.sources = [...(h.sources || []), 'z2m'];
      }
    }
  }

  report.hypotheses = dedupeHypotheses(hypotheses)
    .sort((a, b) => rankConfidence(a.confidence) - rankConfidence(b.confidence))
    .slice(0, 20);

  const outDir = path.join(ROOT, 'reports', 'couple-absent-search');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${UUID_ARG || driver || 'scan'}.json`);
  fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('=== couple-absent-search ===');
  console.log('Policy:', report.policy);
  if (diag) {
    console.log(`Diag: ${diag.uuid} @ ${diag.version} — coupleAbsent=${diag.coupleAbsent}`);
    console.log(`Message: ${diag.userMessage || '—'}`);
  }
  console.log(`Driver scope: ${driver || 'any'}`);
  console.log(`Hypotheses: ${report.hypotheses.length} (see ${outFile})`);
  for (const h of report.hypotheses.slice(0, 12)) {
    console.log(`  [${h.confidence}] ${h.mfr}+${h.pid} → ${h.driver || '?'} — ${h.reason}`);
  }
  console.log(`\nNext: ${report.action}`);
}

if (require.main === module) main();

module.exports = { findDiag, extractFromLog, main };
