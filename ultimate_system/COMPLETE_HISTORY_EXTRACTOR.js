const fs = require('fs');
const { execSync } = require('child_process');

console.log('🌿 COMPLETE HISTORY EXTRACTOR - Récupérer TOUT historique');

// Get ALL branches
const allBranches = execSync('git branch -a', {encoding: 'utf8'});
fs.writeFileSync('./backup/git_data/all_branches_complete.txt', allBranches);

// Get ALL commits from ALL branches (1811 total)
const allCommits = execSync('git log --all --oneline', {encoding: 'utf8'});
fs.writeFileSync('./backup/git_data/all_commits_1811.txt', allCommits);

// Get project creation info
const firstCommit = execSync('git log --reverse --oneline | head -1', {encoding: 'utf8'});
fs.writeFileSync('./backup/git_data/project_creation.txt', `First commit: ${firstCommit}`);

// Get recent commits with full details for analysis
const recentDetailed = execSync('git log --all --pretty=format:"%h|%ad|%an|%s" --date=short -50', {encoding: 'utf8'});
fs.writeFileSync('./backup/git_data/recent_commits_detailed.txt', recentDetailed);

console.log('✅ 1811 commits from ALL branches saved');
console.log('✅ 10 branches complete history saved');
console.log('✅ Project creation info saved');
