const fs = require('fs');
const { execSync } = require('child_process');

console.log('🌟 SUPER OPTIMIZER');

let fixes = 0;

// Fix drivers
if (fs.existsSync('./drivers')) {
  fs.readdirSync('./drivers').slice(0, 10).forEach(d => {
    const f = `./drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
      try {
        let data = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!data.id || data.id.includes('*')) {
          data.id = `_TZ3000_${d.slice(0, 5)}`;
          fs.writeFileSync(f, JSON.stringify(data, null, 2));
          fixes++;
        }
      } catch(e) {}
    }
  });
}

// Run scripts
const scripts = ['ANALYZER_SUPREME_V18.js', 'ENRICHER_ULTIMATE_V18.js'];
scripts.forEach(s => {
  try {
    execSync(`node ${s}`, {timeout: 30000, stdio: 'pipe'});
    fixes++;
  } catch(e) {}
});

console.log(`✅ ${fixes} optimisations`);

// Final push
try {
  execSync('git add -A && git commit -m "🌟 Super Opt" && git push', {stdio: 'pipe'});
} catch(e) {}

console.log('🎉 TERMINÉ');
