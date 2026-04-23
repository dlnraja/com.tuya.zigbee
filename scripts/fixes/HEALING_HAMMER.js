/**
 * HEALING_HAMMER.js - The final nuclear remediation tool.
 * Surgically repairs the most persistent and hidden corruption patterns.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    fs.readdirSync(dir).forEach(file => {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
            if (!['node_modules', '.git', '.homeybuild'].includes(file)) results = results.concat(getFiles(full));
        } else if (file.endsWith('.js')) results.push(full);
    });
    return results;
}

const allFiles = getFiles(path.join(process.cwd(), 'drivers'));

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let changed = false;

    // Pattern 1: Truncated safe(Multiply|Parse) calls with missing parens
    // Pattern: Math.round(val);  -> Math.round(val * 10));
    content = content.replace(/Math\.round\s*\(\s*safe(Parse|Multiply)\s*\(([^)]+)\)\s*;\s*$/gm, "Math.round(safe$1($2 * 10));");
    // Pattern: Math.round(val * 10); -> Math.round(val * 10));
    content = content.replace(/Math\.round\s*\(\s*safe(Parse|Multiply)\s*\(([^)]+,\s*[^)]+)\)\s*;\s*$/gm, "Math.round(safe$1($2));");
    // Pattern 2: Truncated sendTuyaDP
    // Pattern: sendTuyaDP(1, 2, Math.round(v * 10)); -> sendTuyaDP(1, 2, Math.round(v * 10)));
    content = content.replace(/sendTuyaDP\s*\(([^,]+),\s*([^,]+),\s*Math\.round\s*\(\s*safeMultiply\s*\(([^)]+)\)\s*;\s*$/gm, "sendTuyaDP($1, $2, Math.round($3)));"));

    // Pattern 3: Unclosed try blocks at end of methods
    // try { ...
    //   this.log('...');
    // } catch (e) {}  <-- missing
    // this.log(...)
    // }
    const truncatedTry = /try\s*\{\s*\n\s*const card[^{}]*if \(card\) \{[^{}]*\}\s*\n\s*this\.log\('\[FLOW\][^\n]*'\);\s*\n\s*\}\s*$/gm;
    // This is too risky, I'll use iterative fix instead.

    if (content !== fs.readFileSync(file, 'utf-8')) {
        fs.writeFileSync(file, content);
        console.log(`[HEALED] ${path.relative(process.cwd(), file)}`);
    }

    // Iterative Syntax Fix (The "Hammer" loop)
    let i = 0;
    while (i < 5) {
        try {
            execSync(`node -c "${file}"`, { stdio: 'pipe' });
            break;
        } catch (e) {
            const output = e.stderr.toString();
            const match = output.match(/:(\d+)\n/);
            if (!match) break;
            const lineNum = parseInt(match[1]);
            const lines = fs.readFileSync(file, 'utf-8').split('\n');
            let line = lines[lineNum - 1];
            if (!line) break;
            const orig = line;

            if (line.includes('sendTuyaDP') && line.split('(').length > line.split(')').length) {
                line = line.replace(/;? $/ , ')));');
            } else if (line.includes('Math.round') && line.split('(').length > line.split(')').length) {
                line = line.replace(/;? $/, ');');
            } else if (line.trim() === '}' && output.includes('Missing catch or finally')) {
                // Insert missing catch
                lines[lineNum - 1] = '    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }';
            }
            if (lines[lineNum - 1] !== orig || line !== orig) {
                if (line !== orig) lines[lineNum - 1] = line;
                fs.writeFileSync(file, lines.join('\n'));
                console.log(`[HAMMER-FIX] ${path.relative(process.cwd(), file)}:${lineNum}`);
            } else break;
        }
        i++;
    }
});
console.log('=== NUCLEAR HEALING COMPLETE ===');
