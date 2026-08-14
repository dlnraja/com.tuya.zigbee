'use strict';
/**
 * weekly-sovereign-loop.js — P136
 *
 * Quota-safe weekly autopilot backbone (GitHub Actions minutes, not Cursor).
 * - Collects CI / publish / Homey Test health
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
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const REPORT_DIR = path.join(ROOT, 'reports');
const REPORT_MD = path.join(REPORT_DIR, 'WEEKLY_SOVEREIGN_LOOP.md');
const REPORT_JSON = path.join(ROOT, '.github', 'state', 'weekly-sovereign-loop.json');

const args = process.argv.slice(2);
const DO_DISPATCH = args.includes('--dispatch');
const AS_JSON = args.includes('--json');

function sh(cmd, opts = {}) {
  try {
    return execFileSync('bash', ['-lc', cmd], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: opts.timeout || 120000,
      env: { ...process.env },
    }).trim();
  } catch (e) {
    return String(e.stdout || e.message || e);
  }
}

function gh(argsList) {
  const r = spawnSync('gh', argsList, { cwd: ROOT, encoding: 'utf8', env: process.env });
  if (r.status !== 0) {
    return { ok: false, out: (r.stdout || '') + (r.stderr || '') };
  }
  return { ok: true, out: (r.stdout || '').trim() };
}

function nodeGate(script, extra = []) {
  const r = spawnSync(process.execPath, [script, ...extra], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
    env: process.env,
  });
  return {
    ok: r.status === 0,
    code: r.status,
    out: ((r.stdout || '') + (r.stderr || '')).trim().slice(-2000),
  };
}

function packageVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  } catch {
    return 'unknown';
  }
}

function checkHomeyTestPage() {
  // Public Test channel page — no Homey PAT required
  const url = 'https://homey.app/a/com.dlnraja.tuya.zigbee/test/';
  const r = spawnSync(
    'curl',
    ['-sS', '-L', '-A', 'Mozilla/5.0 WeeklySovereignLoop', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '30', url],
    { encoding: 'utf8' },
  );
  const code = String(r.stdout || '').trim();
  return { url, httpCode: code, ok: code === '200' || code === '301' || code === '302' };
}

function recentRuns(limit = 8) {
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

function dispatchWorkflow(name) {
  const r = gh(['workflow', 'run', name, '--ref', 'master']);
  return { name, ok: r.ok, out: r.out.slice(0, 300) };
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
    branch: sh('git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown'),
    gates: {},
    dispatches: [],
    runs: [],
    issues: [],
    homeyTest: null,
    recommendations: [],
  };

  // Cheap local gates (no network AI)
  report.gates.antiBot = nodeGate('tools/ci/anti-bot-regression-gate.js');
  report.gates.bareZigbee = nodeGate('tools/ci/bare-zigbee-device-gate.js');
  report.gates.doubleDivision = nodeGate('tools/ci/adaptive-double-division-gate.js', ['--hard']);
  report.gates.voice = nodeGate('scripts/validation/check-google-assistant-voice-safety.js');

  report.homeyTest = checkHomeyTestPage();
  report.runs = recentRuns(12);
  report.issues = openIssues();

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
  md.push('## Recent workflow runs');
  for (const r of report.runs.slice(0, 8)) {
    md.push(`- [${r.conclusion || r.status}] ${r.name} (\`${r.headBranch}\`) — ${r.url}`);
  }
  md.push('');
  md.push('## Open issues');
  if (!report.issues.length) md.push('- none');
  for (const i of report.issues.slice(0, 15)) {
    md.push(`- #${i.number} ${i.title}`);
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
    console.log(`[weekly-sovereign-loop] gates=${Object.values(report.gates).filter((g) => g.ok).length}/${Object.keys(report.gates).length} homeyTest=${report.homeyTest.httpCode} issues=${report.issues.length} dispatches=${report.dispatches.length}`);
  }

  const hardFail = gateFail.length > 0 || !report.homeyTest.ok;
  process.exit(hardFail ? 1 : 0);
}

main();
