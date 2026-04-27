const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('lib');
let errors = 0;

files.forEach(file => {
    try {
        execSync(`node --check "${file}"`, { stdio: 'ignore' });
    } catch (e) {
        console.log(`❌ Syntax Error: ${file}`);
        errors++;
    }
});

console.log(`\nFound ${errors} syntax errors in lib/`);
