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

    // 1. EMERGENCY UNDO of botched ternary fixes
    // Remove : null; where it follows ?. or || incorrectly
    content = content.replace(/(\w+)\s*=\s*([^?;]+\?\.\(\)[^?;]*)\s*:\s*null\s*;/g, '$1 = $2;');
    content = content.replace(/(\w+)\s*=\s*([^?;]+\?\.[^?;]*)\s*:\s*null\s*;/g, '$1 = $2;');

    // 2. Fix specific case where it swallowed the 'if' on next line
    content = content.replace(/:\s*null\s*;if\s*\(/g, '; if (');

    // 3. Selective Ternary Fix (only if it has spaces around ? and it's NOT optional chaining)
    // and specifically for known mangled patterns like 'lastSeen'
    content = content.replace(/(const lastSeen\s*=\s*device\.getStoreValue\s+\?\s+[^;]+);/g, (m, p1) => {
        if (!p1.includes(':')) {
            modified = true;
            return `${p1} : null;`;
        }
        return m;
    });

    // 4. Fix Object Initializer properties (stay with : null if needed, but ensure no duplication)
    // { prop: null, prop: null } -> { prop: null }
    content = content.replace(/(\w+):\s*null,\s*\1:\s*null,/g, '$1: null,');

    // 5. Fix safeDivide inside setCapabilityValue (re-re-enforce)
    content = content.replace(/this\.setCapabilityValue\(([^)]+)\)\s*\)\.catch\(/g, 'this.setCapabilityValue($1).catch(');

    // 6. Fix specifically mangled UnifiedSwitchBase:239 pattern
    content = content.replace(/const profile = this\.getDeviceProfile\?\.\(\) \|\| this\._deviceProfile\s+:\s*null;/g, 'const profile = this.getDeviceProfile?.() || this._deviceProfile;');

    if (modified || content !== original) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
        console.log(`[STABILIZED-V8] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file.endsWith('.js')) processFile(fullPath);
    });
}

console.log('--- EMERGENCY RECOVERY STABILIZER V8: THE REVERSAL ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files recovered.`);
