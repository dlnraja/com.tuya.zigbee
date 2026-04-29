const fs = require('fs');
const path = require('path');

const root = process.cwd();

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    results = results.concat(list.map(f => path.join(dir, f)));
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules')) {
                results = results.concat(walk(file));
            }
        }
    });
    return results.filter(f => f.endsWith('.js'));
}

const files = walk(path.join(root, 'drivers')).concat(walk(path.join(root, 'lib')));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Pattern 1: (a / b), c -> safeMultiply(safeDivide(a, b, c)
    content = content.replace(/\(\(safeDivide\(([^,]+),safeMultiply\(([^)]+)\)\),\s*([^)]+)\)\)/g, 'safeMultiply(safeDivide($1, $2, $3)');

    // Pattern 2: ((Math.random() * jitterRange) * 2) -> Math.random() * jitterRange * 2) ? // Actually looking at 'delay +=((Math.random() * jitterRange) * 2) - jitterRange;' ;
    // It was likely 'delay += (Math.random() * jitterRange * 2) - jitterRange;'
    content = content.replace(/safeMultiply\(\(Math\.random\(\),\s*([^)]+)\)\s*\*\s*([^)]+)\)/g, '(Math.random() * $1, $2)');

    // Pattern 3: v * 100) -> v * 100
    content = content.replace(/safeMultiply\(safeParse\(([^]+)\)\),\s*([^)]+)\)\)/g, '($1 * $2)');

    // Pattern 4: (a,(b * c) -> safeMultiply(safeDivide(a, b, c)
    content = content.replace(/\(safeDivide\(([^)]+)\),safeMultiply\(([^)]+)\),\s*([^)]+)\)/g, 'safeMultiply(safeDivide($1, $2, $3)');

    // Pattern 5: (result - threshold * 100 -> common error
    content = content.replace(/safeMultiply\(\(([^)]+)\),\s*([^)]+)\)/g, '($1 * $2)');

    // Pattern 6: v -> missing arg. If it's the only arg, assume 1 or check context.
    // In many cases it's just meant to be numeric conversion.
    // If followed by / or *, it's definitely broken.
    
    // Pattern 7: correct broken ternary
    // (Improved from before)
    content = content.replace(/(\?\? \s*[^ ;? ]+ )\s*:\s*null\s*([;)])/g, '$1$2');
    
    // Fix the "device sleeping?" case specifically
    content = content.replace(/\(device sleeping\? \)\s*['"])\s*:\s*null\s*;/g, '(device sleeping? )");');

    if (content !== original) {
        console.log(`Fixing ${file}` );
        fs.writeFileSync(file, content);
    }
});
