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

    // 1. Fix Empty Boilerplate Capability
    // Pattern: { capability } -> { capability: 'unknown' }
    if (content.includes('{ capability }')) {
        content = content.replace(/\{ capability \}/g, "{ capability: 'unknown' }");
        modified = true;
    }

    // 2. Fix mangled reverseTransform / transform arrows
    // Pattern: =>Math.round(v)+ 10) }
    content = content.replace(/=>Math\.round\(v\)\+\s*(\d+)\)\s*}/g, '=> Math.round(v) + $1 }');
    content = content.replace(/=>Math\.max\((\d+),\s*v\s*-\s*(\d+)\)\s*}/g, '=> Math.max($1, v - $2) }');

    // 3. Fix botched arrows (= >)
    if (content.includes('= >')) {
        content = content.replace(/=\s+>/g, '=>');
        modified = true;
    }

    // 4. Fix Unbalanced Math chains from previous sessions
    content = content.replace(/Math\.max\(0,\s*Math\.min\(100,\s*Math\.round\(([^)]+)\)\s*(?!\))\);/g, 'Math.max(0, Math.min(100, Math.round($1)));');

    // 5. Fix dangling ternaries (more refined than V7)
    // Only if it's not optional chaining or already closed
    content = content.replace(/const\s+(\w+)\s*=\s*(device\.getStoreValue\s+\?\s+[^?;]+)\s*;\s*/g, (m, p1, p2) => {
        if (!p2.includes(':')) {
            modified = true;
            return `const ${p1} = ${p2};`;
        }
        return m;
    });

    // 6. Fix specifically the wifi_dimmer mangled line if missed
    content = content.replace(/reverseTransform:\s*\(v\)\s*=>Math\.round\(v\)\+\s*10\)\s*}/g, "reverseTransform: (v) => Math.round(v) + 10 }");

    if (modified || content !== original) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
        console.log(`[STABILIZED-V10] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file.endsWith('.js')) processFile(fullPath);
    });
}

console.log('--- BOILERPLATE STABILIZER V10: DRIVER RECOVERY ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files stabilized.`);
