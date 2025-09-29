const fs = require('fs');
const { execSync } = require('child_process');

console.log('🌿 GIT EXTRACT');

const branches = execSync('git branch -a', {encoding: 'utf8'}).split('\n').slice(0,3);
branches.forEach(b => {
  if (b.trim()) {
    const name = b.replace(/[\*\s]/g, '');
    const dir = `./backup/git_${name}`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    console.log(`✅ ${name}`);
  }
});

console.log('✅ Done');
