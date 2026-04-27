'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const TARGET_DIRS = ['lib', 'drivers'];

let fixedFiles = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    let modified = false;

    // A. Fix Missing Mixin Constants (NaN Safety corruption)
    // Pattern: module.exports = Name; ... const {
    const exportMatch = content.match(/module\.exports\s*=\s*([^;{}\s]+);/);
    if (exportMatch) {
        const mixinName = exportMatch[1];
        // Only if we find a naked const { following the NaN safety comment
        const nakedConstRegex = new RegExp(`(// A8: NaN Safety - use safeDivide/safeMultiply\\s+)const\\s+\\{`, 'g');
        if (nakedConstRegex.test(content)) {
            content = content.replace(nakedConstRegex, `$1const ${mixinName} = {`);
            modified = true;
        }
    }

    // B. Fix Solar Sync / Math Jumps (NaturalLight pattern)
    // hour -safeParse(6), 6 -> (hour - 6) / 6
    content = content.replace(/\(hour\s*-\s*safeParse\((\d+)\),\s*(\d+)\)/g, (m, p1, p2) => {
        modified = true;
        return `((hour - ${p1}) / ${p2})`;
    });

    // C. Fix Math.round/Math.floor multiplier/precision corruption
    // Math.round(val *safeParse(100), 100) -> Math.round(val * 100) / 100
    content = content.replace(/Math\.(round|floor)\(([^,*]+)\s*\*safeParse\((\d+)\),\s*\d+\)/g, (m, func, val, p1) => {
        modified = true;
        return `Math.${func}(${val.trim()} * ${p1}) / ${p1}`;
    });

    // D. Fix Double Parentheses in await/writeAttributes
    // await thermo.writeAttributes({occupiedHeatingSetpoint:Math.round(v)}));
    // Note: very surgical to avoid breaking nested objects
    content = content.replace(/(await\s+[^;]+)\)\s*\)\s*;/g, (m, p1) => {
        // Count opening vs closing in p1
        const open = (p1.match(/\(/g) || []).length;
        const close = (p1.match(/\)/g) || []).length;
        if (close > open) { // Too many closing in original line part
             // This logic might be complex, let's use a simpler check for common mangles
        }
        return m;
    });
    
    // Simpler D: match specific mangled endings
    content = content.replace(/Math\.round\(([^)]+)\)\)\s*\)\s*;/g, (m, p1) => {
        modified = true;
        return `Math.round(${p1}));`;
    });
    content = content.replace(/parseFloat\(value\)\|\|\s*1\),\s*2\)\)\s*;/g, (m) => {
       modified = true;
       return `Math.round(parseFloat(value) || 1);`; // Ewelink pattern fix
    });

    // E. Fix Mangled timeDiff in IntelligentSensorInference
    // (last.timestamp -safeParse(first.timestamp), 1000)
    content = content.replace(/\(([^,-]+)\s*-\s*safeParse\(([^)]+)\),\s*1000\)/g, (m, p1, p2) => {
        modified = true;
        return `Math.floor((${p1.trim()} - ${p2.trim()}) / 1000)`;
    });

    // F. Fix Mangled ternary jumps with Math.min/max (SensorInference pattern)
    // + (rawTemp > this._lastValidTemp ? 1 :-1, Math).min(jump, 2) : null ;
    content = content.replace(/\(\s*([^\s?]+)\s*>\s*([^\s?]+)\s*\?\s*1\s*:\s*-1,\s*Math\)\.min\(([^,]+),\s*([^)]+)\)\s+:\s+null/g, (m, p1, p2, p3, p4) => {
        modified = true;
        return `(${p1} > ${p2} ? 1 : -1) * Math.min(${p3}, ${p4})`;
    });

    // G. Fix discharge rate mangling (BatteryInference pattern)
    // safeMultiply(this._dischargeRate, 0)(.7 + newRate * 0.3)
    content = content.replace(/safeMultiply\(([^,]+),\s*0\)\(\.7\s*\+\s*([^)]+)\)/g, (m, p1, p2) => {
        modified = true;
        return `(${p1} * (0.7 + ${p2}))`;
    });

    // H. Fix score penalty mangling (MaintenancePrediction pattern)
    // safeMultiply(score - (hoursSinceLast, 4))
    content = content.replace(/safeMultiply\(([^,]+)\s*-\s*\(([^,]+),\s*(\d+)\)\)/g, (m, p1, p2, p3) => {
        modified = true;
        return `(${p1} - (${p2} * ${p3}))`;
    });

    // I. Fix SonoffSensorMixin regex safeDivide corruption
    // safeDivide(if (, SNZB)-04/.test(pid)
    content = content.replace(/safeDivide\(if\s*\(,\s*([^)]+)\)-([^/]+)\//g, (m, p1, p2) => {
        modified = true;
        return `if (/${p1}-${p2}/`;
    });

    // J. Fix trailing semicolons in ternary assignments (IntelligentDeviceAdapter pattern)
    // ? 'noBattery'  : null;
    content = content.replace(/\?\s*'([^']+)'\s*;/g, (m, p1) => {
        modified = true;
        return `? '${p1}';`;
    });

    // K. Fix mangled let 1; loops
    content = content.replace(/\/\/ A8: NaN Safety.*\s+let 1;/g, (m) => {
        modified = true;
        return 'for (let i = 1;';
    });
    // Another variant: let 1; i <=
    content = content.replace(/let\s+1\s*;/g, 'let i = 1;');

    if (modified) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
        console.log(`[REPAIRED] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.js')) {
            processFile(fullPath);
        }
    });
}

console.log('--- MASTER STABILIZER V4: QUANTUM SURGERY ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files stabilized.`);
