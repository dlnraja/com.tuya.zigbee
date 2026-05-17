const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair';
const DIRS_TO_SCAN = [
    path.join(ROOT_DIR, '.homeycompose', 'flow'),
    path.join(ROOT_DIR, 'drivers'),
    path.join(ROOT_DIR, 'app.json')
];

function processFile(filePath) {
    if (!filePath.endsWith('.json')) return;

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        let json;
        try {
            json = JSON.parse(content);
        } catch (e) {
            console.error(`Error parsing JSON in ${filePath}: ${e.message}`);
            return;
        }

        let modified = false;

        function cleanObject(obj) {
            if (typeof obj !== 'object' || obj === null) return;

            if (Array.isArray(obj)) {
                obj.forEach(cleanObject);
                return;
            }

            // Remove titleFormatted
            if ('titleFormatted' in obj) {
                console.log(`Removing titleFormatted from ${filePath}`);
                delete obj.titleFormatted;
                modified = true;
            }

            // Remove [[device]] tokens from strings (especially title)
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    if (obj[key].includes('[[device]]')) {
                        console.log(`Removing [[device]] from ${key} in ${filePath}`);
                        obj[key] = obj[key].replace(/\[\[device\]\]\s*/g, '').trim();
                        modified = true;
                    }
                } else if (typeof obj[key] === 'object') {
                    // Check translations
                    for (const lang in obj[key]) {
                        if (typeof obj[key][lang] === 'string' && obj[key][lang].includes('[[device]]')) {
                            console.log(`Removing [[device]] from ${key}.${lang} in ${filePath}`);
                            obj[key][lang] = obj[key][lang].replace(/\[\[device\]\]\s*/g, '').trim();
                            modified = true;
                        }
                    }
                    cleanObject(obj[key]);
                }
            }
        }

        cleanObject(json);

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
            console.log(`Successfully updated ${filePath}`);
        }
    } catch (e) {
        console.error(`Error processing ${filePath}: ${e.message}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'tmp' && file !== 'node_modules') {
                walkDir(fullPath);
            }
        } else {
            processFile(fullPath);
        }
    }
}

console.log('Starting Flow Card Validation Cleanup...');
DIRS_TO_SCAN.forEach(dir => {
    if (fs.existsSync(dir)) {
        if (fs.statSync(dir).isDirectory()) {
            walkDir(dir);
        } else {
            processFile(dir);
        }
    } else {
        console.warn(`Path not found: ${dir}`);
    }
});
console.log('Cleanup complete.');
