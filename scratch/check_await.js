const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let inAsync = false;
    let braceCount = 0;

    lines.forEach((line, index) => {
        // This is a naive check
        if (line.includes('async ')) {
            inAsync = true;
            braceCount = 0;
        }
        
        if (inAsync) {
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;
            if (braceCount === 0 && (line.includes('}') || line.includes('=>'))) {
                // Potential end of async function if it's not a one-liner
            }
        }

        if (line.includes('await ') && !inAsync) {
            // Check if it's inside a function that is NOT marked async
            // This script needs to be more robust, but let's start simple
        }
    });
}
