'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const TARGET_DIRS = ['lib', 'drivers'];

let fixedFiles = 0;

function balanceParentheses(line) {
    if (line.includes('//') || line.includes('/*')) return line; // Skip comments
    
    let opens = (line.match(/\(/g) || []).length;
    let closes = (line.match(/\)/g) || []).length;
    
    if (opens === closes) return line;
    
    let result = line.trimEnd();
    if (opens > closes) {
        // Add missing closes before semicolon if present
        if (result.endsWith(';')) {
            const body = result.slice(0, -1);
            result = body + ')'.repeat(opens - closes) + ';';
        } else {
            result = result + ')'.repeat(opens - closes);
        }
        console.log(`  [BALANCED] ${opens} vs ${closes}`);
    } else {
        // Too many closes? risky to remove, but let's try if it ends in )))
        if (result.endsWith(')))') || result.endsWith(')));')) {
             while (opens < (result.match(/\)/g) || []).length && result.endsWith(')')) {
                 result = result.slice(0, -1);
             }
             if (line.endsWith(';')) result += ';';
        }
    }
    return result;
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i];
        
        // 1. Fix the comma operator mangling that happened in V11/V12
        if (lines[i].includes('safeParse(percentage,100), specs).capacity')) {
            lines[i] = lines[i].replace('(safeParse(percentage,100), specs).capacity', 'safeMultiply(safeDivide(percentage, 100), specs.capacity)');
            modified = true;
        }

        if (lines[i].includes('Math.round(((6500 -kelvin,4500), 1000))')) {
             lines[i] = lines[i].replace('Math.round(((6500 -kelvin,4500), 1000))', 'Math.round(safeMultiply(safeDivide(6500 - kelvin, 4500), 1000))');
             modified = true;
        }

        // 2. Universal Parenthesis Balancing for critical lines
        if (lines[i].includes('Math.round') || lines[i].includes('setCapabilityValue') || lines[i].includes('return Math.')) {
            const balanced = balanceParentheses(lines[i]);
            if (balanced !== lines[i]) {
                lines[i] = balanced;
                modified = true;
            }
        }
        
        // 3. Fix the "uptime*10))), 10)" from diagnostic report
        if (lines[i].includes('uptime*10)))')) {
            lines[i] = lines[i].replace(/Math\.round\(safeDivide\(uptime\*10\)\)\),\s*10\);/g, 'Math.round(uptime);');
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        fixedFiles++;
        console.log(`[STABILIZED-V14] ${path.relative(ROOT_DIR, filePath)}`);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) walk(fullPath);
        else if (file.endsWith('.js')) processFile(fullPath);
    });
}

console.log('--- ULTIMATE SYNTAX HEALER V14 ---');
TARGET_DIRS.forEach(dir => {
    const p = path.join(ROOT_DIR, dir);
    if (fs.existsSync(p)) walk(p);
});
console.log(`\nOperation finished. ${fixedFiles} files stabilized.`);
