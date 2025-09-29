const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 FULL DUMPER');
if (!fs.existsSync('./backup/full')) fs.mkdirSync('./backup/full', { recursive: true });

// Git history
const commits = execSync('git log --oneline -30', { encoding: 'utf8' });
fs.writeFileSync('./backup/full/commits.txt', commits);

console.log('✅ Dump terminé');
