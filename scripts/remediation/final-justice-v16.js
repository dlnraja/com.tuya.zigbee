'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const TARGET_DIRS = ['lib', 'drivers'];

let fixedFiles = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    let modified = false;

    // 1. Fix ': safeMultiply(s, ' typo in regex strings
    if (content.includes(':safeMultiply(s,')) {
        content = content.replace(/:safeMultiply\(s,\s*/g, ':\\s*');
        modified = true;
    }

    // 2. Fix 'match(...);' -> 'match(...) || null;'
    if (content.includes(');')) {
        content = content.replace(/\)\s+:\s+null;/g, ') || null;');
        modified = true;
    }
    
    // 3. Fix missing '?' in ternary
    // Pattern: match(...) : null; -> match(...) ? match(...) : null;
    // but easier to just use || null if we only want the result
    const ternaryFailRegex = /([^=]+)\s*=\s*([^;?]+)\s+:\s+null;/g;
    if (ternaryFailRegex.test(content)) {
        content = content.replace(ternaryFailRegex, '$1 = $2 || null;');
        modified = true;
    }

    if (modified || content !== original) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
        console.log(`[STABILIZED-V16] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file.endsWith('.js')) processFile(fullPath);
    });
}

console.log('--- FINAL JUSTICE V16 ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files stabilized.`);
