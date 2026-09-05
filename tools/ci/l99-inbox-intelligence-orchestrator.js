#!/usr/bin/env node
'use strict';

/**
 * l99-inbox-intelligence-orchestrator.js (P2352)
 *
 * WHY: Regular intelligent harvest of Gmail + GitHub (issues/PRs) + Homey forum
 *      + driver/couple gates → prioritized silent enrichment report (never forum POST).
 * HOW: Soft phase runner driven by config/enrichment/l99-inbox-intelligence.json.
 * POUR QUI: GHA cron + maintainers; Homey users only via Auto-Publish / code.
 * QUAND: Every ~4h after forum-poll; workflow_dispatch; npm run inbox:l99.
 * CONTRE QUOI: Manual inbox drift; inventing pids; Cartesian mfs --apply; AI forum paste.
 *
 * Usage:
 *   node tools/ci/l99-inbox-intelligence-orchestrator.js
 *   node tools/ci/l99-inbox-intelligence-orchestrator.js --quick
 *   node tools/ci/l99-inbox-intelligence-orchestrator.js --skip-scan
 *   node tools/ci/l99-inbox-intelligence-orchestrator.js --phase=github
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const CFG_PATH = path.join(ROOT, 'config', 'enrichment', 'l99-inbox-intelligence.json');

function loadCfg() {
  return JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
}

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function writeJson(fp, obj) {
  ensureDir(path.dirname(fp));
  fs.writeFileSync(fp, `${JSON.stringify(obj, null, 2)}\n`);
}

function runNode(scriptRel, args = [], envExtra = {}, timeoutMs = 180000) {
  const script = path.join(ROOT, scriptRel);
  if (!fs.existsSync(script)) {
    return { ok: false, skipped: true, reason: `missing ${scriptRel}` };
  }
  const env = { ...process.env, ...envExtra };
  const t0 = Date.now();
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    env,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    ok: res.status === 0,
    skipped: false,
    status: res.status,
    durationMs: Date.now() - t0,
    stderr: String(res.stderr || '').slice(-800),
    stdoutTail: String(res.stdout || '').slice(-1200),
  };
}

function httpsJson(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'universal-tuya-l99-inbox',
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(body || 'null') });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

async function harvestGithub(cfg) {
  const token = process.env.GH_PAT || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const repo = cfg.github.repo;
  const [owner, name] = repo.split('/');
  const issuesUrl = `https://api.github.com/repos/${owner}/${name}/issues?state=open&per_page=${cfg.github.maxIssues}&sort=updated`;
  const prsUrl = `https://api.github.com/repos/${owner}/${name}/pulls?state=open&per_page=${cfg.github.maxPrs}&sort=updated`;

  let issues = [];
  let prs = [];
  let err = null;
  try {
    const [iRes, pRes] = await Promise.all([
      httpsJson(issuesUrl, token),
      httpsJson(prsUrl, token),
    ]);
    if (iRes.status === 200 && Array.isArray(iRes.json)) {
      issues = iRes.json
        .filter((x) => !x.pull_request)
        .map((x) => ({
          number: x.number,
          title: x.title,
          labels: (x.labels || []).map((l) => l.name),
          updatedAt: x.updated_at,
          user: x.user && x.user.login,
          htmlUrl: x.html_url,
          bodySnippet: String(x.body || '').slice(0, 280),
        }));
    }
    if (pRes.status === 200 && Array.isArray(pRes.json)) {
      prs = pRes.json.map((x) => ({
        number: x.number,
        title: x.title,
        updatedAt: x.updated_at,
        user: x.user && x.user.login,
        htmlUrl: x.html_url,
        draft: !!x.draft,
      }));
    }
    if (iRes.status !== 200) err = `issues HTTP ${iRes.status}`;
    if (pRes.status !== 200) err = `${err || ''} prs HTTP ${pRes.status}`.trim();
  } catch (e) {
    err = e.message;
  }

  return {
    harvestedAt: new Date().toISOString(),
    repo,
    auth: token ? 'token' : 'anonymous',
    error: err,
    issues,
    prs,
    openIssueCount: issues.length,
    openPrCount: prs.length,
  };
}

function readForumTotals() {
  const candidates = [
    path.join(ROOT, '.github', 'state', 'forum', 'actionable-processor-report.json'),
    path.join(ROOT, 'reports', `forum-verify-${today()}`, 'actionable-processor.json'),
  ];
  for (const fp of candidates) {
    if (!fs.existsSync(fp)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
      return { path: fp, totals: j.totals || null, posts: Array.isArray(j.posts) ? j.posts.length : null };
    } catch { /* next */ }
  }
  return null;
}

