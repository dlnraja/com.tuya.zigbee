const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    try {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', '.homeybuild', '.gemini', 'assets'].includes(f)) {
          walk(p, callback);
        }
      } else if (f.endsWith('.js') && !f.endsWith('.tmp.js')) {
        callback(p);
      }
    } catch (e) {
      // Ignore files that disappear during walk
    }
  });
}

console.log('=== UNIVERSAL SYNTAX PURITY SCAN ===');
let errors = 0;

function checkSyntax(p) {
  try {
    // Read the file and strip shebang if present to avoid node -c false positives on Windows
    let content = fs.readFileSync(p, 'utf8');
    if (content.startsWith('#!')) {
      content = '// SHEBANG STRIPPED FOR WINDOWS SYNTAX CHECK\n' + content.split('\n').slice(1).join('\n');
      const tempPath = p + '.tmp.js';
      fs.writeFileSync(tempPath, content);
      try {
        execSync(`node -c "${tempPath}"`, { stdio: 'inherit' });
      } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    } else {
      execSync(`node -c "${p}"`, { stdio: 'inherit' });
    }
  } catch (e) {
    console.error(`❌ SYNTAX ERROR in ${p}`);
    errors++;
  }
}

walk(ROOT, checkSyntax);

if (errors === 0) {
  console.log('\n✅ ALL JS FILES ARE SYNTACTICALLY PURE.');
  process.exit(0);
} else {
  console.log(`\n❌ FOUND ${errors} SYNTAX ERRORS.`);
  process.exit(1);
}
