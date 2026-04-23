'use strict';
const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
    // 1. Double const: const X = const X = or var = const card =
    {
        from: /const\s+(\w+)\s*=\s*const\s+\1\s*=/g,
        to: 'const $1 ='
    },
    {
        from: /=\s*const\s+\w+\s*=\s*this\.homey\.flow/g,
        to: '= this.homey.flow'
    },
    // 2. setCapabilityValue missing paren before .catch (handles nested parseFloat/Math)
    {
        from: /setCapabilityValue\(([^,]+),\s*((?:parseFloat|Math\.\w+|Number|safeParse|safeDivide|safeMultiply)\([^)]+\))\s*\.catch/g,
        to: 'setCapabilityValue($1, $2).catch'
    },
    // 3. Math.max/min/round missing paren before .catch or extra parens
    {
        from: /(Math\.(?:max|min|round|pow)\((?:[^()]+|\([^()]*\))+\))\.catch/g,
        to: '$1.catch'
    },
    // Nested Math missing paren: Math.max(A, Math.min(B, C);
    {
        from: /(Math\.(?:max|min|round|pow)\((?:[^()]+|\([^()]*\))+\))\s*;/g,
        to: '$1;'
    },
    {
        from: /(Math\.(?:max|min|round|pow)\((?:[^()]+|\([^()]*\))+\))\s*\)\s*;/g,
        to: '$1;'
    },
    // 4. One-liner callback missing closing paren for outer call
    {
        from: /=>\s*(this\.setCapabilityValue\([^)]+\)\.catch\(\(\)\s*=>\s*{\s*}\s*\))\s*;/g,
        to: '=> $1);'
    },
    // 5. Double catch closing parens: .catch(...) ) )
    {
        from: /\.catch\(\(\)\s*=>\s*{\s*}\s*\)\s*\)\s*\)\s*;/g,
        to: '.catch(() => { });'
    },
    // 5. Missing closing paren in Math.round: Math.round(X; -> Math.round(X);
    {
        from: /Math\.round\(([^);]+);/g,
        to: 'Math.round($1);'
    },
    // 6. trigger(this tokens, {})
    {
        from: /\.trigger\(this\s+tokens,/g,
        to: '.trigger(this, tokens,'
    },
    // 7. corrupted sendTuyaDPCommand missing paren
    {
        from: /sendTuyaDPCommand\(([^,]+),\s*([^,)]+)\);/g,
        to: 'sendTuyaDPCommand($1, $2);'
    },
    // 8. lastState: { 1, 2 }
    {
        from: /lastState:\s*{\s*(\d+)\s*,\s*(\d+)\s*}/g,
        to: 'lastState: { $1: null, $2: null }'
    },
    // 9. const 'string';
    {
        from: /const\s+['"]([^'"]+)['"]\s*;/g,
        to: "const driverId = '$1';"
    }
];

function walk(dir, callback) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && !file.startsWith('.') && file !== 'quarantine') {
                walk(fullPath, callback);
            }
        } else if (file.endsWith('.js')) {
            callback(fullPath);
        }
    });
}

console.log('--- MASTER SYNTAX REPAIR V3 ---');
const rootDirs = ['drivers', 'lib'];
let totalFixed = 0;

rootDirs.forEach(root => {
    const rootPath = path.join(process.cwd(), root);
    if (!fs.existsSync(rootPath)) return;
    
    walk(rootPath, (filePath) => {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        REPLACEMENTS.forEach(r => {
            let newContent = content.replace(r.from, r.to);
            if (newContent !== content) {
                content = newContent;
                changed = true;
            }
        });

        if (changed) {
            fs.writeFileSync(filePath, content);
            console.log(`[FIXED] ${path.relative(process.cwd(), filePath)}`);
            totalFixed++;
        }
    });
});

console.log(`\nMaster Repair V3 complete. Total files fixed: ${totalFixed}`);
