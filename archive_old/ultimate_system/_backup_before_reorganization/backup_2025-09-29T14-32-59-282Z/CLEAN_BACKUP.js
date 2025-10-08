const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧹 CLEAN BACKUP - Nettoyer dossier backup');

// Remove all empty backup folders
if (fs.existsSync('./backup')) {
  const items = fs.readdirSync('./backup');
  let removed = 0;
  
  items.forEach(item => {
    const itemPath = `./backup/${item}`;
    try {
      if (fs.statSync(itemPath).isDirectory()) {
        const contents = fs.readdirSync(itemPath);
        if (contents.length === 0) {
          fs.rmSync(itemPath, {recursive: true});
          removed++;
        }
      }
    } catch(e) {}
  });
  
  console.log(`🗑️ ${removed} empty folders removed`);
}

// Create clean organized structure
const cleanStructure = [
  './backup_clean/git_branches',
  './backup_clean/git_commits', 
  './backup_clean/extracted_content',
  './backup_clean/git_history'
];

cleanStructure.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
    console.log(`✅ ${dir} created`);
  }
});

console.log('✅ Clean backup structure created');
