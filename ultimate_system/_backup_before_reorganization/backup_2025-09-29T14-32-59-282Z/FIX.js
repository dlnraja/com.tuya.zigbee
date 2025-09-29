const { execSync } = require('child_process');

console.log('⚡ FIX');
try {
  execSync('git pull', {stdio: 'pipe'});
  console.log('✅ OK');
} catch(e) {}
