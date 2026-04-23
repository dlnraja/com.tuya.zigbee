const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (file.endsWith('.json')) {
            processJson(fullPath);
        }
    }
}

function processJson(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('titleFormatted')) return;

        // Pattern to remove [[device]] and common leading/trailing prepositions
        // Matches: "on [[device]]", "sur [[device]]", "[[device]] ", " [[device]]"
        // Also handles "[[device]]" at the start or end of string.
        const patterns = [
            / (on|sur|op|de|sur) \[\[device\]\]/g,
            /\[\[device\]\] (on|sur|op|de|sur) /g,
            /\[\[device\]\]/g
        ];

        let changed = false;
        let obj = JSON.parse(content);

        function traverse(o) {
            for (let key in o) {
                if (typeof o[key] === 'object' && o[key] !== null) {
                    traverse(o[key]);
                } else if (key === 'titleFormatted' && typeof o[key] === 'string') {
                    let val = o[key];
                    for (const p of patterns) {
                        val = val.replace(p, '');
                    }
                    // Clean up double spaces
                    val = val.replace(/  +/g, ' ').trim();
                    if (val !== o[key]) {
                        o[key] = val;
                        changed = true;
                    }
                } else if (typeof o[key] === 'string' && key !== 'titleFormatted') {
                    // Also check nested titleFormatted objects
                    if (key === 'en' || key === 'fr' || key === 'nl' || key === 'de') {
                        // Check parent key
                        // This is tricky without parent context, let's just check if parent has titleFormatted
                    }
                }
            }
        }
        
        // Manual string replacement in the whole content to be thorough for all localizations
        let newContent = content.replace(/"titleFormatted"\s*:\s*\{([^}]+)\}/g, (match, body) => {
            return '"titleFormatted": {' + body.replace(/"(en|fr|nl|de|it|es)"\s*:\s*"([^"]+)"/g, (m, lang, val) => {
                let newVal = val;
                for (const p of patterns) {
                    newVal = newVal.replace(p, '');
                }
                newVal = newVal.replace(/  +/g, ' ').trim();
                return `"${lang}": "${newVal}"`;
            }) + '}';
        });
        
        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent);
            console.log(`Processed: ${filePath}`);
        }
    } catch (e) {
        console.error(`Error processing ${filePath}: ${e.message}`);
    }
}

console.log('Cleaning up [[device]] in titleFormatted...');
processDir('drivers');
processJson('app.json');
console.log('Done.');
