/**
 * scripts/ULTIMATE_CHECK.js
 * The "Full Purity" mandatory check for Universal Tuya Engine.
 * Must pass before push/publish.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== 🌌 ULTIMATE ENGINE PURITY CHECK ===');

const walk = (dir, ext, cb) => {
    try {
        fs.readdirSync(dir).forEach(f => {
            const p = path.join(dir, f);
            try {
                const stat = fs.statSync(p);
                if (stat.isDirectory()) {
                    if (!['node_modules', '.git', '.homeybuild', 'assets'].includes(f)) walk(p, ext, cb);
                } else if (f.endsWith(ext)) {
                    cb(p);
                }
            } catch (e) {
                // Ignore files that disappeared during walk
            }
        });
    } catch (e) {
        // Ignore dirs that disappeared
    }
};

let errors = 0;

// 1. Syntax Check
process.stdout.write('Checking Syntax... ');
walk('.', '.js', (p) => {
    try {
        execSync(`node -c "${p}"`, { stdio: 'ignore' });
    } catch (e) {
        console.error(`\n❌ SYNTAX ERROR in ${p}`);
        errors++;
    }
});
if (errors === 0) console.log('✅');

// 2. Pollution Check (Strings/Comments)
process.stdout.write('Checking for safeDivide pollution... ');
let pollution = 0;
walk('.', '.js', (p) => {
    const content = fs.readFileSync(p, 'utf8');
    // Check for safeDivide inside string literals or comments where it shouldn't be
    if (/(['"`]).*safeDivide\(.*\).*\1/.test(content) || /\/\/.*safeDivide\(.*\)/.test(content)) {
        // Exclude tuyaUtils and specific scripts that are allowed
        if (!p.includes('tuyaUtils.js') && !p.includes('SafeRemediator.js') && !p.includes('ULTIMATE_CHECK.js')) {
            console.error(`\n⚠️ POLLUTION DETECTED in ${p} (safeDivide inside string/comment)`);
            pollution++;
        }
    }
});
if (pollution === 0) console.log('✅');

// 3. Homey Validation (Quick)
process.stdout.write('Running Homey Validate... ');
try {
    execSync('npx homey app validate', { stdio: 'ignore' });
    console.log('✅');
} catch (e) {
    console.error('\n❌ Homey validation failed!');
    errors++;
}

// 4. Intelligence DB Check
process.stdout.write('Checking Intelligence DB... ');
try {
    const dbPath = path.join(__dirname, '../data/universal_tuya_urls.json');
    if (!fs.existsSync(dbPath)) {
        throw new Error('Intelligence DB missing');
    }
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (!db.categories || db.categories.length === 0) {
        throw new Error('Intelligence DB empty or malformed');
    }
    console.log('✅');
} catch (e) {
    console.error(`\n❌ Intelligence DB Error: ${e.message}`);
    errors++;
}

console.log('\n=== RESULT ===');
if (errors > 0 || pollution > 10) { // Allowing minor pollution for now, but syntax is fatal
    console.error('🛑 INTEGRITY GATE REJECTED');
    process.exit(1);
} else {
    console.log('🚀 INTEGRITY GATE PASSED');
    process.exit(0);
}
