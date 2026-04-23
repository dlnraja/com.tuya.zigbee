'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const TARGET_DIRS = ['lib', 'drivers'];

let fixedCount = 0;
let errorCount = 0;

const REPLACEMENT_PATTERNS = [
    // 1. Math.min/max mangled ternary
    // Pattern: (val > baseline ? 1 :-1, Math).min(jump, 2) : null ;
    {
        name: 'Mangled Math.min ternary',
        regex: /\(([^?]+)\s*\?\s*1\s*:-1,\s*Math\)\.min\(([^,]+),\s*([^)]+)\)\s*:\s*null\s*;/g,
        replace: '($1 ? 1 : -1) * Math.min($2, $3);'
    },
    // 2. safeDivide mangled ternary
    // Pattern: (now - lastReading.timestamp, 1000) : 60 ;
    {
        name: 'Mangled timeDiff safeDivide',
        regex: /\(([^,]+)\s*-\s*safeParse\(([^)]+)\),\s*1000\)/g,
        replace: 'Math.floor(($1 - $2) / 1000)'
    },
    // 3. safeMultiply mangled penalty
    // Pattern: safeMultiply(score - (hoursSinceLast, 4))
    {
        name: 'Mangled safeMultiply penalty',
        regex: /safeMultiply\(([^,]+)\s*-\s*\(([^,]+),\s*(\d+)\)\)/g,
        replace: '($1 - ($2 * $3))'
    },
    // 4. safeDivide in regex forward slashes
    {
        name: 'Regex forward slash corruption',
        regex: /safeDivide\(if \(,\s*([^)]+)\)-([^/]+)\//g,
        replace: 'if (/$1-$2/'
    },
    // 5. Unbalanced safeDivide with if
    {
        name: 'Unbalanced safeDivide(if)',
        regex: /safeDivide\(if \(\s*([^)]+)\)\)/g,
        replace: 'if ($1)'
    },
    // 6. Generic safeParse/safeDivide comma mess
    // Pattern: safeDivide(change, Math.max(this._luxBaseline,1), 100) -> (change / Math.max(baseline, 1)) * 100
    {
        name: 'Mangled safeDivide with multiplier',
        regex: /safeDivide\(([^,]+),\s*Math\.max\(([^,]+),\s*1\),\s*100\)/g,
        replace: '(($1 / Math.max($2, 1)) * 100)'
    },
    // 7. Math.round with extra comma
    {
        name: 'Math.round comma fix',
        regex: /Math\.round\(([^,)]+),\s*100\)\)/g,
        replace: 'Math.round($1)'
    },
    // 8. Date.now comma corruption
    {
        name: 'Date.now comma fix',
        regex: /Date\.now\(,\s*1000\)/g,
        replace: 'Date.now()'
    },
    // 9. let 1; corruption
    {
        name: 'let 1 loop fix',
        regex: /let 1;/g,
        replace: 'let i = 1;'
    },
    // 10. IntelligentDeviceAdapter configKey fix
    // Pattern: ? 'noBattery' ; -> ? 'noBattery' : null;
    {
        name: 'Adapter configKey fix',
        regex: / \? 'noBattery'\s+;/g,
        replace: " ? 'noBattery' : null;"
    },
    // 11. EnergyManager corruption (specific example)
    // Pattern: safeMultiply(this._energyTotal, 0.001) but maybe mangled
    {
        name: 'safeMultiply decimal fix',
        regex: /safeMultiply\(([^,]+),\s*0\.001\)/g,
        replace: '($1 * 0.001)'
    },
    // 12. ZigbeeHelpers genOnOff fix
    {
        name: 'ZigbeeHelpers genOnOff fix',
        regex: /''genOnOff'\s+genOnOff':/g,
        replace: "'genOnOff':"
    },
    // 13. safeMultiply with decimal and parens
    // Pattern: safeMultiply(this._dischargeRate, 0)(.7 + newRate * 0.3)
    {
        name: 'Mangled dischargeRate calculation',
        regex: /safeMultiply\(([^,]+),\s*0\)\(\.7\s*\+\s*([^)]+)\)/g,
        replace: '($1 * (0.7 + $2))'
    },
    // 14. PerformanceOptimizer token fix
    // Pattern: ) ; at end of file or something
    {
        name: 'PerformanceOptimizer extra paren',
        regex: /return\s+([^;]+)\)\s+;/g,
        replace: 'return $1;'
    }
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;

    REPLACEMENT_PATTERNS.forEach(pattern => {
        if (pattern.regex.test(content)) {
            content = content.replace(pattern.regex, pattern.replace);
            modified = true;
            console.log(`  [PATTERN] Applied: ${pattern.name}`);
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content);
        fixedCount++;
        console.log(`[FIXED] ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (file.endsWith('.js')) {
            try {
                processFile(filePath);
            } catch (err) {
                errorCount++;
                console.error(`[ERROR] Processing ${filePath}: ${err.message}`);
            }
        }
    }
}

console.log('--- SURGICAL REPAIR V2 START ---');
TARGET_DIRS.forEach(dir => {
    const targetPath = path.join(ROOT_DIR, dir);
    if (fs.existsSync(targetPath)) {
        walkDir(targetPath);
    }
});

console.log('--- SURGICAL REPAIR V2 COMPLETE ---');
console.log(`Files Modified: ${fixedCount}`);
console.log(`Errors encountered: ${errorCount}`);
