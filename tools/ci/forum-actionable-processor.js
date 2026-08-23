#!/usr/bin/env node
'use strict';

/**
 * forum-actionable-processor.js (P2210)
 *
 * Process every actionable forum post ONE BY ONE:
 * - Sacred couple (mfr+pid) extraction
 * - Cross-ref: drivers, misattribution registry, KNOWN_ROUTES, device-truth
 * - Dual-app classification (BOTH / MASTER_ONLY / STABLE_ONLY)
 * - Silent enrichment verdict (never posts)
 *
 * Usage:
 *   node tools/ci/forum-actionable-processor.js
 *   node tools/ci/forum-actionable-processor.js --apply-routes
 *   node tools/ci/forum-actionable-processor.js --report-dir=reports/forum-verify-2026-08-23
 */

const fs = require('fs');
const path = require('path');
const { lookup, isForbiddenDriver } = require('../../lib/pairing/UserMisattributionRegistry');
const { KNOWN_ROUTES: KNOWN_ROUTE_INDEX } = require('./apply-forum-silent-multi');

const { equalsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE = path.join(ROOT, '.github', 'state', 'forum');
const DIGEST = path.join(STATE, 'multi-silent-digest.json');
const REPORT_JSON = path.join(STATE, 'actionable-processor-report.json');

const APPLY_ROUTES = process.argv.includes('--apply-routes');
const NO_CHAIN = process.argv.includes('--no-chain');
const reportDirArg = process.argv.find((a) => a.startsWith('--report-dir='));
const REPORT_DIR = reportDirArg
  ? path.resolve(ROOT, reportDirArg.split('=')[1])
  : path.join(ROOT, 'reports', `forum-verify-${new Date().toISOString().slice(0, 10)}`);

const BOTH_ISSUES = /crash|ias|battery|contact|sos|timer|re-?pair|pair|gang|button|physical|0xfd|zone|leak|dimmer|brightness|meter|energy|rcbo|din|misattrib|wrong.?driver/i;
const MASTER_ISSUES = /memory|flow.?engine|scrape|feature|experimental|smart.?learn|availability|presence|circadian|cascade|mega/i;

function loadJson(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function buildDriverIndex() {
  const byCouple = new Map();
  const byMfr = new Map();
  const dir = path.join(ROOT, 'drivers');
  for (const id of fs.readdirSync(dir)) {
    const fp = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const mfrs = c.zigbee?.manufacturerName || [];
      const pids = c.zigbee?.productId || [];
      for (const m of mfrs) {
        const ml = String(m).toLowerCase();
        if (!byMfr.has(ml)) byMfr.set(ml, new Set());
        byMfr.get(ml).add(id);
        for (const p of pids) {
          const key = `${ml}|${String(p).toLowerCase()}`;
          if (!byCouple.has(key)) byCouple.set(key, new Set());
          byCouple.get(key).add(id);
        }
      }
    } catch { /* skip */ }
  }
  return { byCouple, byMfr };
}

function loadDeviceTruth() {
  const fp = path.join(ROOT, 'docs/knowledge/device-truth.json');
  const j = loadJson(fp);
  const map = new Map();
  if (!j?.drivers) return map;
  for (const [driverId, row] of Object.entries(j.drivers)) {
    for (const lock of row.locks || []) {
      if (lock.mfr && lock.productId) {
        map.set(`${String(lock.mfr).toLowerCase()}|${String(lock.productId).toLowerCase()}`, driverId);
      }
    }
  }
  return map;
}

function routeFor(mfr, pid) {
  // WHY: equalsCI — never use normalize() as a 2-arg predicate (always truthy → first route wins).
  for (const r of KNOWN_ROUTE_INDEX) {
    if (!r.mfrs?.some((m) => equalsCI(m, mfr))) continue;
    if (r.pids?.length && !r.pids.some((p) => equalsCI(p, pid))) continue;
    return r;
  }
  return null;
}

function classifyDualApp(issues, excerpt) {
  const blob = `${(issues || []).join(' ')} ${excerpt || ''}`;
  if (MASTER_ISSUES.test(blob) && !BOTH_ISSUES.test(blob)) {
    return { track: 'MASTER_ONLY', reason: 'Feature / memory / engine — soak master only' };
  }
  if (BOTH_ISSUES.test(blob)) {
    return { track: 'BOTH', reason: 'Reliability / pairing / sacred couple — master soak then stable backport' };
  }
  return { track: 'REVIEW', reason: 'Manual classification — see DUAL_APP_VISION.md' };
}

function couplesFromPost(post) {
  const mfrs = post.mfrs || [];
  const pids = post.pids || [];
  const out = [];
  if (mfrs.length && pids.length) {
    for (const m of mfrs) for (const p of pids) out.push({ mfr: m, pid: p });
  } else if (mfrs.length) {
    for (const m of mfrs) out.push({ mfr: m, pid: null });
  }
  return out;
}

function analyzeCouple(mfr, pid, index, truth) {
  const ml = String(mfr).toLowerCase();
  const np = pid ? String(pid).toLowerCase() : null;
  const reg = lookup(mfr, pid);
  const route = routeFor(mfr, pid || '');
  const truthDriver = np ? truth.get(`${ml}|${np}`) : null;

  let catalogDrivers = [];
  if (np) {
    catalogDrivers = [...(index.byCouple.get(`${ml}|${np}`) || [])];
  } else {
    catalogDrivers = [...(index.byMfr.get(ml) || [])];
  }

  const forbiddenHits = catalogDrivers.filter((d) => isForbiddenDriver(mfr, pid, d));
  // Prefer registry / known route / device-truth; SINGLE_DRIVER falls back to compose hit.
  const canonical = reg?.canonicalDriver
    || route?.driver
    || truthDriver
    || (catalogDrivers.length === 1 ? catalogDrivers[0] : null)
    || null;

  let verdict = 'INVESTIGATE';
  if (!np) verdict = 'MISSING_PID';
  else if (reg && catalogDrivers.length === 1 && catalogDrivers[0] === canonical) verdict = 'LOCKED_OK';
  else if (reg && canonical && !catalogDrivers.includes(canonical)) verdict = 'MISSING_IN_COMPOSE';
  else if (forbiddenHits.length) verdict = 'WRONG_DRIVER_PRESENT';
  else if (canonical && catalogDrivers.includes(canonical)) verdict = 'ROUTED_OK';
  else if (catalogDrivers.length > 1) verdict = 'COLLISION';
  else if (catalogDrivers.length === 1) verdict = 'SINGLE_DRIVER';
  else verdict = 'NOT_IN_CATALOG';

  return {
    mfr,
    pid,
    verdict,
    canonicalDriver: canonical,
    catalogDrivers,
    forbiddenDrivers: forbiddenHits,
    registryId: reg?.id || null,
    knownRouteId: route?.id || null,
    deviceTruthDriver: truthDriver,
  };
}

function processPost(topic, post, index, truth) {
  const couples = couplesFromPost(post);
  const dual = classifyDualApp(post.issues, post.excerpt);
  const coupleAnalysis = couples.map((c) => analyzeCouple(c.mfr, c.pid, index, truth));

  let action = 'silent-monitor';
  if (post.issues?.includes('sos') || post.issues?.includes('battery')) {
    action = dual.track === 'BOTH' ? 'code-fix-stable-candidate' : 'master-only-tune';
  } else if (coupleAnalysis.some((c) => ['WRONG_DRIVER_PRESENT', 'MISSING_IN_COMPOSE', 'NOT_IN_CATALOG'].includes(c.verdict))) {
    action = 'lock-sacred-couple';
  } else if (coupleAnalysis.some((c) => c.verdict === 'MISSING_PID')) {
    action = 'request-diag-couple';
  } else if (coupleAnalysis.every((c) => ['LOCKED_OK', 'ROUTED_OK', 'SINGLE_DRIVER'].includes(c.verdict))) {
    action = 'user-update-repair';
  }

  return {
    topicId: topic.id,
    topicName: topic.name,
    postNumber: post.post_number,
    username: post.username,
    date: post.created_at || post.date || null,
    issues: post.issues || [],
    excerpt: (post.excerpt || '').slice(0, 160),
    dualApp: dual,
    couples: coupleAnalysis,
    recommendedAction: action,
    forumReply: 'NEVER — silent enrichment only (T157628)',
  };
}

function renderMarkdown(report) {
  const lines = [
    `# Forum actionable processor — ${report.generatedAt.slice(0, 10)}`,
    '',
    `Posts processed: **${report.totals.posts}** | With couples: **${report.totals.withCouples}** | Need action: **${report.totals.needAction}**`,
    '',
    '| Topic | Post | User | Track | Action | Couple / verdict |',
    '|-------|------|------|-------|--------|------------------|',
  ];

  for (const row of report.posts) {
    const coupleStr = row.couples.length
      ? row.couples.map((c) => `${c.mfr}${c.pid ? '+' + c.pid : ''}→${c.verdict}`).join('; ')
      : (row.issues.join(',') || 'symptom-only');
    lines.push(`| T${row.topicId} | #${row.postNumber} | ${row.username} | ${row.dualApp.track} | ${row.recommendedAction} | ${coupleStr} |`);
  }

  lines.push('', '## Dual-app policy', '');
  lines.push('- **BOTH**: reliability fixes → master Test soak → surgical stable backport');
  lines.push('- **MASTER_ONLY**: features stay on Universal Tuya 9.x only');
  lines.push('- **Never forum post** unchecked AI (T157628)', '');
  return `${lines.join('\n')}\n`;
}

function main() {
  const digest = loadJson(DIGEST);
  if (!digest?.topics?.length) {
    console.error('[forum-actionable-processor] Missing digest — run forum-silent-multi-scan.js first');
    process.exit(1);
  }

  const index = buildDriverIndex();
  const truth = loadDeviceTruth();
  const posts = [];

  for (const topic of digest.topics) {
    for (const post of topic.actionable || []) {
      posts.push(processPost(topic, post, index, truth));
    }
  }

  posts.sort((a, b) => (b.topicId - a.topicId) || (b.postNumber - a.postNumber));

  const report = {
    generatedAt: new Date().toISOString(),
    policy: 'silent-first; REPLY_TOPICS=140352 only if human; never AI paste',
    totals: {
      posts: posts.length,
      withCouples: posts.filter((p) => p.couples.length).length,
      needAction: posts.filter((p) => p.recommendedAction !== 'silent-monitor' && p.recommendedAction !== 'user-update-repair').length,
      both: posts.filter((p) => p.dualApp.track === 'BOTH').length,
      masterOnly: posts.filter((p) => p.dualApp.track === 'MASTER_ONLY').length,
    },
    posts,
  };

  if (!fs.existsSync(STATE)) fs.mkdirSync(STATE, { recursive: true });
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'PROCESS.md'), renderMarkdown(report));
  fs.writeFileSync(path.join(REPORT_DIR, 'actionable-processor.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!NO_CHAIN) {
    if (APPLY_ROUTES) {
      const { execSync } = require('child_process');
      try {
        execSync('node tools/ci/apply-forum-silent-multi.js --apply', { cwd: ROOT, stdio: 'inherit' });
      } catch (e) {
        console.warn('[forum-actionable-processor] apply-forum-silent-multi --apply failed (non-fatal)');
      }
    } else {
      try {
        require('child_process').execSync('node tools/ci/apply-forum-silent-multi.js', { cwd: ROOT, stdio: 'inherit' });
      } catch (e) {
        console.warn('[forum-actionable-processor] apply-forum-silent-multi dry-run failed (non-fatal)');
      }
    }

    try {
      require('child_process').execSync(`node tools/ci/extract-forum-couples-once.js --out="${REPORT_DIR}"`, { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      console.warn('[forum-actionable-processor] extract-forum-couples-once failed (non-fatal)');
    }

    try {
      require('child_process').execSync('node tools/ci/parse-forum-digest.js --topic=140352', { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      console.warn('[forum-actionable-processor] parse-forum-digest failed (non-fatal)');
    }

    try {
      require('child_process').execSync('node tools/ci/user-impact-investigator.js --all-users', { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      console.warn('[forum-actionable-processor] user-impact-investigator failed (non-fatal)');
    }
  }

  console.log('=== forum-actionable-processor (P2210) ===');
  console.log('Posts:', report.totals.posts, '| need action:', report.totals.needAction);
  console.log('BOTH:', report.totals.both, '| MASTER_ONLY:', report.totals.masterOnly);
  console.log('JSON:', REPORT_JSON);
  console.log('Report:', path.join(REPORT_DIR, 'PROCESS.md'));

  const topAction = posts.filter((p) => !['silent-monitor', 'user-update-repair'].includes(p.recommendedAction)).slice(0, 12);
  if (topAction.length) {
    console.log('\n=== Top actionable (silent enrichment) ===');
    for (const row of topAction) {
      const couple = row.couples[0];
      const coupleStr = couple ? `${couple.mfr}${couple.pid ? '+' + couple.pid : ''}→${couple.verdict}` : row.issues.join(',') || 'symptom';
      console.log(` T${row.topicId} #${row.postNumber} @${row.username} | ${row.dualApp.track} | ${row.recommendedAction} | ${coupleStr}`);
    }
  }
}

main();
