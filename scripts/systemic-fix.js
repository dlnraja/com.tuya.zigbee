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
    let original = content;

    // 1. Fix safeDivide(0x, i) -> 0x
    content = content.replace(/safeDivide\(0x, i\)/g, '0x');
    
    // 2. Fix safeDivide((0x), i) -> 0x
    content = content.replace(/safeDivide\(\(0x\), i\)/g, '0x');

    // 3. Fix safeDivide(s, g) -> s
    content = content.replace(/safeDivide\(s, g\)/g, 's');
    
    // 4. Fix safeDivide(gi, ) -> gi (Wait, it was gi), )
    content = content.replace(/safeDivide\(gi\), /g, 'gi');

    // 5. Fix safeDivide(expected_cluster_id_number, i) -> expected_cluster_id_number
    content = content.replace(/safeDivide\(expected_cluster_id_number, i\)/g, 'expected_cluster_id_number');
    
    // 6. Fix safeDivide(cluster, i) -> cluster
    content = content.replace(/safeDivide\(cluster, i\)/g, 'cluster');

    // 7. Fix safeDivide(marrage, i) -> démarrage (handle the prefix too)
    content = content.replace(/dÃ©safeDivide\(marrage, i\)/g, 'démarrage');
    content = content.replace(/dÃ©safeDivide\(marrage, i\)/g, 'démarrage'); // Double check encoding

    // 8. Fix safeDivide(battery, i) -> battery
    content = content.replace(/safeDivide\(battery, i\)/g, 'battery');

    // 9. Fix safeDivide(failed, i) -> failed
    content = content.replace(/safeDivide\(failed, i\)/g, 'failed');

    // 10. Fix safeDivide(MODULE_NOT_FOUND, i) -> MODULE_NOT_FOUND
    content = content.replace(/safeDivide\(MODULE_NOT_FOUND, i\)/g, 'MODULE_NOT_FOUND');

    // 11. Fix safeMultiply((X, Y)) -> safeMultiply(X, Y)
    content = content.replace(/safeMultiply\(\(([^,]+), ([^,]+)\)\)/g, 'safeMultiply($1, $2)');

    // 12. Fix the regex characters that got corrupted
    // replace(/[:\-safeDivide(0x], g) -> replace(/[:\-0x]/g)
    content = content.replace(/safeDivide\(0x\], gi\), ''\)/g, "0x]/gi, '')");
    content = content.replace(/safeDivide\(0x\], g\), ''\)/g, "0x]/g, '')");
    content = content.replace(/safeDivide\(s\], g\), ''\)/g, "s]/g, '')");
    content = content.replace(/safeDivide\(s\], gi\), ''\)/g, "s]/gi, '')");

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Fixed corruption in ${file}`);
    }
});

console.log('Master Fix complete');
