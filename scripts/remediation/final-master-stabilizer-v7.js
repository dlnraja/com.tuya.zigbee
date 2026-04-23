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

    // 1. Fix Missing Const Assignments (errorCode, ATTRS, A)
    content = content.replace(/(\/\/ A8: NaN Safety[^\n]+\n\s+)const\s+typeof\s+code/g, '$1const errorCode = typeof code');
    content = content.replace(/(\/\/ A8: NaN Safety[^\n]+\n\s+)const\s+(\{[^;]+childLock[^;]+\};)/g, '$1const ATTRS = $2');
    content = content.replace(/(\/\/ A8: NaN Safety[^\n]+\n\s+)const\s+(\{[^;]+networkLed[^;]+\};)/g, '$1const A = $2');

    // 2. Fix Dangling Ternaries (missing : branch)
    // Pattern: const x = someCheck ? await someCall()  : null;
    // We look for ? followed by something then  : null; without :
    content = content.replace(/(\w+)\s*=\s*([^?;]+\?\s*[^?;]+)\s*;\s*/g, (m, p1, p2) => {
        if (!p2.includes(':')) {
            modified = true;
            return `${p1} = ${p2} : null;`;
        }
        return m;
    });

    // 3. Fix Property Names without values in Object initializers
    // Pattern: { propName, ... } where propName is not defined in scope.
    // Common mangled vars: batteryValue, lastBatteryUpdate, responseTime, method, lastDataReceived, currentDriver, recommendedDriver, isCorrect
    const mangledVars = [
        'batteryValue', 'lastBatteryUpdate', 'batteryManager', 
        'responseTime', 'method', 'lastDataReceived',
        'currentDriver', 'recommendedDriver', 'isCorrect',
        'lastTime'
    ];
    mangledVars.forEach(v => {
        const regex = new RegExp(`,\\s*${v},\\s*`, 'g');
        if (regex.test(content)) {
            content = content.replace(regex, `, ${v}: null, `);
            modified = true;
        }
        const regexStart = new RegExp(`{\\s*${v},\\s*`, 'g');
        if (regexStart.test(content)) {
            content = content.replace(regexStart, `{ ${v}: null, `);
            modified = true;
        }
    });

    // 4. Fix Unbalanced Math/Rounding in Math.max/min (UnifiedSwitchBase style)
    // Math.max(0, Math.min(100, Math.round(brightness));
    content = content.replace(/Math\.max\(([^,]+),\s*Math\.min\(([^,]+),\s*Math\.round\(([^)]+)\)\s*(?!\))\);/g, (m, p1, p2, p3) => {
        modified = true;
        return `Math.max(${p1}, Math.min(${p2}, Math.round(${p3})));`;
    });
    // And for setCountdown
    content = content.replace(/Math\.max\(([^,]+),\s*Math\.min\(([^,]+),\s*Math\.round\(([^)]+)\)\s*(?!\))\);/g, (m, p1, p2, p3) => {
        modified = true;
        return `Math.max(${p1}, Math.min(${p2}, Math.round(${p3})));`;
    });

    // 5. Fix extra parentheses in setCapabilityValue calls
    content = content.replace(/device\.setCapabilityValue\(([^)]+)\)\s*\)\.catch\(/g, 'device.setCapabilityValue($1).catch(');
    content = content.replace(/this\.setCapabilityValue\(([^)]+)\)\s*\)\.catch\(/g, 'this.setCapabilityValue($1).catch(');

    // 6. Fix config.scale mangling (re-enforce)
    content = content.replace(/safeMultiply\(([^,]+),\s*config\)\)\.scale\)/g, (m, p1) => {
        modified = true;
        return `safeMultiply(${p1}, config.scale))`;
    });

    // 7. Clean up extra spaces around semicolons (often artifact of regex)
    content = content.replace(/\s+;/g, ';');

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

console.log('--- FINAL MASTER STABILIZER V7: THE STRUCTURAL FIX ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files stabilized.`);
