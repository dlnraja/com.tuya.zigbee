const { execSync } = require('child_process');
const fs = require('fs');

console.log('💾 DUMP COMPLETE');

// Get commits
const commits = execSync('git log --oneline -8', {encoding: 'utf8'});

commits.split('\n').slice(0, 5).forEach(line => {
  if (line) {
    const hash = line.split(' ')[0];
    const dir = `./backup/master_${hash}`;
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true});
      
      // Create backup info
      fs.writeFileSync(`${dir}/commit_info.json`, JSON.stringify({
        hash,
        message: line.split(' ').slice(1).join(' '),
        branch: 'master',
        timestamp: new Date().toISOString()
      }, null, 2));
      
      // Copy current drivers state
      if (fs.existsSync('./drivers')) {
        const driverCount = fs.readdirSync('./drivers').length;
        fs.writeFileSync(`${dir}/drivers_count.txt`, `${driverCount} drivers`);
      }
    }
  }
});

console.log('✅ Dump terminé');
