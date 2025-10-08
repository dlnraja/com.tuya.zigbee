const fs = require('fs');

console.log('🔍 BACKUP ANALYZER');

let found = 0, analyzed = 0;

if (fs.existsSync('./backup')) {
  const dirs = fs.readdirSync('./backup');
  
  dirs.forEach(dir => {
    found++;
    const path = `./backup/${dir}`;
    
    if (fs.existsSync(`${path}/commit_info.json`)) {
      const info = JSON.parse(fs.readFileSync(`${path}/commit_info.json`, 'utf8'));
      console.log(`📋 ${dir}: ${info.message}`);
      analyzed++;
    }
  });
}

console.log(`✅ ${analyzed}/${found} backups analysés`);
