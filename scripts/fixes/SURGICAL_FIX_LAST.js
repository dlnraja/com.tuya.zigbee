'use strict';
const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
    {
        from: /Math\.round\(\(voltage\s*-\s*2\.0\)\s*\*\s*100\)\)\)\);/g,
        to: 'Math.round((voltage - 2.0) * 100)));'
    },
    {
        from: /Math\.round\(\(voltage\s*-\s*2\.2\)\s*\*\s*100\)\)\)\);/g,
        to: 'Math.round((voltage - 2.2) * 100)));'
    }
];

function walk(dir, callback) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && !file.startsWith('.') && file !== 'quarantine') {
                walk(fullPath, callback);
            }
        } else if (file.endsWith('.js')) {
            callback(fullPath);
        }
    });
}

const rootDirs = ['drivers', 'lib'];
rootDirs.forEach(root => {
    const rootPath = path.join(process.cwd(), root);
    if (!fs.existsSync(rootPath)) return;
    walk(rootPath, (filePath) => {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;
        REPLACEMENTS.forEach(r => {
            let newContent = content.replace(r.from, r.to);
            if (newContent !== content) {
                content = newContent;
                changed = true;
            }
        });
        if (changed) {
            fs.writeFileSync(filePath, content);
            console.log(`[FIXED] ${path.relative(process.cwd(), filePath)}`);
        }
    });
});
