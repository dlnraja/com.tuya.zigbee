const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 ANALYZE SHORT');

// Get ALL git history from project creation
const allCommits = execSync('git log --all --oneline', {encoding: 'utf8'});
const commitCount = allCommits.split('\n').filter(c => c.trim()).length;
console.log(`✅ Total commits: ${commitCount}`);

const branches = execSync('git branch -a', {encoding: 'utf8'});
const branchCount = branches.split('\n').filter(b => b.trim()).length;
console.log(`✅ Total branches: ${branchCount}`);

const drivers = fs.readdirSync('../drivers');
console.log(`✅ Drivers: ${drivers.length}`);

console.log('✅ Analysis complete');
