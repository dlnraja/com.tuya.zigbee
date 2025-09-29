const fs = require('fs');
const { execSync } = require('child_process');

console.log('🌿 EXTRACT HISTORY WIN - Historique complet Windows');

// Get ALL branches
const branches = execSync('git branch -a', {encoding: 'utf8'});
fs.writeFileSync('./backup/git_data/branches.txt', branches);

// Get ALL 1811 commits
const allCommits = execSync('git log --all --oneline', {encoding: 'utf8'});
fs.writeFileSync('./backup/git_data/all_commits.txt', allCommits);

// Get first commit (creation) 
const reverseCommits = execSync('git log --reverse --oneline', {encoding: 'utf8'});
const firstCommit = reverseCommits.split('\n')[0];
fs.writeFileSync('./backup/git_data/first_commit.txt', `Project created: ${firstCommit}`);

// Get detailed recent commits for enrichment
const detailedCommits = execSync('git log --all --pretty=format:"%h - %ad - %s" --date=short -30', {encoding: 'utf8'});
fs.writeFileSync('./backup/git_data/recent_detailed.txt', detailedCommits);

console.log(`✅ ALL ${allCommits.split('\n').length} commits saved`);
console.log(`✅ ${branches.split('\n').filter(b => b.trim()).length} branches saved`);
console.log(`✅ Project creation: ${firstCommit}`);
console.log('✅ Complete history extracted');
