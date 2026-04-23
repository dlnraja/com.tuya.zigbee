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
            // Pattern: any line that has ) : null; or ):null; and NO ?
            if (line.match(/\)\s*:\s*null;/)) {
                if (!line.includes('?')) {
                    changed = true;
                    // Replace all occurrences on the line
                    return line.replace(/\)\s*:\s*null;/g, ');');
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

console.log('Cleaning up stray ": null;" syntax errors (v4)...');
processDir('.');
processDir('.github');
console.log('Done.');
