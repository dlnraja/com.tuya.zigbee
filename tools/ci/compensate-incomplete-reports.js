#!/usr/bin/env node
'use strict';

/**
 * compensate-incomplete-reports.js (P2418 / P2419 hang-proof)
 *
 * WHY: Forum/gmail posts often omit productId — do not stall. Soft-hypothesize from
 * verified SSOT, document NEED_INTERVIEW, never invent pid, never forum POST.
 *
 * P2419: prior local/CI hangs came from catastrophic regex on PROCESS.md and
 * optional auto-investigate without a hard wall clock. This script MUST finish
 * within COMPENSATE_MAX_MS (default 45s) and always exit 0 in cron mode.
 *
 * Usage:
 *   node tools/ci/compensate-incomplete-reports.js
 *   node tools/ci/compensate-incomplete-reports.js --apply-safe
 *   node tools/ci/compensate-incomplete-reports.js --skip-investigate
 *   COMPENSATE_MAX_MS=30000 node tools/ci/compensate-incomplete-reports.js
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const APPLY_SAFE = process.argv.includes('--apply-safe');
const SKIP_INVESTIGATE = process.argv.includes('--skip-investigate')
  || process.env.COMPENSATE_SKIP_INVESTIGATE === '1'
  || process.env.CI === 'true';
const CRON_SOFT = process.env.COMPENSATE_SOFT_EXIT !== '0';
const MAX_MS = Math.max(5000, Number(process.env.COMPENSATE_MAX_MS || 45000));
const DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(ROOT, 'reports', `compensate-${DATE}`);
const HYPO_PATH = path.join(ROOT, 'config', 'enrichment', 'soft-hypotheses-missing-pid.json');
const MFR_TOKEN = /_TZ[E0-9A-Za-z]+_[A-Za-z0-9]+/i;
const startedAt = Date.now();

function timedOut() {
  return Date.now() - startedAt > MAX_MS;
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Line-scan PROCESS.md — O(n) per line, no cross-line regex backtracking.
 */
function scanProcessMdForMissingPid(filePath, missing, limit = 80) {
  if (!fs.existsSync(filePath) || timedOut()) return;
  const st = fs.statSync(filePath);
  if (st.size > 2_000_000) {
    // Only read first 512KB of huge reports
  }
  const fd = fs.openSync(filePath, 'r');
  try {
    const maxBytes = Math.min(st.size, 512_000);
    const buf = Buffer.alloc(maxBytes);
    fs.readSync(fd, buf, 0, maxBytes, 0);
    const lines = buf.toString('utf8').split(/\r?\n/);
    let found = 0;
    for (const line of lines) {
      if (timedOut() || found >= limit) break;
      if (!/MISSING_PID/i.test(line)) continue;
      const m = line.match(MFR_TOKEN);
      if (m) {
        missing.push({ mfr: m[0], source: path.basename(path.dirname(filePath)) });
        found += 1;
      }
    }
  } finally {
    fs.closeSync(fd);
  }
}

function listNeedActionMissingPid() {
  const missing = [];
  if (timedOut()) return missing;

  const procPath = path.join(ROOT, '.github', 'state', 'forum', 'actionable-processor-report.json');
  if (fs.existsSync(procPath)) {
    const st = fs.statSync(procPath);
    // Cap: large processor dumps caused local hangs when fully parsed.
    if (st.size > 0 && st.size < 2_000_000) {
      const proc = readJson(procPath);
      const rows = proc?.posts || proc?.items || proc?.needAction || [];
      const cap = Math.min(rows.length, 500);
      for (let i = 0; i < cap; i += 1) {
        if (timedOut()) break;
        const r = rows[i];
        const verdict = String(r.verdict || r.coupleVerdict || r.action || '');
        const mfr = r.mfr || r.manufacturerName || (r.couples && r.couples[0]?.mfr);
        const pid = r.pid || r.productId || (r.couples && r.couples[0]?.pid);
        if (/MISSING_PID|request-diag-couple/i.test(verdict) || (mfr && !pid)) {
          if (mfr) missing.push({ mfr: String(mfr), topic: r.topicId, post: r.postNumber, user: r.username });
        }
      }
    }
  }

  const candidates = [
    path.join(ROOT, 'reports', `forum-verify-${DATE}`, 'PROCESS.md'),
    path.join(ROOT, 'reports', 'forum-verify-2026-09-03', 'PROCESS.md'),
    path.join(ROOT, 'reports', 'forum-verify-2026-09-04', 'PROCESS.md'),
  ];
  for (const md of candidates) {
    if (timedOut()) break;
    scanProcessMdForMissingPid(md, missing);
  }
  return missing;
}

