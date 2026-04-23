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

    // 1. Fix Missing Const Assignments
    content = content.replace(/(\/\/ A8: NaN Safety[^\n]+\n\s+)const\s+typeof\s+code/g, '$1const errorCode = typeof code');
    content = content.replace(/(\/\/ A8: NaN Safety[^\n]+\n\s+)const\s+(\{[^;]+childLock[^;]+\};)/g, '$1const ATTRS = $2');
    content = content.replace(/(\/\/ A8: NaN Safety[^\n]+\n\s+)const\s+(\{[^;]+networkLed[^;]+\};)/g, '$1const A = $2');

    // 2. Fix Mixin Assignment
    const exportMatch = content.match(/module\.exports\s*=\s*([^;{}\s]+);/);
    if (exportMatch) {
        const mixinName = exportMatch[1];
        const nakedMixinRegex = new RegExp(`(// A8: NaN Safety[^\n]+\\n\\s+)const\\s+\\{`, 'g');
        if (nakedMixinRegex.test(content)) {
            content = content.replace(nakedMixinRegex, `$1const ${mixinName} = {`);
            modified = true;
        }
    }

    // 3. Fix Mangled Math.pow & rounding (ZigbeeDataQuery)
    content = content.replace(/Math\.round\(Math\.pow\(10,\s*\(([^,-]+)\s*-\s*1\) \/ 10000\)\s*;/g, (m, p1) => {
        modified = true;
        return `Math.round(Math.pow(10, (${p1} - 1) / 10000));`;
    });

    // 4. Fix config.scale mangling
    content = content.replace(/safeMultiply\(([^,]+),\s*config\)\)\.scale\)/g, (m, p1) => {
        modified = true;
        return `safeMultiply(${p1}, config.scale))`;
    });

    // 5. Fix undefined lastTime in protocol stats
    content = content.replace(/received:\s*0,\s*lastTime,\s*enabled:\s*true/g, 'received: 0, lastTime: null, enabled: true');

    // 6. Fix Arrow function safeParse
    content = content.replace(/=>\s*Math\.round\(safeParse\(([^)]+)\)\s*,\)/g, (m, p1) => {
        modified = true;
        return `=> Math.round(safeParse(${p1}))`;
    });

    // 7. Fix SonoffTRVZB occupiedHeatingSetpoint
    content = content.replace(/occupiedHeatingSetpoint:Math\.round\(v\)\)\);/g, (m) => {
        modified = true;
        return 'occupiedHeatingSetpoint: Math.round(v) });';
    });

    // 8. Fix generic safeParse multiplier mangling
    content = content.replace(/targetTemp\s*\*safeParse\((\d+)\),\s*(\d+)\)/g, (m, p1, p2) => {
        modified = true;
        return `(targetTemp * ${p1}) / ${p2}`;
    });

    // 9. Fix extra parentheses in setCapabilityValue
    content = content.replace(/device\.setCapabilityValue\(([^)]+)\)\s*\)\.catch\(/g, 'device.setCapabilityValue($1).catch(');

    if (modified || content !== original) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
        console.log(`[STABILIZED] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file.endsWith('.js')) processFile(fullPath);
    });
}

console.log('--- FINAL MASTER STABILIZER V6: THE RESTORATION CONTINUES ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files stabilized.`);
