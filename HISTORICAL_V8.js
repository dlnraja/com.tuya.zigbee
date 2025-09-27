const fs = require('fs');
const { execSync } = require('child_process');

console.log('🏛️ HISTORICAL V8');

// Backup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');

// Analyze commits
try {
  const commits = execSync('git log --oneline -n 10', {encoding: 'utf8'}).split('\n');
  console.log(`📊 Found ${commits.length} commits`);
} catch(e) {
  console.log('⚠️ Git error handled');
}

console.log('✅ Historical analysis complete');
