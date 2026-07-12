// check-targets.js
const fs = require('fs');
const files = [
  '.github/workflows/monthly-community-sync.yml',
  '.github/workflows/auto-reopen-on-comment.yml',
  '.github/workflows/auto-fix-and-publish.yml',
  '.github/workflows/auto-close-supported.yml',
  '.github/workflows/auto-publish-on-push.yml',
  '.github/workflows/publish.yml',
  '.github/workflows/publish-stable.yml',
];
for (const f of files) {
  console.log('---', f, '---');
  const c = fs.readFileSync(f, 'utf8');
  const johan = c.includes('JohanBendz');
  const lines = c.split('\n');
  const targetLines = lines.filter(l => /target_repo|TARGET_REPO|REPOS|repository|repo:|repos:|dlnraja|with:/i.test(l));
  console.log('  Johan:', johan ? 'YES ⚠️' : 'no');
  for (const l of targetLines.slice(0, 5)) console.log('   ', l.trim().substring(0, 120));
}
