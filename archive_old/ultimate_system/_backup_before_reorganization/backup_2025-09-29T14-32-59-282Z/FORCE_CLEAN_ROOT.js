const fs = require('fs');
const { execSync } = require('child_process');

console.log('💪 FORCE CLEAN ROOT');

// Force remove all non-homey directories from root
const toRemove = [
  '../backup', '../backup_complete', '../archives', '../docs', 
  '../references', '../scripts', '../tools', '../modules', 
  '../dumps', '../fusion'
];

toRemove.forEach(dir => {
  try {
    if (fs.existsSync(dir)) {
      execSync(`rmdir /s /q "${dir}"`, {stdio: 'pipe'});
      console.log(`🗑️ ${dir} removed`);
    }
  } catch(e) {
    console.log(`⚠️ ${dir} error`);
  }
});

console.log('✅ Root force cleaned');
