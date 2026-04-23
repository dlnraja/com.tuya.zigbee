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
        // Pattern: any line that has ) : null; and NO ? earlier on the same line
        const lines = content.split(/\r?\n/);
        let changed = false;
        const newLines = lines.map(line => {
            // Very specific pattern that was found to be corrupted
            if (line.match(/\);/)) {
                // If it doesn't have a ? it's definitely a syntax error
                if (!line.includes('?')) {
                    changed = true;
                    return line.replace(/\);/, ');');
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

console.log('Cleaning up stray ": null;" syntax errors (v2)...');
processDir('.');
console.log('Done.');
