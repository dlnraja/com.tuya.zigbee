const fs = require('fs');
const { execSync } = require('child_process');

console.log('💾 BACKUP COMMITS v4.0.0');

// Create backup structure
const backupDir = './backup';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, {recursive: true});

// Update .gitignore
fs.appendFileSync('./.gitignore', '\nbackup/\n');

// Get commits and backup
try {
  const commits = execSync('git log --format="%H %s" -n 30', {encoding: 'utf8'})
    .split('\n').filter(c => c.trim());
  
  commits.forEach((commit, i) => {
    const [hash, ...msgParts] = commit.split(' ');
    const msg = msgParts.join(' ').substring(0, 50);
    const commitDir = `${backupDir}/master/${i}_${hash.substring(0, 8)}`;
    
    if (!fs.existsSync(commitDir)) {
      fs.mkdirSync(commitDir, {recursive: true});
      
      // Create commit info
      fs.writeFileSync(`${commitDir}/info.json`, JSON.stringify({
        hash, msg, index: i, timestamp: new Date().toISOString()
      }, null, 2));
    }
  });
  
  console.log(`✅ Backed up ${commits.length} commits to ${backupDir}`);
} catch (e) {
  console.log('⚠️ Git backup error:', e.message);
}

console.log('💾 BACKUP COMPLETE');