function readGmailCrashState() {
  const fp = path.join(ROOT, '.github', 'state', 'gmail-crash-patterns.json');
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return null;
  }
}

function scoreItems({ github, forum, gmail, mfs, cfg }) {
  const W = cfg.priorityWeights;
  const items = [];

  for (const iss of github.issues || []) {
    const labels = (iss.labels || []).map((l) => String(l).toLowerCase());
    let score = W.openIssueDevice;
    if (labels.some((l) => /crash|bug|regression/i.test(l)) || /crash|Invalid Driver/i.test(iss.title + iss.bodySnippet)) {
      score = W.openIssueCrash;
    }
    if (labels.some((l) => /device-request|needs-maintainer/i.test(l))) {
      score = Math.max(score, W.openIssueDevice);
    }
    items.push({
      score,
      dualApp: 'BOTH',
      source: 'github-issue',
      id: `#${iss.number}`,
      title: iss.title,
      url: iss.htmlUrl,
      action: 'investigate-code-silent',
      forumReply: 'NEVER',
    });
  }

  for (const pr of github.prs || []) {
    items.push({
      score: W.openPr,
      dualApp: 'MASTER_ONLY',
      source: 'github-pr',
      id: `PR#${pr.number}`,
      title: pr.title,
      url: pr.htmlUrl,
      action: 'review',
      forumReply: 'NEVER',
    });
  }

  if (gmail && (gmail.recentCrashCount > 0 || gmail.patternCount > 0 || gmail.crashes)) {
    items.push({
      score: W.gmailCrash,
      dualApp: 'BOTH',
      source: 'gmail',
      id: 'gmail-crashes',
      title: `Gmail crash patterns (${gmail.recentCrashCount || gmail.patternCount || 'see state'})`,
      action: 'fix-runtime-soft-fail',
      forumReply: 'NEVER',
    });
  }

  if (forum && forum.totals) {
    const need = forum.totals.needAction || 0;
    if (need > 0) {
      items.push({
        score: W.forumCodeFix,
        dualApp: 'BOTH',
        source: 'forum',
        id: 'forum-need-action',
        title: `${need} forum posts needAction (shadow processor)`,
        action: 'enrich:investigate + lock mfr+pid only',
        forumReply: 'NEVER',
      });
    }
  }

  if (mfs && mfs.high > 0) {
    items.push({
      score: W.mfsHighDrift,
      dualApp: 'BOTH',
      source: 'mfs-align',
      id: 'mfs-high-drift',
      title: `${mfs.high} high-severity mfs_db drift(s) — DO NOT blind --apply`,
      action: 'review-registry-cartesian / sacred couple',
      forumReply: 'NEVER',
    });
  }

  items.sort((a, b) => b.score - a.score);
  return items;
}

function parseMfsCheck(stdout) {
  const text = String(stdout || '');
  const high = /high=(\d+)/.exec(text);
  const changes = /changes=(\d+)/.exec(text);
  return {
    high: high ? Number(high[1]) : 0,
    changes: changes ? Number(changes[1]) : 0,
    fail: /CHECK FAIL/i.test(text),
  };
}

function writePriorityMd(reportDir, summary) {
  const lines = [
    `# L99 Inbox Intelligence — ${summary.date}`,
    '',
    'Silent only. **Never** Homey forum POST / PM / AI paste (T157628).',
    'Lock **manufacturerName + productId** only. Never invent pid. Dual-app: BOTH | MASTER_ONLY | STABLE_ONLY.',
    '',
    `Generated: **${summary.generatedAt}** · Mode: \`${summary.mode}\``,
    '',
    '## Snapshot',
    '',
    `| Channel | Count / note |`,
    `|---------|--------------|`,
    `| GitHub open issues | ${summary.github.openIssueCount} |`,
    `| GitHub open PRs | ${summary.github.openPrCount} |`,
    `| Forum needAction | ${summary.forum?.totals?.needAction ?? 'n/a'} |`,
    `| Gmail crash state | ${summary.gmail ? 'present' : 'absent'} |`,
    `| mfs high drift | ${summary.mfs?.high ?? 0} |`,
    '',
    '## Priority queue (intelligent)',
    '',
    '| Score | Dual | Source | ID | Action |',
    '|------:|------|--------|----|--------|',
  ];
  for (const it of summary.priority.slice(0, 40)) {
    lines.push(`| ${it.score} | ${it.dualApp} | ${it.source} | ${it.id} | ${(it.action || '').replace(/\|/g, '/')} |`);
  }
  lines.push('', '## Phase results', '');
  for (const p of summary.phases) {
    const st = p.skipped ? 'skip' : (p.ok ? 'ok' : 'warn');
    lines.push(`- **${p.name}**: ${st}${p.durationMs != null ? ` (${p.durationMs}ms)` : ''}${p.reason ? ` — ${p.reason}` : ''}`);
  }
  lines.push(
    '',
    '## Doctrine',
    '',
    '- Publish = Homey App Store Test (Auto-Publish). Do not post = no Community replies.',
    '- See `docs/architecture/L99_INBOX_INTELLIGENCE.md` + `docs/knowledge/DEVICE_TRUTH.md`.',
    '',
  );
  const fp = path.join(reportDir, 'PRIORITY.md');
  fs.writeFileSync(fp, `${lines.join('\n')}\n`);
  return fp;
}

