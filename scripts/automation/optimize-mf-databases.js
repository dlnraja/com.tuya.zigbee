const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log("========================================");
console.log(" MF Database & JSON Optimizer");
console.log("========================================");

let totalOptimized = 0;

// 1. Optimize driver.compose.json (Static MFs)
const composeFiles = glob.sync('drivers/*/driver.compose.json');
composeFiles.forEach(file => {
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        let modified = false;

        if (data.zigbee) {
            // Deduplicate and sort manufacturerName
            if (Array.isArray(data.zigbee.manufacturerName)) {
                const originalLen = data.zigbee.manufacturerName.length;
                const unique = [...new Set(data.zigbee.manufacturerName)]
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
                
                if (unique.length === 0) {
                    delete data.zigbee.manufacturerName;
                    modified = true;
                } else if (JSON.stringify(unique) !== JSON.stringify(data.zigbee.manufacturerName)) {
                    data.zigbee.manufacturerName = unique;
                    modified = true;
                }
            }

            // Deduplicate and sort productId
            if (Array.isArray(data.zigbee.productId)) {
                const unique = [...new Set(data.zigbee.productId)]
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
                if (unique.length === 0) {
                    delete data.zigbee.productId;
                    modified = true;
                } else if (JSON.stringify(unique) !== JSON.stringify(data.zigbee.productId)) {
                    data.zigbee.productId = unique;
                    modified = true;
                }
            }
        }

        if (modified) {
            fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
            totalOptimized++;
        }
    } catch (e) {
        console.error(`Error processing ${file}: ${e.message}`);
    }
});
console.log(`Optimized ${totalOptimized} static driver.compose.json files.`);

// 2. Optimize lazyloading databases (e.g. data/fingerprints.json)
function optimizeLazyDB(dbPath) {
    if (!fs.existsSync(dbPath)) return;
    try {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        
        // Assume data is an object with manufacturerNames as keys, or an array of fingerprint objects
        let optimizedData;
        if (Array.isArray(data)) {
            // Remove full duplicates and sort by manufacturerName then productId
            const uniqueMap = new Map();
            data.forEach(fp => {
                if (!fp.manufacturerName) return;
                const key = `${fp.manufacturerName}_${fp.productId || ''}`;
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, fp);
                } else {
                    // merge properties if needed, here we just keep the first or combine
                    Object.assign(uniqueMap.get(key), fp);
                }
            });
            optimizedData = Array.from(uniqueMap.values()).sort((a, b) => {
                const mCmp = (a.manufacturerName || '').localeCompare(b.manufacturerName || '');
                if (mCmp !== 0) return mCmp;
                return (a.productId || '').localeCompare(b.productId || '');
            });
        } else if (typeof data === 'object' && data !== null) {
            // Sort keys alphabetically
            optimizedData = {};
            Object.keys(data).sort((a, b) => a.localeCompare(b)).forEach(k => {
                optimizedData[k] = data[k];
            });
        }

        if (optimizedData && JSON.stringify(data) !== JSON.stringify(optimizedData)) {
            fs.writeFileSync(dbPath, JSON.stringify(optimizedData, null, 2) + '\n', 'utf8');
            console.log(`Optimized lazyloading DB: ${dbPath}`);
        } else {
            console.log(`Lazyloading DB already optimized: ${dbPath}`);
        }
    } catch (e) {
        console.error(`Error processing DB ${dbPath}: ${e.message}`);
    }
}

optimizeLazyDB('data/fingerprints.json');
optimizeLazyDB('lib/tuya/fingerprints.json');
optimizeLazyDB('driver-mapping-database.json');

console.log("MF Optimization completed.");
