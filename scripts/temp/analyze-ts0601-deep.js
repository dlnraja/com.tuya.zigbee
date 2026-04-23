const fs = require('fs');
const path = require('path');

// Identify PURE Tuya DP drivers vs hybrid/ZCL drivers
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
            if (file.endsWith('driver.compose.json')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir('drivers');
const analysis = [];

for (const file of files) {
    try {
        const txt = fs.readFileSync(file, 'utf8');
        const d = JSON.parse(txt);
        const driver = path.basename(path.dirname(file));
        
        if (!d.zigbee) continue;
        
        const pids = d.zigbee.productId || [];
        if (!pids.includes('TS0601')) continue;
        
        // Check device.js
        const deviceFile = file.replace('driver.compose.json', 'device.js');
        let usesTuyaDP = false;
        let usesMultiGangEndpoints = false;
        
        if (fs.existsSync(deviceFile)) {
            const deviceCode = fs.readFileSync(deviceFile, 'utf8');
            usesTuyaDP = deviceCode.includes('dpMappings') || deviceCode.includes('TuyaEF00');
            
            // Check for multi-gang patterns
            usesMultiGangEndpoints = /onoff\.gang|endpoint.*[2-8]|this\.zclNode\.endpoints\[/i.test(deviceCode);
        }
        
        const hasEndpoints = d.zigbee.endpoints ? true : false      ;
        const epCount = hasEndpoints ? Object.keys(d.zigbee.endpoints ).length : 0      ;
        
        analysis.push({
            driver,
            hasEndpoints,
            epCount,
            usesTuyaDP,
            usesMultiGangEndpoints,
            category: usesTuyaDP && !usesMultiGangEndpoints ? 'PURE_TUYA_DP' : 
                     usesMultiGangEndpoints ? 'MULTI_GANG_ZCL' : 
                     'HYBRID/UNKNOWN'
        });
    } catch(e) {
        // Skip
    }
}

console.log('TS0601 Driver Analysis:\n');

console.log('PURE TUYA DP (endpoints should be removed):');
analysis.filter(a => a.category === 'PURE_TUYA_DP').forEach(a => {
    console.log('  ' + a.driver + ' (endpoints: ' + a.hasEndpoints + ')');
});

console.log('\nMULTI-GANG ZCL (endpoints MUST be kept):');
analysis.filter(a => a.category === 'MULTI_GANG_ZCL').forEach(a => {
    console.log('  ' + a.driver + ' (endpoints: ' + a.epCount + ')');
});

console.log('\nHYBRID/UNKNOWN (needs manual review):');
analysis.filter(a => a.category === 'HYBRID/UNKNOWN').forEach(a => {
    console.log('  ' + a.driver + ' (endpoints: ' + a.hasEndpoints + ', usesTuyaDP: ' + a.usesTuyaDP + ')');
});

// Save to file for further processing
fs.writeFileSync('ts0601-analysis.json', JSON.stringify(analysis, null, 2));
console.log('\n Saved full analysis to ts0601-analysis.json');
