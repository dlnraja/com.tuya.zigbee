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

    // 1. Fix botched arrows (= >)
    if (content.includes('= >')) {
        content = content.replace(/=\s+>/g, '=>');
        modified = true;
    }

    // 2. Fix Unbalanced Math.max/min/round
    // Target: const x = Math.max(0, Math.min(100, Math.round(v));
    // We look for 3 openings and only 2 closings before a semicolon
    const mathRegex = /Math\.max\((\d+),\s*Math\.min\((\d+),\s*Math\.round\(([^)]+)\)\s*\);/g;
    if (mathRegex.test(content)) {
        content = content.replace(mathRegex, 'Math.max($1, Math.min($2, Math.round($3)));');
        modified = true;
    }

    // 3. Fix setCountdown unbalanced parens
    const countdownRegex = /Math\.max\((\d+),\s*Math\.min\((\d+),\s*Math\.round\(([^)]+)\)\s*\);/g;
    if (countdownRegex.test(content)) {
        content = content.replace(countdownRegex, 'Math.max($1, Math.min($2, Math.round($3)));');
        modified = true;
    }

    // 4. Fix double-colon from botched V7/V8
    if (content.includes(': :')) {
        content = content.replace(/:\s+:/g, ':');
        modified = true;
    }

    // 5. Fix extra spaces before semicolon
    content = content.replace(/\s+;/g, ';');

    // 6. Fix specifically the UnifiedSwitchBase:1249 pattern if regex #2 missed it
    // because p1 might not be a digit
    content = content.replace(/Math\.max\(0,\s*Math\.min\(100,\s*Math\.round\(([^)]+)\)\s*\);/g, 'Math.max(0, Math.min(100, Math.round($1)));');

    if (modified || content !== original) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
        console.log(`[STABILIZED-V9] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file.endsWith('.js')) processFile(fullPath);
    });
}

console.log('--- REFINEMENT STABILIZER V9: ARROWS AND MATH ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files refined.`);
