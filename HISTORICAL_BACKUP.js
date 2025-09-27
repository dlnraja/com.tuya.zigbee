const fs = require('fs');
const { execSync } = require('child_process');

console.log('💾 HISTORICAL BACKUP v6.0.0');

// Setup backup structure
const backupBase = './backup';
if (!fs.existsSync(backupBase)) fs.mkdirSync(backupBase);
fs.appendFileSync('./.gitignore', '\nbackup/\n');
fs.appendFileSync('./.homeyignore', '\nbackup/\n');

try {
  // Get all branches
  const branches = execSync('git branch -r', {encoding: 'utf8'})
    .split('\n')
    .map(b => b.trim())
    .filter(b => b && !b.includes('HEAD'));

  console.log(`📊 Found ${branches.length} branches`);

  // Get commits for master
  const commits = execSync('git log --format="%H|%s" -n 10', {encoding: 'utf8'})
    .split('\n')
    .filter(c => c.trim())
    .map(c => {
      const [hash, msg] = c.split('|');
      return { hash: hash.trim(), message: msg };
    });

  console.log(`📊 Found ${commits.length} commits to backup`);

  // Create backup structure
  commits.forEach((commit, index) => {
    const backupDir = `${backupBase}/master/${index}_${commit.hash.substring(0, 8)}`;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      
      // Save commit info
      fs.writeFileSync(`${backupDir}/commit_info.json`, JSON.stringify({
        hash: commit.hash,
        message: commit.message,
        index: index
      }, null, 2));
    }
  });

  console.log(`✅ Created backup structure for ${commits.length} commits`);

} catch (error) {
  console.log(`⚠️ Backup error: ${error.message}`);
}
