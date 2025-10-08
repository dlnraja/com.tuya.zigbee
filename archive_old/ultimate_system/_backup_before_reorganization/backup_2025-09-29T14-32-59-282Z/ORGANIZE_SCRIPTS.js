const fs = require('fs');

console.log('📂 ORGANIZE SCRIPTS - Organiser scripts par catégorie');

// Create organized structure
const categories = [
  './scripts/backup',
  './scripts/enrichment', 
  './scripts/validation',
  './scripts/git_tools',
  './scripts/internet_verify'
];

categories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
    console.log(`✅ ${dir} created`);
  }
});

// Move scripts to categories
const scripts = fs.readdirSync('.').filter(f => f.endsWith('.js'));

scripts.forEach(script => {
  let targetDir = './scripts/backup';
  
  if (script.includes('ENRICH') || script.includes('BACKUP')) {
    targetDir = './scripts/enrichment';
  } else if (script.includes('VERIFY') || script.includes('CHECK')) {
    targetDir = './scripts/validation';
  } else if (script.includes('GIT') || script.includes('CHECKOUT')) {
    targetDir = './scripts/git_tools';
  }
  
  const targetPath = `${targetDir}/${script}`;
  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(script, targetPath);
    console.log(`✅ ${script} → ${targetDir}`);
  }
});

console.log('✅ Scripts organized by category');
