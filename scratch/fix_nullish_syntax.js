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

  // Fix ?? ...; -> ?? ...;
  const brokenNullishRegex = /\?\? ([^:;?]+);/g;
  if (brokenNullishRegex.test(content)) {
    content = content.replace(brokenNullishRegex, '?? $1;');
    changed = true;
  }

  // Fix ?? ...) -> ?? ... )
  const brokenNullishParenRegex = /\?\? ([^:;?]+) : null\)/g;
  if (brokenNullishParenRegex.test(content)) {
    content = content.replace(brokenNullishParenRegex, '?? $1)');
    changed = true;
  }

  if (changed) {
    console.log(`Fixed ${file}`);
    fs.writeFileSync(file, content);
  }
});
