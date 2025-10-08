const { execSync } = require('child_process');

console.log('🎯 RUNNER ULTIME');

const scripts = ['ANALYZER_SUPREME_V18.js', 'ENRICHER_ULTIMATE_V18.js'];
let ok = 0;

scripts.forEach(s => {
  try {
    execSync(`node ${s}`, {timeout: 30000});
    ok++;
  } catch(e) {}
});

console.log(`✅ ${ok}/${scripts.length} OK`);
execSync('git add -A && git commit -m "🎯" && git push || true', {stdio: 'pipe'});
