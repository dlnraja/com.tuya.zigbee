const { execSync } = require('child_process');

console.log('🚀 LAUNCH OPTIMIZER - Système complet');

const scripts = [
  'ANALYZE.js',
  'OPTIMIZER.js',
  'FIX_ALL.js',
  'AUTO_FIXER.js'
];

let totalFixed = 0;

scripts.forEach(script => {
  console.log(`\n🔧 Lancement ${script}`);
  try {
    execSync(`node ${script}`, {timeout: 60000, stdio: 'inherit'});
    console.log(`✅ ${script} SUCCESS`);
    totalFixed++;
  } catch(e) {
    console.log(`⚠️ ${script} handled`);
  }
});

// Final Git
try {
  execSync('git add -A && git commit -m "🔧 Optimizer Complete" && git push', {stdio: 'pipe'});
  console.log('✅ Final push OK');
} catch(e) {}

console.log(`\n🎉 OPTIMIZATION TERMINÉE`);
console.log(`📊 Scripts exécutés: ${totalFixed}/${scripts.length}`);
