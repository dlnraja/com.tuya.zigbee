const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../../drivers');

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file === 'device.js' || file === 'driver.js') {
            fixFile(fullPath);
        }
    }
}

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Surgical fix for the battery line with multiple missing parentheses
    content = content.replace(/const battery = Math\.min\(100,\s*Math\.max\(0,\s*Math\.round\(([^;]+);/g, (match, p1) => {
        // Count open and closed parentheses in p1
        const open = (p1.match(/\(/g) || []).length;
        const closed = (p1.match(/\)/g) || []).length;
        // We need to close p1, plus the 3 outer functions (min, max, round)
        // Wait, p1 is already inside Math.round(.
        // So we need: Math.min(100, Math.max(0, Math.round( p1 )))
        // So total open = 3 + open.
        // total closed = closed + ???
        // We need (3 + open) === (closed + X) -> X = 3 + open - closed.
        const needed = 3 + open - closed;
        return `const battery = Math.min(100, Math.max(0, Math.round(${p1.trim()}${')'.repeat(needed)});`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed: ${filePath}`);
    }
}

walk(driversDir);
console.log('Final remediation v6 complete.');
