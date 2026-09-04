#!/usr/bin/env node
'use strict';

/**
 * compensate-incomplete-reports.js (P2418)
 *
 * WHY: Forum/gmail posts often omit productId — do not stall. Soft-hypothesize from
 * verified SSOT, document NEED_INTERVIEW, run auto-investigate, never invent pid,
 * never forum POST.
 *
 * HOW: Read soft-hypotheses-missing-pid.json + actionable processor / NEED_ACTION;
 * write reports/compensate-YYYY-MM-DD/; optionally verify compose locks for applySafe.
 *
 * Usage:
 *   node tools/ci/compensate-incomplete-reports.js
 *   node tools/ci/compensate-incomplete-reports.js --apply-safe
 *   node tools/ci/compensate-incomplete-reports.js --skip-investigate
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const APPLY_SAFE = process.argv.includes('--apply-safe');
const SKIP_INVESTIGATE = process.argv.includes('--skip-investigate');
const DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(ROOT, 'reports', `compensate-${DATE}`);
const HYPO_PATH = path.join(ROOT, 'config', 'enrichment', 'soft-hypotheses-missing-pid.json');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function listNeedActionMissingPid() {
  const missing = [];
  const procPath = path.join(ROOT, '.github', 'state', 'forum', 'actionable-processor-report.json');
  if (fs.existsSync(procPath)) {
    const st = fs.statSync(procPath);
    if (st.size < 8_000_000) {
      const proc = readJson(procPath);
      const rows = proc?.posts || proc?.items || proc?.needAction || [];
      for (const r of rows) {
        const verdict = String(r.verdict || r.coupleVerdict || r.action || '');
        const mfr = r.mfr || r.manufacturerName || (r.couples && r.couples[0]?.mfr);
        if (/MISSING_PID|request-diag-couple/i.test(verdict) || (!r.pid && mfr)) {
          if (mfr) missing.push({ mfr: String(mfr), topic: r.topicId, post: r.postNumber, user: r.username });
        }
      }
    }
  }
  // Fallback: scan PROCESS.md style reports (cap size — avoid regex hang on huge files)
  const procMd = path.join(ROOT, 'reports', `forum-verify-${DATE}`, 'PROCESS.md');
  const alt = path.join(ROOT, 'reports', 'forum-verify-2026-09-03', 'PROCESS.md');
  for (const md of [procMd, alt]) {
    if (!fs.existsSync(md)) continue;
    let text = fs.readFileSync(md, 'utf8');
    if (text.length > 200000) text = text.slice(0, 200000);
    const re = /(_TZ[E0-9A-Za-z]+_[A-Za-z0-9]+)[^\n]{0,80}MISSING_PID/gi;
    let m;
    let guard = 0;
    while ((m = re.exec(text)) && guard++ < 200) {
      missing.push({ mfr: m[1], source: path.basename(path.dirname(md)) });
    }
  }
  return missing;
}

function normalizeMfr(m) {
  return String(m || '').toLowerCase();
}

function hasCoupleInCompose(driver, mfr, pid) {
  const p = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  if (!fs.existsSync(p)) return false;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const mfrs = (j.zigbee?.manufacturerName || []).map(normalizeMfr);
  const pids = (j.zigbee?.productId || []).map((x) => String(x).toUpperCase());
  return mfrs.includes(normalizeMfr(mfr)) && pids.includes(String(pid).toUpperCase());
}

function ensureMfrInCompose(driver, mfr) {
  const p = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  if (!fs.existsSync(p)) return { ok: false, reason: 'no-compose' };
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const list = j.zigbee.manufacturerName || [];
  const low = normalizeMfr(mfr);
  if (list.some((x) => normalizeMfr(x) === low)) return { ok: true, already: true };
  // Add both case variants for Homey matching
  list.push(mfr);
  if (mfr !== mfr.toLowerCase()) list.push(mfr.toLowerCase());
  j.zigbee.manufacturerName = [...new Set(list)];
  fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
  return { ok: true, added: true };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const hypoDoc = readJson(HYPO_PATH) || { hypotheses: [] };
  const missing = listNeedActionMissingPid();
  const matched = [];
  const needInterview = [];
  const applied = [];

  for (const h of hypoDoc.hypotheses || []) {
    const locked = hasCoupleInCompose(h.driver, h.mfr, h.pid);
    const hit = missing.filter((m) => normalizeMfr(m.mfr) === normalizeMfr(h.mfr));
    const row = {
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
    };
    matched.push(row);
    if (!locked || hit.length) {
      needInterview.push({
        couple: `${h.mfr}+${h.pid}`,
        driver: h.driver,
        fields: h.expectedInterview || ['zb_manufacturer_name', 'zb_model_id'],
        why: hit.length ? 'MISSING_PID in forum/processor' : 'soft-hypothesize until interview confirm',
      });
    }
    if (APPLY_SAFE && h.applySafe && h.confidence >= 95 && !locked) {
      const r = ensureMfrInCompose(h.driver, h.mfr);
      // pid must already be on driver productId list — never invent pid onto compose
      if (r.ok && hasCoupleInCompose(h.driver, h.mfr, h.pid)) {
        applied.push({ mfr: h.mfr, pid: h.pid, driver: h.driver, ...r });
      }
    }
  }

  let investigate = null;
  if (!SKIP_INVESTIGATE && fs.existsSync(path.join(ROOT, 'tools', 'ci', 'auto-investigate-need-action.js'))) {
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'tools', 'ci', 'auto-investigate-need-action.js')], {
        cwd: ROOT,
        stdio: 'pipe',
        timeout: 180000,
      });
      investigate = { ok: true };
    } catch (e) {
      investigate = { ok: false, error: String(e.message || e).slice(0, 200) };
    }
  }

  const summary = {
    patch: 'P2418',
    generatedAt: new Date().toISOString(),
    missingPidHints: missing.length,
    hypotheses: matched.length,
    needInterview: needInterview.length,
    applied: applied.length,
    applySafeMode: APPLY_SAFE,
    investigate,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'SUMMARY.json'), `${JSON.stringify({ summary, matched, needInterview, applied, missing }, null, 2)}\n`);

  const md = [
    `# Compensate incomplete reports — ${DATE}`,
    '',
    'Silent only. Soft hypotheses from SSOT — **never invent pid**. No forum POST (T157628).',
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
    '- Class-level fixes (battery, button RX, soft-expect) ship without pid',
    '- Publish Homey Test; never Community reply',
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'TREAT.md'), `${md.join('\n')}\n`);

  console.log('[P2418] compensate-incomplete-reports');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${OUT_DIR}`);
}

main();
