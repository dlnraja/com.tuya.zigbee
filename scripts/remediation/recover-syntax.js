const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function walk(dir, callback) {
  if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('.homeybuild')) return;
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath , callback) : callback(path.join(dir, f))      ;
  });
};

console.log('--- GLOBAL SYNTAX RECOVERY START ---');

walk(ROOT, (filePath) => {
  if (!filePath.endsWith('.js')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // 1. Fix ";" appended after return in if-statements
  // Pattern: return some.expression ; -> return some.expression;
  // We look for; or ; at the end of lines starting with return
  content = content.replace(/(return\s+[^;? ]+ )\s*:\s*null\s*;/g, '$1;');
  
  // 2. Fix the "|| null;" artifact (extra space)
  content = content.replace(/\|\|\s*null\s+;/g, '|| null;');
  
  // 3. Fix the ": null" in other contexts where it might have been misplaced
  // e.g. cleaned = cleaned.replace(...) ; -> cleaned = cleaned.replace(...);
  content = content.replace(/(\w+\s*=\s*[^;? ]+ )\s*:\s*null\s*;/g, '$1;');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Recovered: ${path.relative(ROOT, filePath)}`);
  }
});

console.log('--- GLOBAL SYNTAX RECOVERY COMPLETE ---');
