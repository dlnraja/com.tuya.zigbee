const fs = require('fs');

console.log('🗂️ CLEAN MORE FILES');

// Create more dirs
['archive/reports', 'archive/logs', 'archive/temp'].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive: true});
});

// Move text files
const txtFiles = fs.readdirSync('.').filter(f => f.endsWith('.txt'));
txtFiles.forEach(f => fs.renameSync(f, `archive/temp/${f}`));

// Move JSON reports
const jsonFiles = fs.readdirSync('.').filter(f => f.endsWith('.json') && !['app.json', 'package.json', 'package-lock.json'].includes(f));
jsonFiles.forEach(f => fs.renameSync(f, `archive/reports/${f}`));

// Move MD files (except README)
const mdFiles = fs.readdirSync('.').filter(f => f.endsWith('.md') && f !== 'README.md');
mdFiles.forEach(f => fs.renameSync(f, `archive/${f}`));

console.log(`✅ Cleaned: ${txtFiles.length} txt, ${jsonFiles.length} json, ${mdFiles.length} md files`);
