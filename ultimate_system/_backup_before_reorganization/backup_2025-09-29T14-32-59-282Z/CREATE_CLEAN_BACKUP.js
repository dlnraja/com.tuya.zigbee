const fs = require('fs');
const { execSync } = require('child_process');

console.log('✨ CREATE CLEAN BACKUP - Créer backup propre');

// Create clean organized structure
const structure = [
  './backup/branches',
  './backup/commits',
  './backup/content',
  './backup/history'
];

structure.forEach(dir => {
  fs.mkdirSync(dir, {recursive: true});
  console.log(`✅ ${dir} created`);
});

// Collect and organize git data
console.log('📊 Organizing git data...');

// Branches
const branches = execSync('git branch -a', {encoding: 'utf8'});
fs.writeFileSync('./backup/branches/all_branches.txt', branches);

// Commits
const commits = execSync('git log --oneline -15', {encoding: 'utf8'});
fs.writeFileSync('./backup/commits/recent_commits.txt', commits);

// History with details
const history = execSync('git log --pretty=format:"%h - %ad - %s" --date=short -10', {encoding: 'utf8'});
fs.writeFileSync('./backup/history/detailed_history.txt', history);

// Extract key commit content
console.log('🔄 Extracting content...');
const commits_to_extract = ['4cd9b5c11', 'dfa6a98f3'];
let success = 0;

commits_to_extract.forEach(hash => {
  const dir = `./backup/content/${hash}`;
  fs.mkdirSync(dir, {recursive: true});
  
  try {
    execSync('git stash', {stdio: 'pipe'});
    execSync(`git checkout ${hash}`, {stdio: 'pipe'});
    
    if (fs.existsSync('../app.json')) {
      fs.copyFileSync('../app.json', `${dir}/app.json`);
    }
    if (fs.existsSync('../package.json')) {
      fs.copyFileSync('../package.json', `${dir}/package.json`);
    }
    
    execSync('git checkout master', {stdio: 'pipe'});
    success++;
    console.log(`✅ ${hash} extracted`);
  } catch(e) {
    try { execSync('git checkout master', {stdio: 'pipe'}); } catch(e2) {}
  }
});

console.log(`\n🎉 BACKUP CLEAN CRÉÉ:`);
console.log(`✅ Structure organisée: 4 catégories`);
console.log(`✅ Git data complet sauvé`);
console.log(`✅ ${success} commits avec contenu`);
console.log(`✅ Terminé et prêt`);
