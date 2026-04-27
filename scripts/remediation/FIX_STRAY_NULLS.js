const fs = require('fs');
const path = require('path');

function processDir(dir) {
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
        if (!content.includes(';')) return;

        // Fix the pattern: (...) : null; where no ? is present before the :
        // We look for lines ending in ) : null; and see if they have ?
        const lines = content.split('\n');
        let changed = false;
        const newLines = lines.map(line => {
            if (line.includes(');') && !line.includes('?')) {
                changed = true;
                return line.replace(');', ');');
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

console.log('Cleaning up stray ";" syntax errors...');
processDir('.');
console.log('Done.');
