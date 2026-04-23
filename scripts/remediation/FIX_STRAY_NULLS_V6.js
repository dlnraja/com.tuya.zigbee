const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file === 'node_modules' || file === '.git') continue;
            processDir(fullPath);
        } else if (file.endsWith('.js')) {
            processJs(fullPath);
        }
    }
}

function processJs(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/);
        let changed = false;
        const newLines = lines.map(line => {
            if (line.match(/\)\s*:\s*null\s*;/)) {
                if (line.trim().endsWith(': null;')) {
                     const partBefore = line.substring(0, line.lastIndexOf(':'));
                     const sanitized = partBefore.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""').replace(/\/[^\/]+\//g, '//');
                     if (!sanitized.includes('?')) {
                         changed = true;
                         return line.replace(/\)\s*:\s*null\s*;/, ');');
                     }
                }
            }
            return line;
        });

        if (changed) {
            fs.writeFileSync(filePath, newLines.join('\n'));
            console.log(`Fixed syntax in: ${filePath}`);
        }
    } catch (e) {
        console.error(`Error processing ${filePath}: ${e.message}`);
    }
}

const target = process.argv[2] || '.';
console.log(`Cleaning up stray ": null;" syntax errors in ${target}...`);
processDir(target);
if (target === '.') processDir('.github');
console.log('Done.');
