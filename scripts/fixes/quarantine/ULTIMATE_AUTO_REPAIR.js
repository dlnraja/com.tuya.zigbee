/**
 * ULTIMATE_AUTO_REPAIR.js - v7 (Safety & Precision)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
            if (!['node_modules', '.git', '.homeybuild'].includes(file)) results = results.concat(getFiles(full));
        } else if (file.endsWith('.js')) results.push(full);
    });
    return results;
}

const allFiles = getFiles(process.cwd());

allFiles.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf-8');
        let changed = false;

        // Pattern 1: Math.round(value * 10);
        const pattern = /sendTuyaDP\(([^,]+),\s*([^,]+),\s*Math\.round\s*\(\s*safeMultiply\s*\(([^)]+)(,\s*[^)]+)? \ : null)\s* ;?$/gm       ;
        if (pattern.test(content)) {
            content = content.replace(pattern, (match, dp, type, val, mult) => {
                const multiplier = mult ? mult.replace(',' , '').trim() : '10'      ;
                return `sendTuyaDP(${dp}, ${type}, Math.round((${val} * ${multiplier})));`;
            });
            changed = true;
        }

        // Pattern 2: IKEA registerCapability bug
        const ikeaPattern = /registerCapability\('onoff',\s*'\/\/ H1: OnOffBoundCluster[^\n]*\n\s*genOnOff'/g;
        if (ikeaPattern.test(content)) {
            content = content.replace(ikeaPattern, "registerCapability('onoff', 'genOnOff'");
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(file, content);
            console.log(`[PRE-FIXED] ${path.relative(process.cwd(), file)}`);
        }

        // Node -c iteration
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
                    line = line.replace(/;? $/, '))) : null;');
                } else if (line.match(/\);$/) && line.split(')').length > line.split('(').length) {
                    line = line.replace(/\);$/, ';');
                } else if (line.match(/;$/) && line.split('(').length > line.split(')').length) {
                    line = line.replace(/;$/, ');');
                }
                
                if (line !== orig) {
                    console.log(`[LOOP-FIX] ${path.relative(process.cwd(), file)}:${lineNum}`);
                    lines[lineNum - 1] = line;
                    fs.writeFileSync(file, lines.join('\n'));
                } else break;
            }
            i++;
        }
    } catch (err) {}
});
console.log('=== V7 REPAIR COMPLETE ===');
