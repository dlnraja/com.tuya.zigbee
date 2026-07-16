// List runs via API to avoid gh wrapper issues
const { execSync } = require('child_process');
const workflow = process.argv[2] || 'continuous-flow.yml';
const limit = parseInt(process.argv[3] || '10', 10);
try {
  const out = execSync(`gh run list --workflow ${workflow} --limit ${limit} --json databaseId,status,conclusion,createdAt,headBranch,event,headSha`, { encoding: 'utf8' });
  const data = JSON.parse(out);
  data.forEach(r => console.log(`${r.databaseId} | ${r.createdAt} | ${r.headBranch} | ${r.event} | ${r.status}/${r.conclusion} | sha=${r.headSha.slice(0,7)}`));
} catch (e) { console.error('Error:', e.message); process.exit(1); }
