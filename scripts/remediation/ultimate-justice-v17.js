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

    // 1. Fix mangled catch completions: catch(err => {)) -> catch(err => {
    // and catch(err => {) -> catch(err => {
    const catchMangleRegex = /\.catch\((e|err|error|ex)\s*=>\s*{\)+/g;
    if (catchMangleRegex.test(content)) {
        content = content.replace(catchMangleRegex, '.catch($1 => {');
        modified = true;
    }

    // 2. Fix parseFloat(x).catch(...) error (parseFloat has no catch)
    // Pattern: parseFloat(rounded).catch(...) -> parseFloat(rounded)
    // Actually, it usually meant to catch the setCapabilityValue PROMISE
    // Example: setCapabilityValue('X', parseFloat(y).catch(()=>{}))
    // Should be: setCapabilityValue('X', parseFloat(y)).catch(()=>{})
    const parseFloatCatchRegex = /setCapabilityValue\(([^,]+),\s*parseFloat\(([^)]+)\)\s*\.catch\(([^)]*)\)\s*\)/g;
    if (parseFloatCatchRegex.test(content)) {
        content = content.replace(parseFloatCatchRegex, 'setCapabilityValue($1, parseFloat($2)).catch($3)');
        modified = true;
    }

    // 3. Fix missing ) in setCapabilityValue when catch was wrongly nested
    // Example: setCapabilityValue('X', value.catch(e => { ... });
    // Should be: setCapabilityValue('X', value).catch(e => { ... });
    const nestedCatchRegex = /setCapabilityValue\(([^,]+),\s*([^)]+)\.catch\(([^)]+)\s*=>\s*{/g;
    if (nestedCatchRegex.test(content)) {
        content = content.replace(nestedCatchRegex, 'setCapabilityValue($1, $2).catch($3 => {');
        modified = true;
    }

    // 4. One more pass for the specific ZHAQuirkAdapter patterns if V16 missed them
    if (content.includes(')        : null;')) {
        content = content.replace(/\)\s+:\s+null;/g, ') || null;');
        modified = true;
    }

    if (modified || content !== original) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
        console.log(`[STABILIZED-V17] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file.endsWith('.js')) processFile(fullPath);
    });
}

console.log('--- ULTIMATE JUSTICE V17 ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files stabilized.`);
