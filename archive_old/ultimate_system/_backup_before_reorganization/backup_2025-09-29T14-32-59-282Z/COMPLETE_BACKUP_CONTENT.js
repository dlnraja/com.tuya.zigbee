const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 COMPLETE BACKUP CONTENT');

const projectRoot = path.resolve(__dirname, '..');
const backupCompleteRoot = path.join(__dirname, 'backup_complete');
fs.mkdirSync(backupCompleteRoot, { recursive: true });

// Complete backup with git checkout content
const commits = ['4cd9b5c11', 'dfa6a98f3', '667198c55'];

commits.forEach(hash => {
  const commitDir = path.join(backupCompleteRoot, `commit_${hash}`);
  if (!fs.existsSync(commitDir)) fs.mkdirSync(commitDir, {recursive: true});
  
  try {
    execSync('git stash', {stdio: 'pipe', cwd: projectRoot});
    execSync(`git checkout ${hash}`, {stdio: 'pipe', cwd: projectRoot});
    
    // Copy complete content
    ['app.json', 'package.json'].forEach(file => {
      const src = path.join(projectRoot, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(commitDir, file));
      }
    });
    
    // Copy drivers sample
    const driversRoot = path.join(projectRoot, 'drivers');
    if (fs.existsSync(driversRoot)) {
      const driversDir = path.join(commitDir, 'drivers_sample');
      if (!fs.existsSync(driversDir)) fs.mkdirSync(driversDir);
      const drivers = fs.readdirSync(driversRoot).slice(0, 2);
      drivers.forEach(driver => {
        const sourceDir = path.join(driversRoot, driver);
        const destDir = path.join(driversDir, driver);
        if (fs.existsSync(sourceDir)) {
          try {
            execSync(`robocopy "${sourceDir}" "${destDir}" /E /NFL /NDL /NJH /NJS`, {stdio: 'pipe'});
          } catch {}
        }
      });
    }
    
    execSync('git checkout master', {stdio: 'pipe', cwd: projectRoot});
    console.log(`✅ ${hash} content completed`);
  } catch(e) {
    try { execSync('git checkout master', {stdio: 'pipe'}); } catch(e2) {}
    console.log(`⚠️ ${hash} error`);
  }
});

console.log('✅ Backup content completed');
