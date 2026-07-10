const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (p.includes('node_modules')) return;
    if (fs.statSync(p).isDirectory()) walk(p, callback);
    else callback(p);
  });
};

console.log('--- START SYNTAX CHECK ---');
walk('.', p => {
  if (p.endsWith('.js')) {
    try {
      execSync(`node --check "${p}"`, { stdio: 'ignore' });
    } catch (e) {
      console.log(`ERROR: ${p}`);
      // Try to get specific error
      try {
        execSync(`node --check "${p}"`, { stdio: 'inherit' });
      } catch (err) {
        // Already printed to inherit
      }
    }
  }
});
console.log('--- END SYNTAX CHECK ---');
