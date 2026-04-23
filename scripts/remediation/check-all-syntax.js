'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const libFiles = getFiles(path.resolve('lib'));
const driverFiles = getFiles(path.resolve('drivers'));
const appFile = path.resolve('app.js');
const allFiles = [appFile, ...libFiles, ...driverFiles];

console.log(`Checking ${allFiles.length} files...`);

let failed = 0;
allFiles.forEach((file) => {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
  } catch (e) {
    failed++;
    const stderr = e.stderr ? e.stderr.toString() : e.message      ;
    // Extract the most important part of the error
    const lines = stderr.split('\n');
    const errorMsg = lines.find(l => l.includes('SyntaxError')) || lines[0];
    const location = lines.find(l => l.includes(':') && !l.includes('SyntaxError')) || 'unknown';
    console.log(`[SYNTAX-ERROR] ${path.relative(process.cwd(), file)}: ${errorMsg.trim()} at ${location.trim()}`);
  }
});

if (failed === 0) {
  console.log('ALL FILES SYNTAX OK!');
} else {
  console.error(`${failed} files have syntax errors!`);
  process.exit(1);
}
