#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

/**
 * check_git_conflicts.js
 * Scans all source files recursively for unresolved git conflict markers
 * (<<<<<<<, =======, >>>>>>>, |||||||)
 * Designed to catch git merge errors before `homey app build` crashes
 *
 * Exit codes: 0 = no conflicts, 1 = conflicts found
 */

const markers = ['<<<<<<< HEAD', '=======', '>>>>>>>', '|||||||'];

function walk(dir) {
    let conflictsFound = 0;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f === 'node_modules' || f === '.git' || f === '.github' || f === '.homeybuild' || f === 'tmp' || f === 'data') continue;
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            conflictsFound += walk(p);
        } else {
            const ext = path.extname(f);
            if (['.js', '.json', '.md', '.yml', '.yaml'].includes(ext)) {
                try {
                    const content = fs.readFileSync(p, 'utf8');
                    const conflictRegex = /^(?:<{7}(?:\s|\b)|={7}(?:\r?\n|$)|>{7}(?:\s|\b)|\|{7}(?:\s|\b))/m;
                    const found = conflictRegex.test(content);

                    if (found) {
                        console.error(`\x1b[31m[ERROR] Unresolved git conflict found in: ${p}\x1b[0m`);
                        const lines = content.split(/\r?\n/);
                        lines.forEach((line, idx) => {
                            if (/^(?:<{7}(?:\s|\b)|={7}$|>{7}(?:\s|\b)|\|{7}(?:\s|\b))/.test(line.trim())) {
                                console.error(`  Line ${idx + 1}: ${line.trim()}`);
                            }
                        });
                        conflictsFound++;
                    }
                } catch (e) {
                    console.error(`Could not read ${p}: ${e.message}`);
                }
            }
        }
    }
    return conflictsFound;
}

console.log('\x1b[36m[VALIDATION] Scanning for unresolved Git conflicts...\x1b[0m');
const totalConflicts = walk(path.join(__dirname, '../..'));

if (totalConflicts > 0) {
    console.error(`\n\x1b[31m[FAILED] Found ${totalConflicts} files with unresolved conflicts.\x1b[0m`);
    process.exit(1);
} else {
    console.log(`\x1b[32m[OK] No git conflicts found in source files.\x1b[0m`);
    process.exit(0);
}
