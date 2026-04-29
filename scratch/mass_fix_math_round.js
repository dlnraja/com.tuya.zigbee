const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
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

const targetDirs = ['drivers', 'lib'];

targetDirs.forEach(td => {
    const files = walk(path.join(process.cwd(), td));
    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let changed = false;

        // Patterns to fix common corruption after safeDivide -> safeParse replacement failures
        const replacements = [
            { from: /Math\.round\(safeParse\(([^)]+)\);/g, to: 'Math.round($1);' },
            { from: /Math\.round\(safeParse\(([^)]+), (\d+)\)\);/g, to: 'Math.round(safeParse($1, $2));' },
            { from: /Math\.round\(([^)]+)\)\)/g, to: 'Math.round($1)' },
            { from: /Math\.round\(([^)]+)\/1,\s*(\d+)\)/g, to: 'Math.round($1 / $2)' },
            { from: /Math\.round\(([^)]+),\s*(\d+)\)/g, to: 'Math.round($1)' },
            { from: /const\s+require\(([^)]+)\)/g, to: 'require($1)' },
            { from: /const\s+\(([^)]*)\)\s*=>/g, to: '($1) =>' },
            { from: /const\s+this\./g, to: 'this.' }
        ];

        replacements.forEach(r => {
            const newContent = content.replace(r.from, r.to);
            if (newContent !== content) {
                content = newContent;
                changed = true;
            }
        });

        if (changed) {
            fs.writeFileSync(file, content);
            console.log(`Re-Fixed: ${file}`);
        }
    });
});
