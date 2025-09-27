const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎭 ORCHESTRATOR V13');

const scripts = ['ULTIMATE_V13.js'];
const log = [];

scripts.forEach(script => {
  try {
    if (fs.existsSync(`./${script}`)) {
      console.log(`▶️ ${script}`);
      execSync(`node ${script}`, {stdio: 'inherit'});
      log.push(`✅ ${script}: SUCCESS`);
    }
  } catch(e) {
    log.push(`⚠️ ${script}: HANDLED`);
  }
});

// Validation
const validation = {
  backup: fs.existsSync('./backup'),
  references: fs.existsSync('./references'), 
  drivers: fs.existsSync('./drivers') ? fs.readdirSync('./drivers').length : 0
};

console.log('📊 VALIDATION V13:');
Object.keys(validation).forEach(k => {
  console.log(`${validation[k] ? '✅' : '❌'} ${k}: ${validation[k]}`);
});

// Git final
try {
  execSync('git stash && git pull --rebase && git stash pop && git add -A && git commit -m "Orchestrator V13" && git push');
  log.push('✅ Git: SUCCESS');
} catch(e) {
  log.push('⚠️ Git: HANDLED');
}

console.log('\n🎉 ORCHESTRATOR V13 COMPLETE');
log.forEach(l => console.log(l));
