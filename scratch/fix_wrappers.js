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

const wrappers = [
  'Math\\.round',
  'Math\\.floor',
  'Math\\.ceil',
  'Math\\.abs',
  'Math\\.pow',
  'parseFloat',
  'parseInt',
  'Number',
  'String',
  'safeParse',
  'safeDivide',
  'safeMultiply',
  'Boolean',
  'Buffer\\.from'
];

walk('.', (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const wrapper of wrappers) {
    // Match wrapper(something); where something doesn't contain a closing )
    // This is a bit simplified but should catch the common cases like Math.round(value);
    const regex = new RegExp(`(${wrapper})\\(([^\\);]+);`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, '$1($2);');
      // Wait, the replacement should add the missing )
      // But if there are nested calls, it might be complex.
      // Let's try to count parentheses.
    }
  }
  
  // Re-reading to apply a better logic for parentheses counting
  let lines = content.split('\n');
  let newLines = [];
  for (let line of lines) {
    let newLine = line;
    for (const wrapper of wrappers) {
      const regex = new RegExp(`(${wrapper})\\(([^;]+);`, 'g');
      let match;
      while ((match = regex.exec(line)) !== null) {
        let fullMatch = match[0];
        let func = match[1];
        let args = match[2];
        
        let openCount = 0;
        let closeCount = 0;
        for (let char of (func + '(' + args)) {
          if (char === '(') openCount++;
          if (char === ')') closeCount++;
        }
        
        if (openCount > closeCount) {
          let fixed = fullMatch.replace(/;$/, ')'.repeat(openCount - closeCount) + ';');
          newLine = newLine.replace(fullMatch, fixed);
          changed = true;
        }
      }
    }
    newLines.push(newLine);
  }

  if (changed) {
    console.log(`Fixed ${file}`);
    fs.writeFileSync(file, newLines.join('\n'));
  }
});
