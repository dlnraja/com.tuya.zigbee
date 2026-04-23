'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

function fixFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix 1: Missing parens in Math/safe calls
    // regex to find things like Math.round(safeMultiply(a,b));
    // and replace with Math.round(safeMultiply(a,b));
    const patterns = [
        /(Math\.round\([^;]+)(\);)/g,
        /(safeMultiply\([^;]+)(\);)/g,
        /(safeParse\([^;]+)(\);)/g,
        /(safeDivide\([^;]+)(\);)/g
    ];

    patterns.forEach(p => {
        content = content.replace(p, (match, p1, p2) => {
            const open = (p1.match(/\(/g) || []).length;
            const close = (p1.match(/\)/g) || []).length;
            if (open > close) {
                changed = true;
                return p1 + ')'.repeat(open - close) + p2;
            }
            return match;
        });
    });

    // Fix 2: Ternary missing : branch
    // value > 100 ? something()  : null; -> value > 100 ? something()        : null;
    content = content.replace(/(\? [^  : null;:]+)(;)/g, (match, p1, p2) => {
        // Skip optional chaining ?.
        if (p1.includes('?.')) return match       ;
        changed = true;
        return p1 + ' ' + p2;
    });

    if (changed) {
        fs.writeFileSync(file, content);
        return true;
    }
    return false;
}

function run() {
    console.log('Running Smart Maintainer...');
    const walk = (dir) => {
        const files = fs.readdirSync(dir );
        files.forEach(f => {
            const p = path.join(dir, f);
            if (fs.statSync(p).isDirectory()) walk(p);
            else if (f.endsWith('.js')) {
                if (fixFile(p)) console.log('Fixed:', p);
            }
        });
    };
    walk(DRIVERS_DIR);
}

run();
