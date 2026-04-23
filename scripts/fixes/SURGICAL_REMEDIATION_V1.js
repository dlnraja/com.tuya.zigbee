'use strict';
const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
    // 1. Fix corrupted uptime/analytics pattern: Math.round(safeDivide(uptime*10))), 10)
    {
        from: /Math\.round\(safeDivide\(([^,)]+)\)\)\),\s*10\)/g,
        to: 'Math.round(safeDivide($1, 10))'
    },
    // 2. Fix corrupted modelId ternary: return A : null;
    {
        from: /return\s+([^;?]+)\s+:\s+null;/g,
        to: 'return $1 || null;'
    },
    // 3. Fix corrupted Math.pow/safeDivide call chain: safeDivide(bytes, Math.pow)(k, i)
    {
        from: /safeDivide\(([^,]+),\s*Math\.pow\)\(([^,]+),\s*([^)]+)\)/g,
        to: 'safeDivide($1, Math.pow($2, $3))'
    },
    // 4. Fix corrupted modulo/division pattern: (seconds %safeParse(86400), 3600)
    {
        from: /\(([^%]+)\s*%safeParse\((\d+)\),\s*(\d+)\)/g,
        to: '(($1 % $2) / $3)'
    },
    // 5. Fix corrupted gang match: const gangMatch =safeDivide(capability.match(, gang)(\d+)/);
    {
        from: /const\s+gangMatch\s*=safeDivide\(capability\.match\(,\s*gang\)\(\\d\+\)\/\);/g,
        to: 'const gangMatch = capability.match(/gang(\\d+)/);'
    },
    // 6. Fix lone Math.round extra parentheses: Math.round(X))), 10)
    {
        from: /Math\.round\(([^,)]+)\)\)\),\s*10/g,
        to: 'Math.round($1)'
    },
    // 7. Fix corrupted require calls: const require(...)
    {
        from: /const\s+require\(['"]([^'"]+)['"]\)/g,
        to: "require('$1')"
    },
    // 8. Fix corrupted this. calls: const this.
    {
        from: /const\s+this\./g,
        to: 'this.'
    }
];

function walk(dir, callback) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && !file.startsWith('.')) {
                walk(fullPath, callback);
            }
        } else if (file.endsWith('.js')) {
            callback(fullPath);
        }
    });
}

console.log('--- SURGICAL REMEDIATION V1 ---');
const rootDirs = ['drivers', 'lib'];
let totalFixed = 0;

rootDirs.forEach(root => {
    const rootPath = path.join(process.cwd(), root);
    if (!fs.existsSync(rootPath)) return;
    
    walk(rootPath, (filePath) => {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        let changed = false;

        REPLACEMENTS.forEach(r => {
            const newContent = content.replace(r.from, r.to);
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

console.log(`\nRemediation complete. Total files fixed: ${totalFixed}`);