function updateDocsPointer(cfg, summary) {
  const doc = path.join(ROOT, cfg.outputs.docsPointer);
  ensureDir(path.dirname(doc));
  const body = `# L99 Inbox Intelligence (P2352)

> Auto-maintained pointer. Last run: **${summary.generatedAt}** (\`${summary.mode}\`).

## Pourquoi / Comment / Pour qui / Quand / Contre quoi

| | |
|---|---|
| **Pourquoi** | One regular loop for Gmail + GitHub issues/PRs + Homey forum + driver/couple gates |
| **Comment** | \`npm run inbox:l99\` → \`tools/ci/l99-inbox-intelligence-orchestrator.js\` + GHA \`l99-inbox-intelligence.yml\` |
| **Pour qui** | CI + maintainers; users only via silent code / Homey Test publish |
| **Quand** | Cron every 4h (after forum-poll :45), \`workflow_dispatch\`, hooks from forum-poll / auto-enrich |
| **Contre quoi** | Forum AI paste, inventing productIds, blind \`align-mfs --apply\`, Stable overwrite of master Test |

## Shadow rules

- \`FORUM_AUTO_POST=0\` · \`SHADOW_FORUM=1\` · \`DISCOURSE_WRITE=0\`
- Never invent \`productId\`. Sacred couple = manufacturerName + productId.
- Cartesian multi-gang registry locks are refused (P2351).

## Latest snapshot

| Channel | Value |
|---------|-------|
| Open issues | ${summary.github.openIssueCount} |
| Open PRs | ${summary.github.openPrCount} |
| Forum needAction | ${summary.forum?.totals?.needAction ?? 'n/a'} |
| Top priority | ${summary.priority[0] ? `${summary.priority[0].id} (${summary.priority[0].score})` : 'none'} |
| Report | \`reports/l99-inbox-${summary.date}/PRIORITY.md\` |

## Related workflows

- \`l99-inbox-intelligence.yml\` (primary)
- \`forum-poll.yml\` (silent scan → calls inbox L99 soft)
- \`auto-enrich-closed-loop.yml\` / \`recurrent-orchestrator.yml\`

Config: \`config/enrichment/l99-inbox-intelligence.json\`
`;
  fs.writeFileSync(doc, body);
  return doc;
}

