const { execSync } = require('child_process');
const fs = require('fs');

const commits = [
  'c22e6a0d5',
  'e9716e2d3'
];

console.log('=== SHOWING DETAILS OF ANTONHAGG COMMITS ===\n');

for (const c of commits) {
  try {
    const show = execSync(`git show --oneline --stat ${c}`, { encoding: 'utf8' }).trim();
    console.log(show);
    console.log('================================================\n');
  } catch (e) {
    console.log(`Commit ${c} - Error: ${e.message}`);
  }
}
