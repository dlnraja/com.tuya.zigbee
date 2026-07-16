// Triage all failed GHA runs in last 7 days
// Usage: node tools/ci/triage-failed-runs.js [days=2]
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const days = parseInt(process.argv[2] || '2', 10);
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

console.log(`[triage] Fetching runs since ${since}`);

// Get all runs (paginated if needed)
let allRuns = [];
let page = 1;
while (page <= 5) {
  const cmd = `gh run list --limit 200 --json databaseId,status,conclusion,name,createdAt,headBranch,event,workflowName,headSha,url`;
  const raw = execSync(cmd, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
  let runs;
  try { runs = JSON.parse(raw); } catch (e) { console.error('JSON parse fail at page', page, 'len', raw.length); break; }
  if (runs.length === 0) break;
  allRuns = allRuns.concat(runs);
  if (runs[runs.length - 1].createdAt < since) break;
  page++;
}

console.log(`[triage] Total runs fetched: ${allRuns.length}`);

const since2 = new Date(since).getTime();
const failed = allRuns.filter(r => {
  const t = new Date(r.createdAt).getTime();
  return t >= since2 && (r.conclusion === 'failure' || r.conclusion === 'timed_out' || r.conclusion === 'startup_failure');
});
const cancelled = allRuns.filter(r => {
  const t = new Date(r.createdAt).getTime();
  return t >= since2 && r.conclusion === 'cancelled';
});

console.log(`[triage] Failed: ${failed.length}, Cancelled: ${cancelled.length}`);

// Dedupe by workflow
const byWorkflow = {};
for (const r of [...failed, ...cancelled]) {
  const k = `${r.workflowName}|${r.headBranch}`;
  if (!byWorkflow[k]) byWorkflow[k] = [];
  byWorkflow[k].push(r);
}

// Output
console.log('\n=== FAILED RUNS BY WORKFLOW ===\n');
const sorted = Object.entries(byWorkflow).sort((a, b) => b[1].length - a[1].length);
for (const [k, runs] of sorted) {
  const [name, branch] = k.split('|');
  const fails = runs.filter(r => r.conclusion !== 'cancelled').length;
  console.log(`${name} (${branch}): ${runs.length} runs, ${fails} failures`);
  for (const r of runs.slice(0, 3)) {
    console.log(`  - ${r.databaseId} ${r.createdAt} ${r.conclusion} ${r.headSha.slice(0,7)}`);
  }
}

const outPath = path.join(__dirname, '..', '..', '.github', 'state', 'triage-failed-runs.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ failed, cancelled, byWorkflow: Object.fromEntries(sorted) }, null, 2));
console.log(`\n[triage] Wrote ${outPath}`);
