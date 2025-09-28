const { execSync } = require('child_process');
const fs = require('fs');

console.log('🌟 MEGA FINAL - Fusion V10-V20');

let fixed = 0;

// Run key scripts
['LAUNCHER_MODULAIRE.js', 'FUSION.js', 'ANALYSE.js'].forEach(s => {
  try {
    execSync(`node ${s}`, {timeout: 10000, stdio: 'pipe'});
    fixed++;
  } catch(e) {}
});

// Final Git
try {
  execSync('git add -A && git commit -m "🌟 Fusion finale V20" && git push', {stdio: 'pipe'});
} catch(e) {}

console.log(`🎉 FUSION V20 TERMINÉE - ${fixed} modules`);
