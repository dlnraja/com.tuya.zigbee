/**
 * scripts/fixes/AUTO_SYNTAX_REPAIR.js
 * Specialized tool for "Swiss Cheese" files. 
 * Repeats node -c -> fix -> node -c until clean.
 */
'use strict';

const fs = require('fs');
const { execSync } = require('child_process');

const target = 'drivers/air_purifier_presence_hybrid/device.js';

function fix() {
    for (let i = 0; i < 50; i++) {
        try {
            execSync(`node -c "${target}"`, { stdio: 'pipe' });
            console.log(`✅ ${target} is now clean!`);
            return;
        } catch (e) {
            const output = e.stderr.toString();
            const match = output.match(/:(\d+)\n/);
            if (!match) {
                console.error('Could not find line number in error');
                return;
            }
            const lineNum = parseInt(match[1]);
            let lines = fs.readFileSync(target, 'utf-8').split('\n');
            let line = lines[lineNum - 1];
            console.log(`Fixing line ${lineNum}: ${line.trim()}`);
            // Heuristic fixes
            if (line.includes('Math.round(lux);')) {
                line = line.replace('Math.round(lux);', 'Math.round(lux));');
            } else if (line.includes('Math.round(safeParse(v));')) {
               line = line.replace('Math.round(safeParse(v));', 'Math.round(safeParse(v)));'));
            } else if (line.includes('Math.round(safeParse(lux));')) {
               line = line.replace('Math.round(safeParse(lux));', 'Math.round(safeParse(lux)));'));
            } else if (line.includes('Math.round(safeParse(')) {))
                line = line.replace(/Math\.round\(safeParse\(([^)]+)\)\s*;/, 'Math.round(safeParse($1));');
                // General fallback for missing paren
                if (line.split('(').length > line.split(')').length) {
                    line = line.replace(');', '));');
                }
            } else if (line.includes('safeParse(1), 10000))')) {
                line = line.replace('safeParse(1), 10000))', '1) / 10000))');
            } else {
                // Generic missing paren attempt
                if (line.split('(').length > line.split(')').length) {
                   line = line.replace(');', '));');
                   line = line.replace(')}', ')) }');
                   line = line.replace('),', ')),');
                } else {
                    console.error('No heuristic for this error. Manual intervention needed.');
                    return;
                }
            }
            lines[lineNum - 1] = line;
            fs.writeFileSync(target, lines.join('\n'));
        }
    }
}

fix();
