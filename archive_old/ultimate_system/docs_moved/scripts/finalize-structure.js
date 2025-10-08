const fs = require('fs');
const {execSync} = require('child_process');

console.log('🎯 FINALIZE STRUCTURE');

// Check current root
const rootFiles = fs.readdirSync('.').filter(f => !fs.statSync(f).isDirectory());
console.log(`📁 Root files: ${rootFiles.length}`);

// Move remaining non-essential files
const essential = ['app.json', 'package.json', 'package-lock.json', 'README.md', 'LICENSE', '.gitignore', '.homeychangelog.json', '.homeyignore'];
const nonEssential = rootFiles.filter(f => !essential.includes(f) && !f.startsWith('.'));

nonEssential.forEach(f => {
    if (f.endsWith('.js')) fs.renameSync(f, `scripts/${f}`);
    else if (f.endsWith('.md')) fs.renameSync(f, `archive/${f}`);
    else fs.renameSync(f, `archive/temp/${f}`);
});

// Commit clean structure
execSync('git add -A && git commit -m "🗂️ CLEAN: Professional project structure" && git push origin master');

console.log(`✅ Moved ${nonEssential.length} files`);
console.log('🎯 Root now has only essential files!');
