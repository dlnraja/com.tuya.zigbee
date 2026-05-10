'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['lib', 'drivers', 'scripts'];
const IGNORE_DIRS = ['node_modules', '.git', '.homeybuild', 'quarantine', 'tmp'];

let repairCount = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      repairFile(fullPath);
    }
  }
}

function repairFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Fix missing space after 'class' (only in class declarations!)
    // e.g., classLightBase extends ... or classLightBase {
    content = content.replace(/\bclass([A-Z]\w*)(?=\s*(?:extends|\{))/g, 'class $1');

    // 2. Fix missing space after 'extends' (only in class declarations!)
    // e.g., class MyDevice extendsSensorBase
    content = content.replace(/\bclass\s+(\w+)\s+extends([A-Z]\w*)/g, 'class $1 extends $2');

    // 3. Fix missing space before 'extends' (only in class declarations!)
    // e.g., class MyDeviceextends SensorBase
    content = content.replace(/\bclass\s+(\w+)extends\s+(\w+)/g, 'class $1 extends $2');

    // 4. Fix missing space in module.exports =Name
    // e.g., module.exports =LightBase;
    content = content.replace(/module\.exports\s*=\s*([A-Z]\w*)(;?\s*)$/gm, (match, className, ending) => {
      return `module.exports = ${className}${ending}`;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      repairCount++;
      console.log(`🔧 Repaired class/extends spacing inside ${path.relative(ROOT, filePath)}`);
    }
  } catch (err) {
    console.error(`Error repairing ${filePath}: ${err.message}`);
  }
}

console.log('🚀 Starting automatic class/extends spacing repair...');
console.log('='.repeat(60));

TARGET_DIRS.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    walk(fullPath);
  }
});

console.log('='.repeat(60));
console.log(`🎉 Complete! Repaired spacing in ${repairCount} file(s).`);
