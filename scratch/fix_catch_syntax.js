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

  // Fix }).catch(() => {});  -> }).catch(() => {});
  if (content.includes('}).catch(() => {});')) {
    content = content.replace(/}\)\.catch\(\(\) => {};/g, '}).catch(() => {});');
    changed = true;
  }

  // Fix }).catch(() => {}); -> }).catch(() => {});
  if (content.includes('}).catch(() => {});')) {
    content = content.replace(/}\)\.catch\(\(\) => { };/g, '}).catch(() => {});');
    changed = true;
  }

  // Fix }).catch(err => this.log(...); -> }).catch(err => this.log(...));
  // This one is trickier. Let's look for common patterns.
  // drivers\remote_button_wireless_hybrid\device.js:113: }).catch(err => this.log('Battery reporting config failed:', err.message));
  const logCatchRegex = /}\)\.catch\(err => this\.log\('([^']+)', err\.message\);/g;
  if (logCatchRegex.test(content)) {
    content = content.replace(logCatchRegex, "}).catch(err => this.log('$1', err.message));");
    changed = true;
  }

  if (changed) {
    console.log(`Fixed ${file}`);
    fs.writeFileSync(file, content);
  }
});
