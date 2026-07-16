// Get jobs + their conclusions for a given run
const { execSync } = require('child_process');

const runId = process.argv[2];
if (!runId) { console.error('usage: node get-job-failures.js <runId>'); process.exit(1); }

try {
  const out = execSync(`gh run view ${runId} --json jobs,conclusion,name,headBranch,event,headSha`, { encoding: 'utf8', maxBuffer: 10*1024*1024 });
  const data = JSON.parse(out);
  console.log(`Run ${runId}: ${data.name} (${data.headBranch}) ${data.event}`);
  console.log(`  Conclusion: ${data.conclusion}`);
  console.log(`  Jobs (${(data.jobs||[]).length}):`);
  for (const j of data.jobs || []) {
    if (j.conclusion === 'failure' || j.conclusion === 'cancelled' || j.conclusion === 'timed_out') {
      console.log(`    [${j.conclusion}] ${j.name} (dbId=${j.databaseId})`);
    }
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
