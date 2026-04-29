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

  // Fix broken ternaries: const x = a ? b; -> const x = a ? b;
  // Patterns like: ? someFunc(x) ;
  const brokenTernaryRegex = /\? ([^:;?]+);/g;
  if (brokenTernaryRegex.test(content)) {
    content = content.replace(brokenTernaryRegex, '? $1;');
    changed = true;
  }

  // Fix specific known cases
  if (content.includes("powerSource.toLowerCase();")) {
    content = content.replace(/typeof powerSource === 'string' \? powerSource\.toLowerCase\(\);/g, "typeof powerSource.powerSource === 'string' ? powerSource.powerSource.toLowerCase() : '';");
    changed = true;
  }

  if (changed) {
    console.log(`Fixed ${file}`);
    fs.writeFileSync(file, content);
  }
});
