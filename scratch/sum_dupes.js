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
            if (file === 'driver.flow.compose.json' || file === 'driver.compose.json') {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const files = getFiles('drivers');
const idToFiles = {};

files.forEach(file => {
    try {
        const raw = fs.readFileSync(file, 'utf8');
        const content = JSON.parse(raw);
        
        let flowSections = [];
        if (file.endsWith('driver.flow.compose.json')) {
            flowSections = [content.triggers, content.conditions, content.actions];
        } else if (content.flow) {
            flowSections = [content.flow.triggers, content.flow.conditions, content.flow.actions];
        }

        flowSections.forEach(section => {
            if (Array.isArray(section)) {
                section.forEach(card => {
                    if (card && card.id) {
                        if (!idToFiles[card.id]) idToFiles[card.id] = [];
                        idToFiles[card.id].push(file);
                    }
                });
            }
        });
    } catch (e) { }
});

for (const id in idToFiles) {
    if (idToFiles[id].length > 1) {
        // Ignore IDs that are validly shared (if any exist in Homey, but usually not for custom flows)
        console.log(`DUPE: ${id} (${idToFiles[id].length} files)`);
    }
}
