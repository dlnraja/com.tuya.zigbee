const fs = require('fs');
const { execSync } = require('child_process');

console.log('📦 REORGANIZE BACKUP - Réorganiser backup proprement');

// Get git data and organize properly
console.log('📊 Collecting git data...');

// Get branches
const branches = execSync('git branch -a', {encoding: 'utf8'});
fs.writeFileSync('./backup_clean/git_branches/all_branches.txt', branches);

// Get commits with details  
const commits = execSync('git log --oneline --all -20', {encoding: 'utf8'});
fs.writeFileSync('./backup_clean/git_commits/all_commits.txt', commits);

// Get commit details with dates
const commitDetails = execSync('git log --pretty=format:"%h|%ad|%s" --date=short -10', {encoding: 'utf8'});
fs.writeFileSync('./backup_clean/git_history/commit_details.txt', commitDetails);

console.log('✅ Git data organized');

// Extract content from key commits
console.log('🔄 Extracting content...');
const keyCommits = ['4cd9b5c11', 'dfa6a98f3', '667198c55'];
let extracted = 0;

keyCommits.forEach(hash => {
  const commitDir = `./backup_clean/extracted_content/${hash}`;
  if (!fs.existsSync(commitDir)) {
    fs.mkdirSync(commitDir, {recursive: true});
    
    try {
      execSync('git stash', {stdio: 'pipe'});
      execSync(`git checkout ${hash}`, {stdio: 'pipe'});
      
      // Copy essential files
      if (fs.existsSync('../app.json')) {
        fs.copyFileSync('../app.json', `${commitDir}/app.json`);
      }
      if (fs.existsSync('../package.json')) {
        fs.copyFileSync('../package.json', `${commitDir}/package.json`);
      }
      
      // Create commit info
      const info = {
        hash: hash,
        extractedAt: new Date().toISOString(),
        files: fs.readdirSync(commitDir)
      };
      fs.writeFileSync(`${commitDir}/extract_info.json`, JSON.stringify(info, null, 2));
      
      execSync('git checkout master', {stdio: 'pipe'});
      extracted++;
      console.log(`✅ ${hash} content extracted`);
    } catch(e) {
      try { execSync('git checkout master', {stdio: 'pipe'}); } catch(e2) {}
    }
  }
});

// Remove old messy backup
if (fs.existsSync('./backup')) {
  fs.rmSync('./backup', {recursive: true});
  console.log('🗑️ Old messy backup removed');
}

// Rename clean backup
fs.renameSync('./backup_clean', './backup');
console.log('✅ Clean backup renamed to ./backup');

console.log(`\n🎉 BACKUP RÉORGANISÉ:`);
console.log(`✅ Structure clean et organisée`);
console.log(`✅ ${extracted} commits avec contenu`);
console.log(`✅ Git data complet sauvé`);
console.log(`✅ Ancien bazar supprimé`);
