#!/usr/bin/env node
'use strict';

/**
 * intelligent-github-respond.js — Ship 0
 *
 * WHY: Human issues/PRs need verified couple-aware replies; forum stays SHADOW.
 * HOW: Extract mfr+pid → lookup compose/mfs → draft Dylan-style comment → dry-run default.
 * WHO: Maintainer / CI with GH_PAT. Never posts to Homey Community.
 * WHEN: --scan-open | --issue=N | --pr=N | --recent-human
 * AGAINST: Inventing pid; closing human bugs without proof; AI paste walls.
 *
 * Usage:
 *   node tools/ci/intelligent-github-respond.js --dry-run --scan-open
 *   node tools/ci/intelligent-github-respond.js --apply --issue=513
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const TAG = '<!-- tuya-intel-github-respond -->';
const OWN = process.env.GITHUB_REPOSITORY || 'dlnraja/com.tuya.zigbee';
const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN || (() => {
  try {
    return require('child_process').execSync('gh auth token', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
})();
const APPLY = process.argv.includes('--apply');
const DRY = !APPLY || process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
const MAX = parseInt(process.env.MAX_ISSUES || '20', 10);

const MFR_RE = /_T[YZ][A-Z0-9]{2,5}_[A-Za-z0-9]{4,20}/gi;
const PID_RE = /\b(TS[0-9A-Z]{3,6}|TS0601_rcbo|ZG-?\d+\w*)\b/g;

let appVer = '?';
try {
  appVer = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'))).version;
} catch { /* ignore */ }

