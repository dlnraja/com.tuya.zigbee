const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 BACKUP FIXER');

// Clean backup
if (fs.existsSync('./backup')) {
  const dirs = fs.readdirSync('./backup');
  dirs.forEach(d => {
    const path = `./backup/${d}`;
    if (fs.readdirSync(path).length === 0) {
      fs.rmSync(path, {recursive: true});
    }
  });
}

// Create proper structure
const commits = execSync('git log --oneline -10', {encoding: 'utf8'});
commits.split('\n').slice(0, 5).forEach(commit => {
  if (commit) {
    const hash = commit.split(' ')[0];
    const dir = `./backup/master_${hash}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true});
      fs.writeFileSync(`${dir}/info.txt`, `Commit: ${hash}`);
    }
  }
});

console.log('✅ Backup fixed');