async function main() {
  const cfg = loadCfg();
  for (const [k, v] of Object.entries(cfg.shadowEnv || {})) {
    process.env[k] = String(v);
  }

  const mode = flag('quick') ? 'quick' : (arg('phase') === 'github' ? 'githubOnly' : 'full');
  const phaseList = cfg.phases[mode] || cfg.phases.full;
  const skipScan = flag('skip-scan') || mode === 'quick';
  const date = today();
  const reportDir = path.join(ROOT, cfg.outputs.reportDir.replace('{{date}}', date));
  const stateDir = path.join(ROOT, cfg.outputs.stateDir);
  ensureDir(reportDir);
  ensureDir(stateDir);

  const summary = {
    generatedAt: new Date().toISOString(),
    date,
    mode,
    phases: [],
    github: { openIssueCount: 0, openPrCount: 0, issues: [], prs: [] },
    forum: null,
    gmail: null,
    mfs: null,
    priority: [],
  };

  const shadowEnv = { ...process.env, ...cfg.shadowEnv };

  for (const name of phaseList) {
    const t0 = Date.now();
    if (name === 'guard') {
      summary.phases.push({ name, ok: true, durationMs: Date.now() - t0, note: 'SHADOW env forced' });
      continue;
    }

    if (name === 'github') {
      const gh = await harvestGithub(cfg);
      summary.github = gh;
      writeJson(path.join(reportDir, cfg.outputs.githubJson), gh);
      writeJson(path.join(stateDir, 'github-harvest.json'), gh);
      summary.phases.push({ name, ok: !gh.error, durationMs: Date.now() - t0, reason: gh.error || undefined });
      continue;
    }

    if (name === 'gmail') {
      const crash = runNode(cfg.scripts.gmailCrashes, [], shadowEnv, 120000);
      const treat = runNode(cfg.scripts.diagTreat, ['--from-diagnostics-report'], shadowEnv, 120000);
      summary.gmail = readGmailCrashState() || { gateOk: crash.ok, treatOk: treat.ok };
      summary.phases.push({
        name,
        ok: crash.ok || crash.skipped || treat.ok || treat.skipped,
        durationMs: Date.now() - t0,
        details: { crash, treat },
      });
      continue;
    }

    if (name === 'forum') {
      const steps = [];
      if (!skipScan) {
        steps.push(runNode(cfg.scripts.forumSilent, ['--max=40'], shadowEnv, 300000));
      }
      steps.push(runNode(cfg.scripts.forumProcess, ['--no-chain'], shadowEnv, 180000));
      steps.push(runNode(cfg.scripts.forumInvestigate, ['--dry-run'], shadowEnv, 180000));
      steps.push(runNode(cfg.scripts.forumAiPaste, ['--scan-defaults'], shadowEnv, 60000));
      summary.forum = readForumTotals();
      const ok = steps.every((s) => s.ok || s.skipped);
      summary.phases.push({ name, ok, durationMs: Date.now() - t0, skipScan, steps: steps.map((s) => ({ ok: s.ok, skipped: s.skipped })) });
      continue;
    }

    if (name === 'drivers') {
      const align = runNode(cfg.scripts.alignMfs, ['--check'], shadowEnv, 120000);
      const sacred = runNode(cfg.scripts.sacredCouple, [], shadowEnv, 120000);
      summary.mfs = parseMfsCheck(`${align.stdoutTail}\n${align.stderr}`);
      summary.phases.push({
        name,
        ok: (align.ok || !summary.mfs.fail) && (sacred.ok || sacred.skipped),
        durationMs: Date.now() - t0,
        mfs: summary.mfs,
        sacredOk: sacred.ok,
      });
      continue;
    }

    if (name === 'prioritize') {
      summary.priority = scoreItems({
        github: summary.github,
        forum: summary.forum,
        gmail: summary.gmail,
        mfs: summary.mfs,
        cfg,
      });
      writePriorityMd(reportDir, summary);
      summary.phases.push({ name, ok: true, durationMs: Date.now() - t0, count: summary.priority.length });
      continue;
    }

    if (name === 'docs') {
      const doc = updateDocsPointer(cfg, summary);
      summary.phases.push({ name, ok: true, durationMs: Date.now() - t0, doc });
      continue;
    }

    if (name === 'gates') {
      const dual = runNode(cfg.scripts.l99Dual, ['--track=auto'], shadowEnv, 120000);
      summary.phases.push({ name, ok: dual.ok || dual.skipped, durationMs: Date.now() - t0 });
      continue;
    }

    summary.phases.push({ name, ok: false, skipped: true, reason: 'unknown phase', durationMs: Date.now() - t0 });
  }

  writeJson(path.join(reportDir, cfg.outputs.summaryJson), summary);
  writeJson(path.join(stateDir, 'last-run.json'), summary);

  console.log('\n=== L99 Inbox Intelligence (P2352) ===');
  console.log(`mode=${mode} report=${reportDir}`);
  console.log(`issues=${summary.github.openIssueCount} prs=${summary.github.openPrCount} priority=${summary.priority.length}`);
  if (summary.priority[0]) {
    console.log(`top=${summary.priority[0].id} score=${summary.priority[0].score} → ${summary.priority[0].action}`);
  }
  const hardFail = summary.phases.some((p) => p.name === 'github' && p.ok === false && summary.github.openIssueCount === 0 && summary.github.error);
  process.exit(hardFail ? 1 : 0);
}

main().catch((e) => {
  console.error('[l99-inbox-intelligence]', e);
  process.exit(1);
});
