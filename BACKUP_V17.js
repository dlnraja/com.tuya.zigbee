const fs = require('fs');
const { execSync } = require('child_process');

console.log('🏛️ BACKUP V17 - DUMP TOUS ANCIENS PUSH');

// Backup sécurisé
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup');

// Sécurisation
fs.appendFileSync('./.gitignore', '\nbackup/\n');
fs.appendFileSync('./.homeyignore', '\nbackup/\n');

// Analyse commits
const data = {commits: [], ids: new Set()};
try {
  const commits = execSync('git log --oneline -30', {encoding: 'utf8'}).split('\n');
  commits.forEach(c => {
    if (c.trim()) {
      data.commits.push(c.slice(0, 50));
      const ids = c.match(/_TZ[0-9A-Z_]+|TS[0-9A-Z]+/g) || [];
      ids.forEach(id => data.ids.add(id));
    }
  });
} catch(e) {}

fs.writeFileSync('./references/backup_v17.json', JSON.stringify({
  ...data,
  ids: Array.from(data.ids),
  total: data.commits.length
}, null, 2));

console.log(`✅ Backup V17: ${data.commits.length} commits, ${data.ids.size} IDs`);
