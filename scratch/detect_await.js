const fs = require('fs');

function findAwaitOutsideAsync(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let currentFunctionAsync = false;
    let braceLevel = 0;
    let inFunction = false;

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        // Match function definitions
        const funcMatch = line.match(/(async\s+)?(function\s+\w+|[\w\$]+\s*\(.*? \ )\s*\{|[\w\$]+\s*=\s*\(.*? \ )\s*=>|[\w\$]+\s*=\s*async\s*\(.*? \)\s*=>)/);
        
        if (funcMatch) {
            inFunction = true;
            currentFunctionAsync = !!funcMatch[1] || line.includes('async');
            braceLevel = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        } else if (inFunction) {
            braceLevel += (line.match(/\{/g) || []).length;
            braceLevel -= (line.match(/\}/g) || []).length;
            
            if (line.includes('await ') && !currentFunctionAsync) {
                console.log(`[FOUND] await in non-async function at ${filePath}:${index + 1}: ${trimmed}`);
            }
            
            if (braceLevel <= 0) {
                inFunction = false;
                currentFunctionAsync = false;
            }
        } else if (line.includes('await ')) {
             console.log(`[FOUND] await outside any function at ${filePath}:${index + 1}: ${trimmed}`);
        }
    });
}

findAwaitOutsideAsync('lib/devices/HybridSensorBase.js');
findAwaitOutsideAsync('lib/devices/BaseHybridDevice.js');
findAwaitOutsideAsync('app.js');
