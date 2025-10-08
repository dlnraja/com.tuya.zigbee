const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 FIX BACKUP');

// Create backup structure
if (!fs.existsSync('./backup')) fs.mkdirSync('./backup', {recursive: true});

// Move existing backup if at root
if (fs.existsSync('../backup')) {
  execSync('robocopy "../backup" "./backup" /E /NFL /NDL /NJH /NJS', {stdio: 'pipe'});
  console.log('✅ Backup moved');
}

console.log('✅ Done');