function normalizeMfr(m) {
  return String(m || '').toLowerCase();
}

function hasCoupleInCompose(driver, mfr, pid) {
  const p = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  if (!fs.existsSync(p)) return false;
  let j;
  try {
    j = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return false;
  }
  const mfrs = (j.zigbee?.manufacturerName || []).map(normalizeMfr);
  const pids = (j.zigbee?.productId || []).map((x) => String(x).toUpperCase());
  return mfrs.includes(normalizeMfr(mfr)) && pids.includes(String(pid).toUpperCase());
}

function ensureMfrInCompose(driver, mfr) {
  const p = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  if (!fs.existsSync(p)) return { ok: false, reason: 'no-compose' };
  let j;
  try {
    j = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return { ok: false, reason: e.message };
  }
  const list = j.zigbee.manufacturerName || [];
  const low = normalizeMfr(mfr);
  if (list.some((x) => normalizeMfr(x) === low)) return { ok: true, already: true };
  list.push(mfr);
  if (mfr !== mfr.toLowerCase()) list.push(mfr.toLowerCase());
  j.zigbee.manufacturerName = [...new Set(list)];
  fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
  return { ok: true, added: true };
}

function writeOutputs({ missing, matched, needInterview, applied, investigate, aborted }) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const summary = {
    patch: 'P2419',
    generatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    maxMs: MAX_MS,
    aborted: !!aborted,
    missingPidHints: missing.length,
    hypotheses: matched.length,
    needInterview: needInterview.length,
    applied: applied.length,
    applySafeMode: APPLY_SAFE,
    skipInvestigate: SKIP_INVESTIGATE,
    investigate,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, 'SUMMARY.json'),
    `${JSON.stringify({ summary, matched, needInterview, applied, missing: missing.slice(0, 100) }, null, 2)}\n`,
  );

  const md = [
    `# Compensate incomplete reports — ${DATE}`,
    '',
    'Silent only. Soft hypotheses from SSOT — **never invent pid**. No forum POST (T157628).',
    '',
    `Elapsed: **${summary.elapsedMs}ms** / budget ${MAX_MS}ms${aborted ? ' · **ABORTED by wall-clock**' : ''}`,
    '',
    `Missing-PID hints: **${missing.length}** · Hypotheses: **${matched.length}** · NEED_INTERVIEW: **${needInterview.length}** · Applied: **${applied.length}**`,
    '',
    '## Soft hypotheses',
    '',
    '| Couple | Driver | Conf | Locked | Soft apply |',
    '|--------|--------|-----:|:------:|:----------:|',
    ...matched.map((r) =>
      `| \`${r.mfr}+${r.pid}\` | \`${r.driver}\` | ${r.confidence} | ${r.lockedInCompose ? 'yes' : 'no'} | ${r.applySafe ? 'safe' : 'doc-only'} |`),
    '',
    '## NEED_INTERVIEW (compensate without waiting)',
    '',
    ...needInterview.slice(0, 20).map((n) =>
      `- **${n.couple}** → \`${n.driver}\` — ask: ${n.fields.join(', ')} (${n.why})`),
    '',
    '## Doctrine',
    '- Continue treating posts even when couple absent',
    '- Class-level fixes ship without pid',
    '- Hang-proof: line-scan + wall-clock; never block cron',
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'TREAT.md'), `${md.join('\n')}\n`);
  console.log('[P2419] compensate-incomplete-reports');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${OUT_DIR}`);
  return summary;
}

function main() {
  // Hard watchdog — kill runaway even if sync I/O stalls (Windows + CI).
  const watchdog = setTimeout(() => {
    try {
      writeOutputs({
        missing: [],
        matched: [],
        needInterview: [],
        applied: [],
        investigate: { ok: false, error: 'watchdog-timeout' },
        aborted: true,
      });
    } catch (_e) { /* ignore */ }
    console.error(`[P2419] WATCHDOG exit after ${MAX_MS}ms`);
    process.exit(CRON_SOFT ? 0 : 1);
  }, MAX_MS + 2000);
  if (typeof watchdog.unref === 'function') watchdog.unref();

  const hypoDoc = readJson(HYPO_PATH) || { hypotheses: [] };
  const missing = listNeedActionMissingPid();
  const matched = [];
  const needInterview = [];
  const applied = [];

  for (const h of hypoDoc.hypotheses || []) {
    if (timedOut()) break;
    const locked = hasCoupleInCompose(h.driver, h.mfr, h.pid);
    const hit = missing.filter((m) => normalizeMfr(m.mfr) === normalizeMfr(h.mfr));
    matched.push({
      mfr: h.mfr,
      pid: h.pid,
      driver: h.driver,
      confidence: h.confidence,
      applySafe: !!h.applySafe,
      lockedInCompose: locked,
      missingPidReports: hit.length,
      sources: h.sources || [],
      expectedInterview: h.expectedInterview || [],
      note: h.note || null,
    });
    if (!locked || hit.length) {
      needInterview.push({
        couple: `${h.mfr}+${h.pid}`,
        driver: h.driver,
        fields: h.expectedInterview || ['zb_manufacturer_name', 'zb_model_id'],
        why: hit.length ? 'MISSING_PID in forum/processor' : 'soft-hypothesize until interview confirm',
      });
    }
    if (APPLY_SAFE && h.applySafe && h.confidence >= 95 && !locked && !timedOut()) {
      const r = ensureMfrInCompose(h.driver, h.mfr);
      if (r.ok && hasCoupleInCompose(h.driver, h.mfr, h.pid)) {
        applied.push({ mfr: h.mfr, pid: h.pid, driver: h.driver, ...r });
      }
    }
  }

  let investigate = null;
  if (!SKIP_INVESTIGATE && !timedOut()
    && fs.existsSync(path.join(ROOT, 'tools', 'ci', 'auto-investigate-need-action.js'))) {
    const budgetLeft = Math.max(3000, MAX_MS - (Date.now() - startedAt) - 2000);
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'tools', 'ci', 'auto-investigate-need-action.js')], {
        cwd: ROOT,
        stdio: 'pipe',
        timeout: Math.min(30000, budgetLeft),
      });
      investigate = { ok: true };
    } catch (e) {
      investigate = { ok: false, error: String(e.message || e).slice(0, 200) };
    }
  } else if (SKIP_INVESTIGATE) {
    investigate = { ok: true, skipped: true };
  }

  const aborted = timedOut();
  writeOutputs({ missing, matched, needInterview, applied, investigate, aborted });
  clearTimeout(watchdog);
  // Cron/CI: never fail the workflow on soft compensate.
  process.exit(CRON_SOFT || !aborted ? 0 : 1);
}

try {
  main();
} catch (err) {
  console.error('[P2419] compensate failed soft:', err && err.message ? err.message : err);
  try {
    writeOutputs({
      missing: [],
      matched: [],
      needInterview: [],
      applied: [],
      investigate: { ok: false, error: String(err.message || err).slice(0, 200) },
      aborted: true,
    });
  } catch (_e) { /* ignore */ }
  process.exit(CRON_SOFT ? 0 : 1);
}
