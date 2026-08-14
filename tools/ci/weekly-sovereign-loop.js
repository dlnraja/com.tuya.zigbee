'use strict';
/**
 * weekly-sovereign-loop.js — P136 / P136b
 *
 * Quota-safe weekly autopilot backbone (GitHub Actions minutes, not Cursor).
 * - Collects CI / publish / Homey Test / PR / issue health
 * - Dispatches existing source workflows (no new crawlers)
 * - Writes a single report for the weekly Cursor Automation to consume
 *
 * Usage:
 *   node tools/ci/weekly-sovereign-loop.js
 *   node tools/ci/weekly-sovereign-loop.js --dispatch
 *   node tools/ci/weekly-sovereign-loop.js --json
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const REPORT_DIR = path.join(ROOT, 'reports');
const REPORT_MD = path.join(REPORT_DIR, 'WEEKLY_SOVEREIGN_LOOP.md');
const REPORT_JSON = path.join(ROOT, '.github', 'state', 'weekly-sovereign-loop.json');

const args = process.argv.slice(2);
const DO_DISPATCH = args.includes('--dispatch');
const AS_JSON = args.includes('--json');

const HOMEY_TEST_URL = 'https://homey.app/a/com.dlnraja.tuya.zigbee/test/';

function spawn(cmd, argsList, opts = {}) {
  const r = spawnSync(cmd, argsList, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: opts.timeout || 120000,
    env: { ...process.env, ...(opts.env || {}) },
    shell: opts.shell || false,
  });
  return {
    ok: r.status === 0,
    status: r.status,
    out: ((r.stdout || '') + (r.stderr || '')).trim(),
  };
}

function git(argsList) {
  return spawn('git', argsList, { timeout: 60000 });
}

function gh(argsList) {
  return spawn('gh', argsList, { timeout: 120000 });
}

function nodeGate(script, extra = []) {
  const r = spawn(process.execPath, [script, ...extra], { timeout: 180000 });
  return {
    ok: r.ok,
    code: r.status == null ? 1 : r.status,
    out: r.out.slice(-2000),
  };
}

function packageVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  } catch {
    return 'unknown';
  }
}

function currentBranch() {
  const r = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  return r.ok ? r.out : 'unknown';
}

function checkHomeyTestPage() {
  // Public Test channel page — no Homey PAT required
  let r = spawn('curl', [
    '-sS', '-L', '-A', 'Mozilla/5.0 WeeklySovereignLoop',
    '-o', '/dev/null', '-w', '%{http_code}',
    '--max-time', '30', HOMEY_TEST_URL,
  ]);
  if (!r.ok && process.platform === 'win32') {
    // PowerShell fallback when curl.exe missing / weird
    r = spawn(
      'powershell',
      [
        '-NoProfile', '-Command',
        `try { $r = Invoke-WebRequest -Uri '${HOMEY_TEST_URL}' -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 30; Write-Output ([int]$r.StatusCode) } catch { if ($_.Exception.Response) { Write-Output ([int]$_.Exception.Response.StatusCode) } else { Write-Output 000 } }`,
      ],
      { timeout: 45000 },
    );
  }
  const code = String(r.out || '').trim().split(/\r?\n/).pop() || '000';
  return { url: HOMEY_TEST_URL, httpCode: code, ok: code === '200' || code === '301' || code === '302' };
}

function recentRuns(limit = 12) {
  const r = gh([
    'run', 'list',
    '--limit', String(limit),
    '--json', 'databaseId,name,status,conclusion,headBranch,createdAt,url,event',
  ]);
  if (!r.ok) return [];
  try {
    return JSON.parse(r.out);
  } catch {
    return [];
  }
}

function openIssues() {
  const r = gh(['issue', 'list', '--state', 'open', '--limit', '20', '--json', 'number,title,labels,updatedAt']);
  if (!r.ok) return [];
  try {
    return JSON.parse(r.out);
  } catch {
    return [];
  }
}

function openPrs() {
  const r = gh(['pr', 'list', '--state', 'open', '--limit', '15', '--json', 'number,title,updatedAt,isDraft,url']);
  if (!r.ok) return [];
  try {
    return JSON.parse(r.out);
  } catch {
    return [];
  }
}

function workflowExists(name) {
  const r = gh(['workflow', 'view', name, '--json', 'name,state']);
  return r.ok;
}

function dispatchWorkflow(name) {
  if (!workflowExists(name)) {
    return { name, ok: false, out: 'workflow not found' };
  }
  const r = gh(['workflow', 'run', name, '--ref', 'master']);
  return { name, ok: r.ok, out: r.out.slice(0, 300) };
}

function classifyPublishRuns(runs) {
  const re = /publish|draft.?to.?test|self-heal|auto-fix|validate|homey/i;
  return runs.filter((r) => re.test(String(r.name || '')));
}

function main() {
  fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const report = {
    generated: new Date().toISOString(),
    purpose: 'weekly-sovereign-loop',
    quotaPolicy: {
      cursor: 'weekly thin brain only — no mega crawls in Cursor',
      githubActions: 'heavy dumps/gates/publish-diag here',
      forum: 'silent enrich only; REPLY_TOPICS=140352 dry-run never auto-post',
      dualApp: 'master=features/test; stable-v5=reliability backports only',
    },
    version: packageVersion(),
    branch: currentBranch(),
    gates: {},
    dispatches: [],
    runs: [],
    publishRuns: [],
    issues: [],
    prs: [],
    homeyTest: null,
    recommendations: [],
  };

  // Cheap local gates (no network AI)
  report.gates.antiBot = nodeGate('tools/ci/anti-bot-regression-gate.js');
  report.gates.bareZigbee = nodeGate('tools/ci/bare-zigbee-device-gate.js');
  report.gates.doubleDivision = nodeGate('tools/ci/adaptive-double-division-gate.js', ['--hard']);
  report.gates.voice = nodeGate('scripts/validation/check-google-assistant-voice-safety.js');

  report.homeyTest = checkHomeyTestPage();
  report.runs = recentRuns(15);
  report.publishRuns = classifyPublishRuns(report.runs);
  report.issues = openIssues();
  report.prs = openPrs();

  if (DO_DISPATCH) {
    // Existing workflows only — staggered names, no new crawlers
    const workflows = [
      'mega-crawl.yml',
      'gmail-diagnostics.yml',
      'forum-poll.yml',
      'auto-bot-issue-triage.yml',
      'publish-diagnose.yml',
      'safe-sync-stable.yml',
      'self-improve.yml',
    ];
    for (const w of workflows) {
      report.dispatches.push(dispatchWorkflow(w));
    }
  }

  // Recommendations for the Cursor weekly brain (bounded)
  const failedRuns = report.runs.filter((r) => r.conclusion === 'failure');
  if (failedRuns.length) {
    report.recommendations.push({
      priority: 'P0',
      action: 'Inspect failed CI/publish runs and apply reliability-only fixes on master; backport crash fixes to stable-v5 only after soak.',
      refs: failedRuns.slice(0, 5).map((r) => r.url),
    });
  }
  if (!report.homeyTest.ok) {
    report.recommendations.push({
      priority: 'P0',
      action: 'Homey Test page not reachable — verify Auto-Publish / Draft-to-Test and Athom build status.',
      refs: [report.homeyTest.url],
    });
  }
  const humanIssues = report.issues.filter((i) => {
    const names = (i.labels || []).map((l) => l.name || l);
    return !names.some((n) => /auto|bot|\[Auto\]/i.test(String(n)));
  });
  if (humanIssues.length) {
    report.recommendations.push({
      priority: 'P1',
      action: 'Human issues remain open — verify FP/runtime fixes silently; do not mass-close needs-maintainer.',
      refs: humanIssues.slice(0, 10).map((i) => `#${i.number} ${i.title}`),
    });
  }
  const gateFail = Object.entries(report.gates).filter(([, g]) => !g.ok);
  if (gateFail.length) {
    report.recommendations.push({
      priority: 'P0',
      action: `Local gates failing: ${gateFail.map(([k]) => k).join(', ')} — fix before any publish.`,
    });
  }
  const failedDispatch = report.dispatches.filter((d) => !d.ok);
  if (failedDispatch.length) {
    report.recommendations.push({
      priority: 'P1',
      action: `Some workflow dispatches failed (check GH_PAT / workflow names): ${failedDispatch.map((d) => d.name).join(', ')}`,
    });
  }
  const draftPrs = report.prs.filter((p) => p.isDraft);
  if (report.prs.length && report.prs.length === draftPrs.length) {
    report.recommendations.push({
      priority: 'P2',
      action: 'Only draft PRs open — ignore unless reliability-related.',
      refs: draftPrs.slice(0, 5).map((p) => p.url || `#${p.number}`),
    });
  } else if (report.prs.filter((p) => !p.isDraft).length) {
    report.recommendations.push({
      priority: 'P1',
      action: 'Open non-draft PRs — review for reliability merges on master only.',
      refs: report.prs.filter((p) => !p.isDraft).slice(0, 5).map((p) => p.url || `#${p.number}`),
    });
  }
  if (!report.recommendations.length) {
    report.recommendations.push({
      priority: 'P2',
      action: 'Green week — optional sacred-couple dry-run + dashboard refresh only. No speculative refactors.',
    });
  }

  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const md = [];
  md.push('# Weekly Sovereign Loop');
  md.push('');
  md.push(`Generated: ${report.generated}`);
  md.push(`Version: **${report.version}** · Branch: \`${report.branch}\``);
  md.push('');
  md.push('## Quota policy');
  md.push('- Cursor Automation = thin weekly brain (read report → bounded reliability fixes)');
  md.push('- GitHub Actions = dumps / gates / publish diag / Homey Test probe');
  md.push('- Forum = silent enrich only (no auto-post)');
  md.push('- master = Test/features · stable-v5 = reliability backports only');
  md.push('');
  md.push('## Gates');
  for (const [k, g] of Object.entries(report.gates)) {
    md.push(`- ${g.ok ? '✅' : '❌'} **${k}** (exit ${g.code})`);
  }
  md.push('');
  md.push('## Homey Test channel');
  md.push(`- URL: ${report.homeyTest.url}`);
  md.push(`- HTTP: **${report.homeyTest.httpCode}** ${report.homeyTest.ok ? 'OK' : 'FAIL'}`);
  md.push('');
  if (report.dispatches.length) {
    md.push('## Dispatches');
    for (const d of report.dispatches) {
      md.push(`- ${d.ok ? '✅' : '❌'} \`${d.name}\`${d.ok ? '' : ` — ${d.out.slice(0, 120)}`}`);
    }
    md.push('');
  }
  md.push('## Recent workflow runs');
  for (const r of report.runs.slice(0, 10)) {
    md.push(`- [${r.conclusion || r.status}] ${r.name} (\`${r.headBranch}\`) — ${r.url}`);
  }
  md.push('');
  if (report.publishRuns.length) {
    md.push('## Publish / validate related');
    for (const r of report.publishRuns.slice(0, 8)) {
      md.push(`- [${r.conclusion || r.status}] ${r.name} — ${r.url}`);
    }
    md.push('');
  }
  md.push('## Open issues');
  if (!report.issues.length) md.push('- none');
  for (const i of report.issues.slice(0, 15)) {
    md.push(`- #${i.number} ${i.title}`);
  }
  md.push('');
  md.push('## Open PRs');
  if (!report.prs.length) md.push('- none');
  for (const p of report.prs.slice(0, 10)) {
    md.push(`- #${p.number}${p.isDraft ? ' (draft)' : ''} ${p.title} — ${p.url || ''}`);
  }
  md.push('');
  md.push('## Cursor brain — do this week (max)');
  for (const rec of report.recommendations) {
    md.push(`- **${rec.priority}**: ${rec.action}`);
    if (rec.refs?.length) md.push(`  - ${rec.refs.join(' · ')}`);
  }
  md.push('');
  md.push('## Hard stops');
  md.push('- Do NOT paste unchecked AI to Homey forum');
  md.push('- Do NOT dump ambiguous FPs into generic_tuya');
  md.push('- Do NOT push feature managers to stable-v5');
  md.push('- Do NOT run mega crawls inside Cursor (dispatch GHA instead)');
  md.push('- Stop after ≤3 reliability commits or 1 PR');

  fs.writeFileSync(REPORT_MD, `${md.join('\n')}\n`);

  if (AS_JSON) {
    process.stdout.write(JSON.stringify(report, null, 2));
  } else {
    console.log(`[weekly-sovereign-loop] wrote ${path.relative(ROOT, REPORT_MD)}`);
    console.log(`[weekly-sovereign-loop] gates=${Object.values(report.gates).filter((g) => g.ok).length}/${Object.keys(report.gates).length} homeyTest=${report.homeyTest.httpCode} issues=${report.issues.length} prs=${report.prs.length} dispatches=${report.dispatches.length}`);
  }

  const hardFail = gateFail.length > 0 || !report.homeyTest.ok;
  process.exit(hardFail ? 1 : 0);
}

main();
