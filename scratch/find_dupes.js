const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(fullPath));
        } else {
            if (file === 'driver.flow.compose.json') {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const files = getFiles('drivers');
console.log(`Found ${files.length} files`);

files.forEach(file => {
    try {
        const raw = fs.readFileSync(file, 'utf8');
        // Handle potential comments or BOM
        const content = JSON.parse(raw);
        const ids = new Set();
        const duplicates = [];

        ['triggers', 'conditions', 'actions'].forEach(section => {
            if (content[section]) {
                content[section].forEach(card => {
                    if (ids.has(card.id)) {
                        duplicates.push(card.id);
                    }
                    ids.add(card.id);
                });
            }
        });

        if (duplicates.length > 0) {
            console.log(`Duplicates in ${file}:`, duplicates);
        }
    } catch (e) {
        console.error(`Error parsing ${file}: ${e.message}`);
    }
});
