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
            // Pattern: something followed by ) : null; at the end of the line
            // Crucially, the : null; is NOT part of a valid ternary.
            // A simple heuristic: if it ends in ) : null; and we find ) : null;
            // let's check if there is a ' ? ' or '? ' or ' ?' before it that is NOT inside a regex/string.
            // But even simpler: if it's doc.replace(...) : null; it's clearly wrong.
            
            if (line.match(/\)\s*:\s*null\s*;/)) {
                // Check if it's a corrupted line: something) : null;
                // If the part before the ) doesn't have a matching ? for this :, it's wrong.
                // We'll just look for common corrupted patterns.
                if (line.includes('.replace(') || line.includes('.set(') || line.includes('.log(') || line.includes(' = ')) {
                     // If it has ) : null; at the end, and we can't find a clear ternary start
                     // Let's just remove it if it's at the very end.
                     if (line.trim().endsWith(';')) {
                         // Check for ? outside of regex/strings
                         const partBefore = line.substring(0, line.lastIndexOf(':'));
                         // Remove strings and regexes from partBefore
                         const sanitized = partBefore.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""').replace(/\/[^\/]+\//g, '//');
                         if (!sanitized.includes('?')) {
                             changed = true;
                             return line.replace(/\)\s*:\s*null\s*;/, ');');
                         }
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

console.log('Cleaning up stray ";" syntax errors (v5)...');
processDir('.');
processDir('.github');
console.log('Done.');
