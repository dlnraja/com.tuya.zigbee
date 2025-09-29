const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 CHECKOUT COMMITS');

const commits = ['4cd9b5c11', 'dfa6a98f3'];

commits.forEach(hash => {
  const dir = `./backup/commit_${hash}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  
  try {
    execSync('git stash', {stdio: 'pipe'});
    execSync(`git checkout ${hash}`, {stdio: 'pipe'});
    
    if (fs.existsSync('app.json')) {
      fs.copyFileSync('app.json', `${dir}/app.json`);
    }
    
    execSync('git checkout master', {stdio: 'pipe'});
    console.log(`✅ ${hash}`);
  } catch(e) {
    console.log(`⚠️ ${hash} error`);
    try { execSync('git checkout master', {stdio: 'pipe'}); } catch(e2) {}
  }
});

console.log('✅ Checkout done');
