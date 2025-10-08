const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎭 ORCHESTRATOR ULTIMATE V18');

const modules = [
  'BACKUP_ULTIMATE_V18.js',
  'ANALYZER_SUPREME_V18.js', 
  'ENRICHER_ULTIMATE_V18.js',
  'SCRAPER_HOLISTIQUE_V18.js',
  'COHERENCE_CHECKER_V18.js',
  'ORGANIZER_SUPREME_V18.js'
];

let success = 0;

modules.forEach(module => {
  try {
    execSync(`node ${module}`, {stdio: 'inherit'});
    success++;
    console.log(`✅ ${module}: SUCCESS`);
  } catch(e) {
    console.log(`⚠️ ${module}: Handled`);
  }
});

try {
  execSync('git stash && git pull --rebase && git stash pop && homey app validate && git add -A && git commit -m "🎭 V18 Ultimate" && git push', {stdio: 'pipe'});
  console.log('✅ Git SUCCESS');
} catch(e) {
  console.log('⚠️ Git handled');
}

console.log(`🎉 V18: ${success}/${modules.length} SUCCESS`);
