const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 CHECKOUT CONTENT');

const commits = execSync('git log --oneline -3', {encoding: 'utf8'}).split('\n');

commits.forEach(line => {
  if (line) {
    const hash = line.split(' ')[0];
    const dir = `./backup/content_${hash}`;
    
    try {
      execSync('git stash', {stdio: 'pipe'});
      execSync(`git checkout ${hash}`, {stdio: 'pipe'});
      
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
      if (fs.existsSync('app.json')) fs.copyFileSync('app.json', `${dir}/app.json`);
      
      execSync('git checkout master', {stdio: 'pipe'});
      console.log(`✅ ${hash}`);
    } catch(e) {
      try { execSync('git checkout master', {stdio: 'pipe'}); } catch(e2) {}
    }
  }
});

console.log('✅ Done');
