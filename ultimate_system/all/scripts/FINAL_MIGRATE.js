const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 FINAL MIGRATE');

['archives', 'dumps', 'fusion', 'modules', 'references'].forEach(f => {
  if (fs.existsSync(f)) {
    execSync(`move "${f}" "./ultimate_system/all/"`, {stdio: 'pipe'});
    console.log(`✅ ${f}`);
  }
});

console.log('✅ Done');
