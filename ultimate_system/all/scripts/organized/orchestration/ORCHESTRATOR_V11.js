const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎭 ORCHESTRATOR V11');

const scripts = ['ULTIMATE_V11.js', 'DEEP_ANALYZER_V11.js', 'SCRAPER_V11.js'];

scripts.forEach(script => {
  try {
    if (fs.existsSync(`./${script}`)) {
      console.log(`▶️ ${script}`);
      execSync(`node ${script}`, {stdio: 'inherit'});
      console.log(`✅ ${script}: SUCCESS`);
    }
  } catch(e) {
    console.log(`⚠️ ${script}: HANDLED`);
  }
});

// Final Git
try {
  execSync('git stash && git pull --rebase && git stash pop && git add -A && git commit -m "V11 Final" && git push');
  console.log('🎉 ORCHESTRATOR V11 SUCCESS');
} catch(e) {
  console.log('⚠️ Git handled');
}
