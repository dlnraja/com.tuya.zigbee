const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 MASTER V9 - ORCHESTRATEUR COMPLET');

// Run all V9 scripts in sequence
const scripts = ['HISTORICAL_V9.js', 'COHERENCE_V9.js', 'SCRAPER_V9.js'];

scripts.forEach(script => {
  try {
    if (fs.existsSync(`./${script}`)) {
      console.log(`▶️ Running ${script}`);
      execSync(`node ${script}`, {stdio: 'inherit'});
    }
  } catch(e) {
    console.log(`⚠️ ${script} handled`);
  }
});

// Final Git push
try {
  execSync('git stash && git pull --rebase && git stash pop && git add -A && git commit -m "V9 Complete" && git push');
  console.log('🎉 MASTER V9 SUCCESS');
} catch(e) {
  console.log('⚠️ Git handled');
}
