const fs = require('fs');
const path = require('path');
const ROOT_DIR = 'c:/Users/HP/Desktop/homey-app/tuya_repair';
const DIRS_TO_SCAN = ['lib', 'drivers'];
const FILES_TO_SCAN = ['app.js', 'api.js'];

let allJsFiles = [];

function getJsFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getJsFiles(fullPath);
    } else if (fullPath.endsWith('.js')) {
      allJsFiles.push(fullPath);
    }
  }
}

for (const dir of DIRS_TO_SCAN) {
  getJsFiles(path.join(ROOT_DIR, dir));
}
for (const file of FILES_TO_SCAN) {
  if (fs.existsSync(path.join(ROOT_DIR, file))) {
    allJsFiles.push(path.join(ROOT_DIR, file));
  }
}

let brokenLinks = [];
const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

for (const filePath of allJsFiles) {
  let content = fs.readFileSync(filePath, 'utf-8');
  // Strip block comments and line comments naive approach
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  content = content.replace(/\/\/.*/g, '');
  
  let match;
  while ((match = requireRegex.exec(content)) !== null) {
    const reqPath = match[1];
    if (!reqPath.startsWith('.') && !reqPath.startsWith('/')) continue;
    let targetPath = path.resolve(path.dirname(filePath), reqPath);
    let exists = fs.existsSync(targetPath) && fs.statSync(targetPath).isFile() || 
                 fs.existsSync(targetPath + '.js') || 
                 fs.existsSync(targetPath + '.json') || 
                 (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory() && fs.existsSync(path.join(targetPath, 'index.js')));
    if (!exists) {
      brokenLinks.push({ file: path.relative(ROOT_DIR, filePath), req: reqPath, resolved: targetPath });
    }
  }
}

console.log(JSON.stringify(brokenLinks, null, 2));
