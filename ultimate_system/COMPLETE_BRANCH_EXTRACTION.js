const fs = require('fs');
const { execSync } = require('child_process');

console.log('🌿 COMPLETE BRANCH EXTRACTION');

// Get branches and organize by commit content
const branches = ['master', 'tuya-light', 'chatgptversion'];

branches.forEach(branch => {
  console.log(`📊 Processing branch: ${branch}`);
  
  try {
    const commits = execSync(`git log ${branch} --oneline -2`, {encoding: 'utf8'}).split('\n');
    
    commits.forEach(line => {
      if (line.trim()) {
        const hash = line.split(' ')[0];
        const branchDir = `./backup/branch_${branch.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const commitDir = `${branchDir}/commit_${hash}`;
        
        if (!fs.existsSync(commitDir)) {
          fs.mkdirSync(commitDir, {recursive: true});
          
          try {
            execSync('git stash', {stdio: 'pipe'});
            execSync(`git checkout ${hash}`, {stdio: 'pipe'});
            
            // Copy essential files
            ['app.json', 'package.json'].forEach(file => {
              if (fs.existsSync(file)) {
                fs.copyFileSync(file, `${commitDir}/${file}`);
              }
            });
            
            execSync('git checkout master', {stdio: 'pipe'});
            console.log(`✅ ${branch}/${hash} extracted`);
            
          } catch(e) {
            try { execSync('git checkout master', {stdio: 'pipe'}); } catch(e2) {}
          }
        }
      }
    });
  } catch(e) {
    console.log(`⚠️ Branch ${branch} error`);
  }
});

console.log('✅ Complete branch extraction done');
