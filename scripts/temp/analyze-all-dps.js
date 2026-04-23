const fs = require('fs');
const path = require('path');

// Scan ALL device.js files to extract DP mappings
function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules')) {
                results = results.concat(walkDir(file));
            }
        } else {
            if (file.endsWith('device.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir('drivers');
const dpDatabase = new Map(); // DP -> [usages]

for (const file of files) {
    const driver = path.basename(path.dirname(file));
    const code = fs.readFileSync(file, 'utf8');
    
    // Extract DP mappings pattern
    const dpMappingMatch = code.match(/dpMappings[^{]*{([^}]+(?:{[^}]+}[^}]*)*)/s)      ;
    if (!dpMappingMatch) continue;
    
    const dpBlock = dpMappingMatch[0];
    
    // Extract individual DP entries
    const dpRegex = /(\d+):\s*{([^}]+)}/g;
    let match;
    
    while ((match = dpRegex.exec(dpBlock)) !== null) {
        const dpNum = match[1];
        const dpConfig = match[2];
        
        // Extract capability
        const capMatch = dpConfig.match(/capability:\s*['"]([^'"]+)['"]/);
        const capability = capMatch ? capMatch[1]   :  null     ;
        
        // Extract divisor
        const divMatch = dpConfig.match(/divisor:\s*(\d+)/);
        const divisor = divMatch ? parseInt(divMatch[1] ) : 1      ;
        
        // Extract internal
        const intMatch = dpConfig.match(/internal:\s*['"]([^'"]+)['"]/);
        const internal = intMatch ? intMatch[1]   :  null     ;
        
        if (!dpDatabase.has(dpNum)) {
            dpDatabase.set(dpNum, []);
        }
        
        dpDatabase.get(dpNum).push({
            driver,
            capability,
            divisor,
            internal
        });
    }
}

// Analyze and consolidate
console.log('DP Database Analysis - Top 50 most common DPs:\n');

const sorted = [...dpDatabase.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 50);

for (const [dp, usages] of sorted) {
    const caps = [...new Set(usages.map(u => u.capability).filter(Boolean))];
    const divs = [...new Set(usages.map(u => u.divisor))];
    const ints = [...new Set(usages.map(u => u.internal).filter(Boolean))];
    
    console.log('DP' + dp + ' (' + usages.length + ' drivers):');
    if (caps.length > 0) console.log('  Capabilities: ' + caps.join(', '));
    if (divs.length > 1) console.log('  Divisors: ' + divs.join(', '));
    if (ints.length > 0) console.log('  Internal: ' + ints.join(', '));
}

// Save full database
fs.writeFileSync('dp-database.json', JSON.stringify([...dpDatabase.entries()], null, 2));
console.log('\n Full DP database saved to dp-database.json');
