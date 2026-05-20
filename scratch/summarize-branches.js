const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/branches_analysis.json', 'utf8'));

console.log('=== BRANCHES WITH CHANGES RELATIVE TO MASTER ===\n');
for (const entry of data) {
  if (entry.hasChanges) {
    console.log(`Branch: ${entry.branch}`);
    console.log(`  Number of commits: ${entry.commits.length}`);
    console.log(`  Latest commit: ${entry.commits[0]}`);
    console.log(`  Modified files (first 10):`);
    const files = entry.files.filter(f => !f.startsWith('D\t')); // exclude deletions
    files.slice(0, 10).forEach(f => console.log(`    ${f}`));
    if (files.length > 10) {
      console.log(`    ... and ${files.length - 10} more files`);
    }
    console.log('------------------------------------------------');
  } else {
    console.log(`Branch: ${entry.branch} -> Up to date with master (No changes)`);
  }
}
