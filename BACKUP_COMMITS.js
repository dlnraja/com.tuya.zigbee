const fs = require('fs');
const { execSync } = require('child_process');

console.log('💾 BACKUP COMMITS v6.0.0');

// Setup backup
const backupBase = './backup';
if (!fs.existsSync(backupBase)) fs.mkdirSync(backupBase);
fs.appendFileSync('./.gitignore', '\nbackup/\n');

// Get commits and backup
try {
  const commits = execSync('git log --format="%H %s" -n 1000', {encoding: 'utf8'})
    .split('\n').filter(c => c.trim());
  
  commits.forEach((commit, i) => {
    const [hash, ...msgParts] = commit.split(' ');
    const msg = msgParts.join(' ').substring(0, 50);
    const commitDir = `${backupBase}/master/${i}_${hash.substring(0, 8)}`;
    
    if (!fs.existsSync(commitDir)) {
      fs.mkdirSync(commitDir, {recursive: true});
      
      // Create commit info
      fs.writeFileSync(`${commitDir}/info.json`, JSON.stringify({
        hash, msg, index: i, timestamp: new Date().toISOString()
      }, null, 2));
      
      // Checkout commit
      execSync(`git checkout ${hash}`, {stdio: 'inherit'});
      
      // Copy files
      execSync(`git ls-files -z | xargs -0 cp --parents -t "${commitDir}"`, {stdio: 'inherit'});
    }
  });
  
  console.log(`✅ Backed up ${commits.length} commits to ${backupBase}`);
} catch (e) {
  console.log('⚠️ Git backup error:', e.message);
}

console.log('💾 BACKUP COMPLETE');
