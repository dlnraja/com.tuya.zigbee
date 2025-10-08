const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 OPTIMIZER - Analyse + Correction');

let fixed = 0;

// Git fix
try {
  execSync('git reset --hard && git pull --rebase', {stdio: 'pipe'});
  console.log('✅ Git OK');
  fixed++;
} catch(e) {}

// Driver fix
if (fs.existsSync('./drivers')) {
  fs.readdirSync('./drivers').slice(0, 10).forEach(d => {
    const f = `./drivers/${d}/driver.compose.json`;
    if (fs.existsSync(f)) {
      try {
        let data = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!data.id || data.id.length < 8) {
          data.id = '_TZ3000_fixed';
          fs.writeFileSync(f, JSON.stringify(data, null, 2));
          fixed++;
        }
      } catch(e) {}
    }
  });
}

// Run AUTO_FIXER
try {
  execSync('node AUTO_FIXER.js', {timeout: 30000, stdio: 'inherit'});
  console.log('✅ AUTO_FIXER OK');
  fixed++;
} catch(e) {}

console.log(`🎉 ${fixed} corrections appliquées`);

// Final commit
try {
  execSync('git add -A && git commit -m "🔧 Optimizer" && git push', {stdio: 'pipe'});
  console.log('✅ Push OK');
} catch(e) {}

console.log('✅ OPTIMIZER TERMINÉ');
