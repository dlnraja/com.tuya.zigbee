const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '../lib');

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

const files = walk(libDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Pattern 1: regex corruption /...safeDivide(something, i)
    // This looks like it was meant to be part of a regex string but got caught in a global replace
    const regexCorruption = /\/([^/]*?)safeDivide\((.*?), i\)([^/]*?)\//g;
    if (regexCorruption.test(content)) {
        content = content.replace(regexCorruption, (match, before, inside, after) => {
            // Restore what looks like it was there before. 
            // Often 'inside' contains the original text that was partially replaced.
            // But sometimes it's just 'marrage' for 'démarrage'.
            // For now, I'll try to be surgical or just log them.
            console.log(`Potential Regex Corruption in ${file}: ${match}`);
            return match; // Don't replace blindly yet
        });
    }

    // Pattern 2: safeDivide in strings "dÃ©safeDivide(marrage, i)"
    // This is even worse.
});

// For DiagnosticAPI.js specifically, I'll fix it manually as I have the content.
const diagPath = path.join(libDir, 'diagnostics/DiagnosticAPI.js');
if (fs.existsSync(diagPath)) {
    let diagContent = fs.readFileSync(diagPath, 'utf8');
    diagContent = diagContent.replace(/\/safeDivide\(expected_cluster_id_number, i\)/g, '/expected_cluster_id_number/');
    diagContent = diagContent.replace(/\/Does not exist safeDivide\(cluster, i\)/g, '/Does not exist cluster/');
    diagContent = diagContent.replace(/\/Zigbee est en cours de dÃ©safeDivide\(marrage, i\)/g, '/Zigbee est en cours de démarrage/');
    diagContent = diagContent.replace(/\/Could not read safeDivide\(battery, i\)/g, '/Could not read battery/');
    diagContent = diagContent.replace(/\/reporting safeDivide\(failed, i\)/g, '/reporting failed/');
    diagContent = diagContent.replace(/\/safeDivide\(MODULE_NOT_FOUND, i\)/g, '/MODULE_NOT_FOUND/');
    
    // Also fix line 163: safeMultiply(errorRatio, 50)
    diagContent = diagContent.replace(/safeMultiply\(\(errorRatio, 50\)\)/g, 'safeMultiply(errorRatio, 50)');
    diagContent = diagContent.replace(/safeMultiply\(\(warningRatio, 20\)\)/g, 'safeMultiply(warningRatio, 20)');

    fs.writeFileSync(diagPath, diagContent);
    console.log('Fixed DiagnosticAPI.js');
}
