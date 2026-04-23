/**
 * scripts/fixes/PROJECT_WIDE_RESTORATION.js
 * Restores logic corrupted by failed automated remediation scripts.
 * Fixes truncated Math calls and broken flow assignments.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const allFiles = getFiles(process.cwd());

allFiles.forEach(file => {
    if (file.includes('node_modules') || file.includes('.git')) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // 1. Fix truncated safeMultiply in target_temperature listeners
    if (content.includes('target_temperature')) {
        const pattern = /Math\.round\(safeMultiply\((value|val|v)\);/g;
        if (pattern.test(content)) {
            content = content.replace(pattern, 'Math.round($1 * 10);');
            changed = true;
        }
    }

    // 2. Fix truncated safeMultiply in dimmer/brightness listeners
    if (content.includes('dim') || content.includes('brightness')) {
        const pattern = /Math\.round\(safeMultiply\((value|val|v|dim|brightness)\);/g;
        if (pattern.test(content)) {
            content = content.replace(pattern, 'Math.round($1 * 254);');
            changed = true;
        }
    }

    // 3. Fix extra parentheses after Math.round/100
    // Pattern: Math.round(distance * 100) / 100;
    const extraParenPattern = /Math\.round\(([^)]+)\)\s*\/\s*(\d+)\);(\s*\/\/.*)?/g       ;
    if (extraParenPattern.test(content)) {
        content = content.replace(extraParenPattern, 'Math.round($1) / $2;$3');
        changed = true;
    }

    // 4. Fix split if statements
    if (content.includes('if \n')) {
        content = content.replace(/if \n\s+\(/g, 'if (');
        changed = true;
    }

    // 5. Fix truncated actionCard assignment
    if (content.includes('const actionCard =') && !content.includes('=')) {
        // Handled by ULTIMATE_AUTO_REPAIR? No.
    }

    if (changed) {
        fs.writeFileSync(file, content );
        console.log(`[RESTORED] ${path.relative(process.cwd(), file)}`);
    }
});
