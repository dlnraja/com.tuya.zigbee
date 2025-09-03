const fs = require('fs');
const { execSync } = require('child_process');

function analyzeCommitMessages(since = '30 days') {
  const command = `git log --since="${since}" --oneline --grep="driver\\|fix\\|feat\\|enhance\\|device"`;
  const output = execSync(command, { encoding: 'utf-8' });
  const commits = output.split('\n').filter(line => line.trim() !== '');
  
  const patterns = {
    newDevices: 0,
    bugFixes: 0,
    localization: 0,
    refactoring: 0,
    documentation: 0
  };
  
  commits.forEach(commit => {
    if (commit.includes('Add') || commit.includes('Support')) patterns.newDevices++;
    if (commit.includes('Fix') || commit.includes('Bug')) patterns.bugFixes++;
    if (commit.includes('localization') || commit.includes('translation')) patterns.localization++;
    if (commit.includes('Refactor') || commit.includes('Improve')) patterns.refactoring++;
    if (commit.includes('doc') || commit.includes('readme')) patterns.documentation++;
  });
  
  return patterns;
}

const patterns = analyzeCommitMessages();
fs.writeFileSync('analysis/commit_analysis.json', JSON.stringify(patterns, null, 2));
console.log('✅ Commit patterns analyzed and saved to analysis/commit_analysis.json');
