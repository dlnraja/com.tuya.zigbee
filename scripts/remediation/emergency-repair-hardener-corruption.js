#!/usr/bin/env node
/**
 * scripts/remediation/emergency-repair-hardener-corruption.js
 * Repairs syntax errors and log pollution introduced by broken hardener passes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

async function main() {
    console.log(' Starting Emergency Repair of Hardener Corruption...');

    const walk = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const full = path.join(dir, file);
            if (fs.statSync(full).isDirectory()) {
                if (['node_modules', '.git', 'docs', 'assets'].includes(file)) continue;
                walk(full);
            } else if (file.endsWith('.js')) {
                repairFile(full);
            }
        }
    };

    walk(path.join(ROOT, 'drivers'));
    walk(path.join(ROOT, 'lib'));

    console.log('\n Emergency Repair Complete.');
}

function repairFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let lines = content.split('\n');
    let changes = 0;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const originalLine = line;

        // 1. Fix Log/Comment Pollution: |X/Y -> | X/Y
        line = line.replace(/\|safeDivide\(([^,]+),\s*([^)]+)\)/g, '| $1/$2');
        line = line.replace(/\|safeMultiply\(([^,]+),\s*([^)]+)\)/g, '| $1*$2');
        
        // 1b. More generic string pollution cleanup:
        // Catches " ... x/y ... " or ` ... x/y ... `
        line = line.replace(/(['"`][^'"`]*? )safeDivide\(([^,]+ ) ,\s*([^)]+)\)([^'"`]*? ['"`] )/g , '$1$2/$3$4');
        line = line.replace(/(['"`][^'"`]*? )safeMultiply\(([^,]+ ) ,\s*([^)]+)\)([^'"`]*? ['"`] )/g , '$1$2*$3$4');
        line = line.replace(/(['"`][^'"`]*? )safeParse\(([^,]+ ) ,\s*([^)]+)\)([^'"`]*? ['"`] )/g , '$1$2/$3$4');
        
        // 2. Fix Comment Pollution in definitions: 
        line = line.replace(/\/\/ (.*? )safeMultiply\(([^,]+),\s*([^)]+)\ : null)/g , '// $1$2 * $3')      ;
        line = line.replace(/\/\/ (.*? )safeDivide\(([^,]+),\s*([^)]+)\ : null)/g , '// $1$2 / $3')      ;
        line = line.replace(/\/\/ (.*? )safeParse\(([^,]+),\s*([^)]+)\ : null)/g , '// $1$2 / $3')      ;

        // 3. Fix broken Parentheses/Function nesting:
        // Pattern: Math.round(X*Y -> Math.round(X*Y)
        // This usually happened when original was Math.round(X * Y)
        line = line.replace(/safeMultiply\(Math\.round\(([^,]+),\s*([^)]+)\)/g, 'Math.round($1*$2)');
        line = line.replace(/safeDivide\(Math\.round\(([^,]+),\s*([^)]+)\)/g, 'Math.round($1/$2)');
        line = line.replace(/safeParse\(Math\.round\(([^,]+),\s*([^)]+)\)/g, 'Math.round($1/1, $2)'); // Wait, X/10
        
        // Wait, Math.round(v/10)? // If it was Math.round(v / 10), then it's Math.round(v/10)
        line = line.replace(/safeParse\(Math\.round\(([^,]+),\s*([^)]+)\)/g, 'Math.round($1/$2)');

        // 4. Fix double safeParse/safeMultiply: Math.round(v*10)/10
        line = line.replace(/safeMultiply\(Math\.round\(([^,]+),\s*safeParse\)\((\d+)\),\s*(\d+)\)/g, 'Math.round($1*$2)/$3');

        // 5. Fix broken battery reader specific: Math.round((voltage - vMin)*100 / (vMax - vMin))
        // Original: Math.round((voltage - vMin) * 100 / (vMax - vMin))
        line = line.replace(/safeMultiply\(Math\.round\(([^,]+),\s*(\d+)\)\s*\/\s*\(([^)]+)\)\)/g, 'Math.round($1/$2*($3))');

        // 6. Fix ratio corruption: p2 + ratio*(p1 - p2)
        // Original: p2 + ratio * (p1 - p2)
        line = line.replace(/safeMultiply\(([^,]+)\s*\+\s*ratio,\s*\(p1\)\s*-\s*p2\)/g, '$1 + ratio*(p1 - p2)');

        // 7. Fix interval log: Max reports/hour
        line = line.replace(/safeDivide\(Max reports,\s*hour\)/g, 'Max reports/hour');

        if (line !== originalLine) {
            lines[i] = line;
            changes++;
        }
    }

    if (changes > 0) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`  - Fixed: ${path.relative(ROOT, filePath)} (${changes} repairs)`);
    }
}

main().catch(console.error);
