const fs = require('fs');
const { execSync } = require('child_process');

console.log('🌿 GIT BRANCHES');

const branches = execSync('git branch -a', {encoding: 'utf8'});
fs.writeFileSync('./backup/branches.txt', branches);

const commits = execSync('git log --oneline -10', {encoding: 'utf8'});
fs.writeFileSync('./backup/commits.txt', commits);

console.log('✅ Git data saved');
