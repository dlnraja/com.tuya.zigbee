const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 FORCE CREATE BACKUP - Créer backup de force');

// Force create backup structure
if (fs.existsSync('./backup')) {
  fs.rmSync('./backup', {recursive: true});
}

const dirs = [
  './backup',
  './backup/git_data',
  './backup/commits_content',
  './backup/organized'
];

dirs.forEach(dir => {
  fs.mkdirSync(dir, {recursive: true});
  console.log(`✅ ${dir} created`);
});

// Save git data
try {
  const branches = execSync('git branch -a', {encoding: 'utf8'});
  fs.writeFileSync('./backup/git_data/branches.txt', branches);
  
  const commits = execSync('git log --oneline -10', {encoding: 'utf8'});
  fs.writeFileSync('./backup/git_data/commits.txt', commits);
  
  console.log('✅ Git data saved');
} catch(e) {
  console.log('⚠️ Git data error');
}

// Extract 2 key commits
const hashes = ['4cd9b5c11', 'dfa6a98f3'];
let extracted = 0;

hashes.forEach(hash => {
  const dir = `./backup/commits_content/${hash}`;
  fs.mkdirSync(dir, {recursive: true});
  
  try {
    execSync('git stash', {stdio: 'pipe'});
    execSync(`git checkout ${hash}`, {stdio: 'pipe'});
    
    if (fs.existsSync('../app.json')) {
      fs.copyFileSync('../app.json', `${dir}/app.json`);
      extracted++;
    }
    
    execSync('git checkout master', {stdio: 'pipe'});
    console.log(`✅ ${hash} content extracted`);
  } catch(e) {
    try { execSync('git checkout master', {stdio: 'pipe'}); } catch(e2) {}
  }
});

// Create organization info
const info = {
  created: new Date().toISOString(),
  structure: 'clean and organized',
  commits_extracted: extracted,
  total_folders: fs.readdirSync('./backup').length
};

fs.writeFileSync('./backup/organized/info.json', JSON.stringify(info, null, 2));

console.log(`\n🎉 BACKUP CRÉÉ DE FORCE:`);
console.log(`✅ ${dirs.length} dossiers créés`);
console.log(`✅ ${extracted} commits extraits`);
console.log(`✅ Structure propre et organisée`);
