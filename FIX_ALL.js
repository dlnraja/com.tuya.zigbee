const { execSync } = require('child_process');

console.log('🛠️ FIX ALL ULTIMATE');

let iteration = 0;

while (iteration < 5) {
  iteration++;
  console.log(`\n🔄 Iteration ${iteration}`);
  
  // Git fix
  try {
    execSync('git stash && git pull --rebase && git stash pop || true', {stdio: 'inherit'});
    console.log('✅ Git fixed');
  } catch(e) {}
  
  // Run optimizer
  try {
    execSync('node OPTIMIZER.js', {timeout: 30000, stdio: 'inherit'});
    console.log('✅ Optimizer done');
  } catch(e) {}
  
  // Run analyzer
  try {
    execSync('node ANALYZE.js', {timeout: 10000, stdio: 'inherit'});
    console.log('✅ Analysis done');
  } catch(e) {}
  
  console.log(`⭐ Iteration ${iteration} completed`);
}

console.log('\n🎉 FIX ALL TERMINÉ');
