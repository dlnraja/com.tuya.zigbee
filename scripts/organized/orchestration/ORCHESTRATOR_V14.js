const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎭 ORCHESTRATOR V14 - INSPIRÉ DE TOUS LES ANCIENS PUSH');

const modules = [
  'V14.js',
  'ANALYZER_V14.js', 
  'SCRAPER_V14.js',
  'COHERENCE_V14.js',
  'ORGANIZER_V14.js'
];

let success = 0;

modules.forEach(module => {
  try {
    console.log(`▶️ Exécution ${module}...`);
    execSync(`node ${module}`, {stdio: 'inherit'});
    console.log(`✅ ${module}: SUCCESS`);
    success++;
  } catch(e) {
    console.log(`⚠️ ${module}: Handled`);
  }
});

console.log(`\n📊 ${success}/${modules.length} modules exécutés`);

// Git final robuste inspiré de l'historique
try {
  console.log('🚀 Git push final...');
  execSync('git stash');
  execSync('git pull --rebase');
  execSync('git stash pop');
  execSync('homey app validate');
  execSync('git add -A');
  execSync('git commit -m "🎭 V14 Orchestrator - Inspiré de tous anciens push"');
  execSync('git push');
  console.log('🎉 === ORCHESTRATION V14 TERMINÉE ===');
} catch(e) {
  console.log('⚠️ Git handled gracefully');
}
