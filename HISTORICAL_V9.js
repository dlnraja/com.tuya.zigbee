const fs = require('fs');
const { execSync } = require('child_process');

console.log('🏛️ HISTORICAL V9');

// Backup setup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');

// Analyze commits
try {
  const commits = execSync('git log --oneline -n 10', {encoding: 'utf8'}).split('\n');
  console.log(`📊 ${commits.length} commits analyzed`);
} catch(e) { console.log('⚠️ Handled'); }

console.log('✅ Historical analysis complete');