function argVal(name) {
  const a = process.argv.find((x) => x.startsWith(`${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
}

function loadComposeIndex() {
  const byCouple = new Map();
  const dir = path.join(ROOT, 'drivers');
  for (const id of fs.readdirSync(dir)) {
    const fp = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(fp));
      const mfrs = c.zigbee?.manufacturerName || [];
      const pids = c.zigbee?.productId || [];
      for (const m of mfrs) {
        for (const p of pids) {
          byCouple.set(`${String(m).toLowerCase()}|${String(p).toLowerCase()}`, id);
        }
      }
    } catch { /* skip */ }
  }
  return byCouple;
}

function extractCouples(text) {
  const mfrs = [...new Set((String(text || '').match(MFR_RE) || []).map((m) => m))];
  const pids = [...new Set((String(text || '').match(PID_RE) || []).map((p) => p))];
  const couples = [];
  for (const m of mfrs) {
    for (const p of pids) couples.push({ mfr: m, pid: p });
    if (!pids.length) couples.push({ mfr: m, pid: null });
  }
  return { mfrs, pids, couples };
}

function resolveCouple(couple, index) {
  if (!couple.mfr || !couple.pid) {
    return { status: 'incomplete', note: 'need manufacturerName + productId (interview / diag)' };
  }
  const key = `${couple.mfr.toLowerCase()}|${couple.pid.toLowerCase()}`;
  const driver = index.get(key);
  if (driver) return { status: 'locked', driver, note: `compose → ${driver}` };
  return { status: 'unknown', note: 'couple not in compose — soft only, do not invent' };
}

function buildIssueComment({ number, title, resolved, couples }) {
  const lines = [
    TAG,
    `Quick check on #${number} (app Test tip **v${appVer}**).`,
    '',
  ];
  if (!couples.length) {
    lines.push(
      'I could not find a manufacturerName + productId pair in the report.',
      'Please send a Homey diagnostics report (or interview) with both fields — I will not invent a productId.',
      '',
    );
  } else {
    lines.push('What I found:');
    for (const r of resolved.slice(0, 8)) {
      const c = `${r.mfr}+${r.pid || '?'}`;
      lines.push(`- \`${c}\` → ${r.status}${r.driver ? ` (**${r.driver}**)` : ''} — ${r.note}`);
    }
    lines.push('');
  }
  lines.push(
    'If you are on an older Test build: update **Universal Tuya** Test to the latest, then remove the device and re-pair if the driver tile was wrong.',
    '',
    'Tracks: master soak `com.dlnraja.tuya.zigbee` · Stable LTS is a separate App ID — do not mix versions.',
  );
  return lines.join('\n');
}

function buildPrComment({ number, title }) {
  return [
    TAG,
    `PR #${number} review notes (v${appVer}):`,
    '',
    '- Lock fingerprints as **manufacturerName + productId** only (sacred couple).',
    '- Homey bundle: no `tools/` / `config/enrichment` / raw secrets; Buffer-parse large JSON.',
    '- Flow card IDs must exist in compose — never invent `*_1gang_button_pressed` / `*_button_N_button_pressed`.',
    '- Dual-app: classify BOTH | MASTER_ONLY | STABLE_ONLY before backport.',
    '',
    `Title context: ${String(title || '').slice(0, 120)}`,
  ].join('\n');
}

async function gh(method, ep, body) {
  if (!TOKEN && !DRY && method !== 'GET') throw new Error('GH_PAT/GITHUB_TOKEN required for --apply');
  if (DRY && method !== 'GET') {
    console.log(`[DRY] ${method} ${ep}`, body ? JSON.stringify(body).slice(0, 160) : '');
    return { ok: true, dry: true };
  }
  const url = ep.startsWith('http') ? ep : `https://api.github.com${ep}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'tuya-intel-github-respond',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    console.warn(`GH ${method} ${ep} → ${res.status} ${t.slice(0, 200)}`);
    return null;
  }
  if (res.status === 204) return { ok: true };
  return res.json();
}

async function listOpenIssues() {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh('GET', `/repos/${OWN}/issues?state=open&per_page=100&page=${page}`);
    if (!batch?.length) break;
    all.push(...batch.filter((i) => !i.pull_request));
    if (batch.length < 100) break;
  }
  return all;
}

async function listOpenPrs() {
  const batch = await gh('GET', `/repos/${OWN}/pulls?state=open&per_page=50`);
  return Array.isArray(batch) ? batch : [];
}

async function recentHumanClosed() {
  const ids = (argVal('--recent-human') || '513,516,511').split(',').map((x) => parseInt(x, 10)).filter(Boolean);
  const out = [];
  for (const n of ids) {
    const iss = await gh('GET', `/repos/${OWN}/issues/${n}`);
    if (iss && !iss.pull_request) out.push(iss);
  }
  return out;
}

async function alreadyCommented(issueNumber) {
  const comments = await gh('GET', `/repos/${OWN}/issues/${issueNumber}/comments?per_page=30`);
  if (!Array.isArray(comments)) return false;
  return comments.some((c) => String(c.body || '').includes(TAG));
}

async function main() {
  const index = loadComposeIndex();
  const issueN = argVal('--issue') ? parseInt(argVal('--issue'), 10) : null;
  const prN = argVal('--pr') ? parseInt(argVal('--pr'), 10) : null;
  const scanOpen = process.argv.includes('--scan-open');
  const recent = process.argv.includes('--recent-human');

  console.log(`=== intelligent-github-respond ===`);
  console.log(`Mode: ${DRY ? 'DRY' : 'LIVE'} | app=${appVer} | couplesIndexed=${index.size}`);

  const report = {
    generatedAt: new Date().toISOString(),
    appVersion: appVer,
    dryRun: DRY,
    actions: [],
  };

  let issues = [];
  let prs = [];

  if (issueN) {
    const one = await gh('GET', `/repos/${OWN}/issues/${issueN}`);
    if (one && !one.pull_request) issues = [one];
  } else if (prN) {
    const one = await gh('GET', `/repos/${OWN}/pulls/${prN}`);
    if (one) prs = [one];
  } else if (recent) {
    issues = await recentHumanClosed();
  } else if (scanOpen) {
    issues = (await listOpenIssues()).slice(0, MAX);
    prs = (await listOpenPrs()).slice(0, MAX);
  } else {
    issues = (await listOpenIssues()).slice(0, MAX);
    prs = (await listOpenPrs()).slice(0, MAX);
    if (!issues.length && !prs.length) {
      issues = await recentHumanClosed();
    }
  }

  for (const issue of issues) {
    const text = `${issue.title}\n${issue.body || ''}`;
    const { couples } = extractCouples(text);
    const resolved = couples.map((c) => ({ ...c, ...resolveCouple(c, index) }));
    const body = buildIssueComment({
      number: issue.number,
      title: issue.title,
      resolved,
      couples,
    });
    const skip = await alreadyCommented(issue.number);
    console.log(`Issue #${issue.number}: couples=${couples.length} skipDup=${!!skip}`);
    report.actions.push({
      type: 'issue',
      number: issue.number,
      couples: resolved,
      skipped: !!skip,
      preview: body.slice(0, 280),
    });
    if (!skip) {
      await gh('POST', `/repos/${OWN}/issues/${issue.number}/comments`, { body });
    }
  }

  for (const pr of prs) {
    const body = buildPrComment({ number: pr.number, title: pr.title });
    console.log(`PR #${pr.number}: review draft`);
    report.actions.push({ type: 'pr', number: pr.number, preview: body.slice(0, 280) });
    await gh('POST', `/repos/${OWN}/issues/${pr.number}/comments`, { body });
  }

  const outDir = path.join(ROOT, 'reports', `github-intel-${new Date().toISOString().slice(0, 10)}`);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'respond-report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`Report: ${outFile}`);
  console.log(`Done. openIssues=${issues.length} openPrs=${prs.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
