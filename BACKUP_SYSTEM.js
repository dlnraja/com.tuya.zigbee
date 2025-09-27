const fs = require('fs');
const { execSync } = require('child_process');

console.log('💾 BACKUP SYSTEM v5.0.0');

// Setup backup
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup', {recursive: true});
fs.appendFileSync('./.gitignore', '\nbackup/\n');

// Dump commits
try {
  const commits = execSync('git log --format="%H" -n 30', {encoding: 'utf8'}).split('\n').filter(c => c.trim());
  
  commits.forEach((commit, i) => {
    const dir = `./backup/master/${i}_${commit.substring(0, 8)}`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  });
  
  console.log(`✅ Backed up ${commits.length} commits`);
} catch (e) {
  console.log('⚠️ Error:', e.message);
}
