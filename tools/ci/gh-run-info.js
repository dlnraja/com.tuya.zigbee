// Get run info via API
const { execSync } = require('child_process');
const runId = process.argv[2];
if (!runId) { console.error('usage: gh-run-info.js <runId>'); process.exit(1); }
try {
  const out = execSync(`gh run view ${runId} --json jobs,conclusion,name,headBranch,event,headSha,displayTitle,workflowDatabaseId`, { encoding: 'utf8' });
  const data = JSON.parse(out);
  console.log(`Run ${runId}: ${data.displayTitle}`);
  console.log(`  Workflow DB ID: ${data.workflowDatabaseId}`);
  console.log(`  Branch: ${data.headBranch}, Event: ${data.event}`);
  console.log(`  Conclusion: ${data.conclusion}`);
  console.log(`  Jobs (${(data.jobs||[]).length}):`);
  for (const j of data.jobs || []) {
    console.log(`    [${j.conclusion}] ${j.name} (dbId=${j.databaseId})`);
  }
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
