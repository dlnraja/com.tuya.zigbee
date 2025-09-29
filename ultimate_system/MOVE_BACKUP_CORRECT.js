const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 MOVE BACKUP CORRECT - Corriger emplacement backup');

// Move backup from root to ultimate_system if exists
if (fs.existsSync('../backup')) {
  if (!fs.existsSync('./backup_complete')) {
    execSync('robocopy "../backup" "./backup_complete" /E /NFL /NDL /NJH /NJS', {stdio: 'pipe'});
    console.log('✅ backup moved from root to ultimate_system/backup_complete');
  }
  
  // Remove backup from root
  execSync('rmdir /s /q "../backup"', {stdio: 'pipe'});
  console.log('✅ backup removed from root');
}

console.log('✅ Backup correctly positioned in ultimate_system');
