const fs = require('fs');
const { execSync } = require('child_process');

console.log('📦 POPULATE BACKUP');

// Save git data
const branches = execSync('git branch -a', {encoding: 'utf8'});
fs.writeFileSync('./backup/git_data/branches.txt', branches);

const commits = execSync('git log --oneline -10', {encoding: 'utf8'});
fs.writeFileSync('./backup/git_data/commits.txt', commits);

console.log('✅ Git data saved');

console.log('✅ Backup populated');
