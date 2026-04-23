'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const TARGET_DIRS = ['lib', 'drivers'];

let fixedCount = 0;

const REPLACEMENT_PATTERNS = [
    // 1. Missing assignment in constant declaration (NaN Safety corruption)
    {
        name: 'Missing ATTRS assignment',
        regex: /\/\/ A8: NaN Safety - use safeDivide\/safeMultiply\s+const\s+(\{[^;]+\};)/g,
        replace: 'const ATTRS = $1'
    },
    // 2. Double closing parenthesis in await calls
    {
        name: 'Double closing parenthesis',
        regex: /await\s+([^;)]+\([^)]*\))\)\);/g,
        replace: 'await $1;'
    },
    // 3. Mangled Date.now duration in templates
    {
        name: 'Mangled duration template',
        regex: /\$\{Math\.round\(\(\(Date\.now\(\)\s*-\s*([^)]+)\),\s*1,\s*1000\)\)\)\}s/g,
        replace: '${Math.round((Date.now() - $1) / 1000)}s'
    },
    // 4. Broken safeDivide in if statements (again/better)
    {
        name: 'Unwrap safeDivide(if)',
        regex: /safeDivide\(if\s*\(([^,)]+)\)\)/g,
        replace: 'if ($1)'
    },
    // 5. Mixed up Math.min with ternary and null result
    {
        name: 'Mangled Math.min with ternary',
        regex: /\(([^?]+)\s*\?\s*1\s*:-1,\s*Math\)\.min\(([^,]+),\s*([^)]+)\)\s*:\s*null\s*;/g,
        replace: '($1 ? 1 : -1) * Math.min($2, $3);'
    },
    // 6. Time diff safeDivide messed up
    {
        name: 'Mangled timeDiff',
        regex: /\(([^,]+)\s*-\s*safeParse\(([^)]+)\),\s*1000\)/g,
        replace: 'Math.floor(($1 - $2) / 1000)'
    }
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    REPLACEMENT_PATTERNS.forEach(pattern => {
        if (pattern.regex.test(content)) {
            content = content.replace(pattern.regex, pattern.replace);
            modified = true;
            console.log(`  [PATTERN] Applied: ${pattern.name} in ${path.basename(filePath)}`);
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content);
        fixedCount++;
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
            processFile(filePath);
        }
    }
}

console.log('--- SURGICAL REPAIR V3 START ---');
TARGET_DIRS.forEach(dir => {
    const targetPath = path.join(ROOT_DIR, dir);
    if (fs.existsSync(targetPath)) walkDir(targetPath);
});
console.log(`--- SURGICAL REPAIR V3 COMPLETE (${fixedCount} files fixed) ---`);
