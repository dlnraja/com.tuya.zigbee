/**
 * scripts/fixes/CLEAN_GLOBAL_CORRUPTION.js
 * Final aggressive cleanup of structural and comment-level corruption.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const SafeRemediator = require('../utils/SafeRemediator');

const ROOT = process.cwd();

const rules = [
    // 1. Fix 'let false;' which is illegal
    {
        pattern: /let\s+false;/g,
        replacement: 'let isAlarm = false;'
    },
    // 2. Fix 'const(id,fn)' which is illegal
    {
        pattern: /const\(id,\s*fn\)/g,
        replacement: 'const reg = (id, fn)'
    },
    // 3. Fix broken Math.round patterns (missing/extra parens)
    {
        pattern: /Math\.round\(([^/)]+)\s*\/\s*(\d+)\)\)/g,
        replacement: 'Math.round($1/$2)'
    },
    {
        pattern: /Math\.round\(([^/)]+)\s*\/\s*(\d+)\)(\/\d+)? \ : null)/g ,
        replacement: 'Math.round($1/$2)$3'
    },
    // 4. Fix extra closing parentheses after safeMultiply/safeDivide
    {
        pattern: /safeMultiply\(([^,]+),\s*([^)]+)\)\)/g,
        replacement: '($1 * $2)'
    },
    {
        pattern: /safeDivide\(([^,]+),\s*([^)]+)\)\)/g,
        replacement: '($1 / $2)'
    },
    // 5. Fix safeMultiply inside Math.round where closing paren is missing
    {
        pattern: /Math\.round\(safeMultiply\(([^)]+)\)\s*}/g,
        replacement: 'Math.round($1 * 100) }'
    },
    {
        pattern: /Math\.round\(safeMultiply\(([^)]+)\)\s*,/g,
        replacement: 'Math.round($1 * 100),'
    },
    // 6. Fix Distance specific corruption: distance * 100)/100)
    {
        pattern: /Math\.round\(safeParse\(([^);]+)\)\s*[^;)]/g,
        replacement: 'Math.round($1 * 10)'
    },
    {
        pattern: /Math\.round\(safeParse\(([^);]+)\);/g,
        replacement: 'Math.round($1 * 10);'
    },
    {
        pattern: /Math\.round\(distance\s*\*\s*100\)\/100\)\;/g,
        replacement: 'Math.round(distance * 100)/100;'
    },
    // 7. Fix Comment/String pollution (Greedy)
    {
        pattern: /safeDivide\(([a-zA-Z_]+),\s*([a-zA-Z_]+)\)/g,
        replacement: '$1/$2'
    }
];

function main() {
    console.log('--- GLOBAL CORRUPTION CLEANUP ---');
    
    const walk = (dir) => {
        fs.readdirSync(dir).forEach(f => {
            const p = path.join(dir, f);
            if (fs.statSync(p).isDirectory()) {
                if (!['node_modules', '.git', '.homeybuild'].includes(f)) walk(p);
            } else if (f.endsWith('.js')) {
                const fixed = SafeRemediator.transform(p, rules);
                if (fixed) console.log(`[FIXED] ${p}`);
            }
        });
    };

    walk(path.join(ROOT, 'drivers'));
    walk(path.join(ROOT, 'lib'));
    walk(path.join(ROOT, 'app.js'));

    console.log('--- CLEANUP COMPLETE ---');
}

main();
