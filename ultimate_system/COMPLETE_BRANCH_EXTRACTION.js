const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌿 COMPLETE BRANCH EXTRACTION');

const projectRoot = path.resolve(__dirname, '..');
const backupRoot = path.join(__dirname, 'backup');
fs.mkdirSync(backupRoot, { recursive: true });

// Get branches and organize by commit content
const branches = ['master', 'tuya-light', 'chatgptversion'];

branches.forEach(branch => {
  console.log(`📊 Processing branch: ${branch}`);
  
  try {
    const commits = execSync(`git log ${branch} --oneline -2`, {encoding: 'utf8', cwd: projectRoot}).split('\n');
    
    commits.forEach(line => {
      if (line.trim()) {
        const hash = line.split(' ')[0];
        const branchDir = path.join(backupRoot, `branch_${branch.replace(/[^a-zA-Z0-9]/g, '_')}`);
        const commitDir = path.join(branchDir, `commit_${hash}`);
        
        if (!fs.existsSync(commitDir)) {
          fs.mkdirSync(commitDir, {recursive: true});
          
          try {
            execSync('git stash', {stdio: 'pipe', cwd: projectRoot});
            execSync(`git checkout ${hash}`, {stdio: 'pipe', cwd: projectRoot});
            
            // Copy essential files
            ['app.json', 'package.json'].forEach(file => {
              const src = path.join(projectRoot, file);
              if (fs.existsSync(src)) {
                fs.copyFileSync(src, path.join(commitDir, file));
              }
            });
            
            execSync('git checkout master', {stdio: 'pipe', cwd: projectRoot});
            console.log(`✅ ${branch}/${hash} extracted`);
            
          } catch(e) {
            try { execSync('git checkout master', {stdio: 'pipe', cwd: projectRoot}); } catch(e2) {}
          }
        }
      }
    });
  } catch(e) {
    console.log(`⚠️ Branch ${branch} error`);
  }
});

console.log('✅ Complete branch extraction done');
