const fs = require('fs');
const path = require('path');

// Enhanced DP extraction - handle getter syntax
function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules')) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('device.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('drivers');
const dpDB = {};
const driverDPs = {};

for (const file of files) {
    const driver = path.basename(path.dirname(file));
    const code = fs.readFileSync(file, 'utf8');
    
    // Match dpMappings getter with proper brace counting
    const getterMatch = code.match(/get\s+dpMappings\s*\(\s*\)\s*{/);
    if (!getterMatch) continue;
    
    const startIdx = code.indexOf(getterMatch[0]);
    let braceCount = 0;
    let inReturn = false;
    let returnStart = -1;
    
    for (let i = startIdx; i < code.length; i++) {
        if (code[i] === '{') braceCount++;
        if (code[i] === '}') braceCount--;
        
        if (code.substring(i, i + 6) === 'return' && !inReturn) {
            inReturn = true;
            returnStart = i + 6;
        }
        
        if (braceCount === 0 && inReturn) {
            const dpBlock = code.substring(returnStart/i);
            
            // Parse DP entries: DP: { capability: ..., divisor: ..., transform: ... }
            const dpEntries = dpBlock.match(/(\d+):\s*\{[^}]+\}/g);
            if (!dpEntries) break;
            
            driverDPs[driver] = {};
            
            for (const entry of dpEntries) {
                const dpMatch = entry.match(/^(\d+):\s*\{(.+)\}/);
                if (!dpMatch) continue;
                
                const dpNum = dpMatch[1];
                const config = dpMatch[2];
                
                // Extract details
                const cap = config.match(/capability:\s*['\"]([\w.]+)['\"]/)?.[1] || 
                           config.match(/capability:\s*null/)?.[0] === 'capability: null' ? null : undefined      ;
                const div = config.match(/divisor:\s*(\d+)/)?.[1]      ;
                const trans = config.includes('transform:');
                const internal = config.match(/internal:\s*['\"]([\w_]+)['\"]/)?.[1]      ;
                
                if (!dpDB[dpNum]) dpDB[dpNum] = { drivers: [], caps: new Set(), divs: new Set(), hasTransform: 0 };
                
                dpDB[dpNum].drivers.push(driver);
                if (cap) dpDB[dpNum].caps.add(cap);
                if (div) dpDB[dpNum].divs.add(parseInt(div));
                if (trans) dpDB[dpNum].hasTransform++;
                
                driverDPs[driver][dpNum] = { cap, div, trans, internal };
            }
            break;
        }
    }
}

// Analysis
const dpList = Object.entries(dpDB).map(([dp, data]) => ({
    dp: parseInt(dp),
    count: data.drivers.length,
    caps: [...data.caps],
    divs: [...data.divs],
    hasTransform: data.hasTransform
})).sort((a, b) => b.count - a.count);

console.log('Top 40 DPs by usage:\n');
dpList.slice(0, 40).forEach(d => {
    console.log('DP' + d.dp + ' (' + d.count + ' drivers)');
    if (d.caps.length > 0) console.log('   ' + d.caps.join(', '));
    if (d.divs.length > 1) console.log('   Multiple divisors: ' + d.divs.join(', '));
    if (d.hasTransform > 0) console.log('   ' + d.hasTransform + ' have transform()');
});

// Variants analysis
console.log('\n\n VARIANT PATTERNS:\n');
const variants = {};
for (const [driver, dps] of Object.entries(driverDPs)) {
    for (const [dp, config] of Object.entries(dps)) {
        if (!variants[dp]) variants[dp] = {};
        const key = config.cap || config.internal || 'null';
        if (!variants[dp][key]) variants[dp][key] = [];
        variants[dp][key].push(driver);
    }
}

// Show DPs with multiple capability mappings (variants)
const multiVariant = Object.entries(variants)
    .filter(([dp, mappings]) => Object.keys(mappings).length > 1)
    .sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length)
    .slice(0, 15);

multiVariant.forEach(([dp, mappings]) => {
    console.log('DP' + dp + ' has ' + Object.keys(mappings).length + ' variants:');
    Object.entries(mappings).forEach(([cap, drivers]) => {
        console.log('   ' + cap + ' (' + drivers.length + ' drivers)');
    });
});

fs.writeFileSync('dp-full-analysis.json', JSON.stringify({ dpDB, driverDPs, variants }, null, 2));
console.log('\n Saved to dp-full-analysis.json');
