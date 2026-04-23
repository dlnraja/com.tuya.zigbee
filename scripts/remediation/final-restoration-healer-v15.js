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

    // 1. Fix '= ==' typo
    if (content.includes('= ==')) {
        content = content.replace(/= ==/g, '===');
        modified = true;
    }

    // 2. Fix invalid object shorthand { 1, 2 }
    if (content.includes('{ 1, 2 }')) {
        // Context aware: if it's for timeout or lastState, set to nulls
        content = content.replace(/{ 1, 2 }/g, '{ 1: null, 2: null }');
        modified = true;
    }

    // 3. Fix semicolon inside ternary object
    // Pattern: ? { a: 1 }; : super.X
    if (content.includes('};')) {
        const ternaryObjRegex = /(\?\s*{[^}]+});(\s*:)/g;
        if (ternaryObjRegex.test(content)) {
            content = content.replace(ternaryObjRegex, '$1$2');
            modified = true;
        }
    }

    // 4. Fix missing parenthesis in triggerButtonPress (from experience)
    if (content.includes('setTimeout(() => this._tryReadBattery() *')) {
        content = content.replace(/setTimeout\(\(\) => this\._tryReadBattery\(\) \* (\d+)\);/g, 'setTimeout(() => this._tryReadBattery(), $1);');
        modified = true;
    }
    
    // 5. Fix safeParse decimals
    // Some lines have safeParse(attrs.activePower , 10) suggesting divisor 10
    // But it looks like setCapabilityValue(..., parseFloat(attrs.activePower , 10).catch(...))
    // Which is missing the ) for safeParse AND for setCapabilityValue
    if (content.includes('parseFloat(attrs.')) {
        content = content.replace(/parseFloat\(attrs\.(\w+)\s*,\s*(\d+)\)/g, 'safeParse(attrs.$1, $2)');
        modified = true;
    }

    if (modified || content !== original) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
        console.log(`[STABILIZED-V15] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file.endsWith('.js')) processFile(fullPath);
    });
}

console.log('--- FINAL RESTORATION HEALER V15 ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files stabilized.`);
