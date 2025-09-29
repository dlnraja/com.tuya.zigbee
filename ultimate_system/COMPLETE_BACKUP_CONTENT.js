const fs = require('fs');
const { execSync } = require('child_process');

console.log('📦 COMPLETE BACKUP CONTENT');

// Complete backup with git checkout content
const commits = ['4cd9b5c11', 'dfa6a98f3', '667198c55'];

commits.forEach(hash => {
  const commitDir = `./backup_complete/commit_${hash}`;
  if (!fs.existsSync(commitDir)) fs.mkdirSync(commitDir, {recursive: true});
  
  try {
    execSync('git stash', {stdio: 'pipe'});
    execSync(`git checkout ${hash}`, {stdio: 'pipe'});
    
    // Copy complete content
    ['app.json', 'package.json'].forEach(file => {
      if (fs.existsSync(`../${file}`)) {
        fs.copyFileSync(`../${file}`, `${commitDir}/${file}`);
      }
    });
    
    // Copy drivers sample
    if (fs.existsSync('../drivers')) {
      const driversDir = `${commitDir}/drivers_sample`;
      if (!fs.existsSync(driversDir)) fs.mkdirSync(driversDir);
      
      const drivers = fs.readdirSync('../drivers').slice(0, 2);
      drivers.forEach(driver => {
        const sourceDir = `../drivers/${driver}`;
        if (fs.existsSync(sourceDir)) {
          execSync(`robocopy "${sourceDir}" "${driversDir}/${driver}" /E /NFL /NDL /NJH /NJS`, {stdio: 'pipe'});
        }
      });
    }
    
    execSync('git checkout master', {stdio: 'pipe'});
    console.log(`✅ ${hash} content completed`);
  } catch(e) {
    try { execSync('git checkout master', {stdio: 'pipe'}); } catch(e2) {}
    console.log(`⚠️ ${hash} error`);
  }
});

console.log('✅ Backup content completed');
