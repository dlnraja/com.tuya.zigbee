const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git') walk(dirPath, callback);
    } else {
      if (f.endsWith('.js')) callback(path.join(dir, f));
    }
  });
}

walk('.', (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Fix .log('...');); -> .log('...');
  const logRegex = /\.log\('([^']+)'\)\);/g;
  if (logRegex.test(content)) {
    content = content.replace(logRegex, ".log('$1');");
    changed = true;
  }

  // Fix .log('...', err.message)); -> .log('...', err.message); (if already closed)
  // This is risky, let's be careful.
  // Actually, let's just fix the specific cases reported.
  
  if (changed) {
    console.log(`Fixed ${file}`);
    fs.writeFileSync(file, content);
  }
});
