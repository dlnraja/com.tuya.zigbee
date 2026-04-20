/**
 * scripts/fixes/STRUCTURE_RESTORE.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else if (file.endsWith('driver.js')) {
            results.push(file);
        }
    });
    return results;
}

const driverFiles = getFiles(path.join(process.cwd(), 'drivers'));

driverFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('ThermostatTuyaDpDriver') || content.includes('DinRailMeterDriver')) {
         // Fix the broken tail
         const lines = content.split('\n');
         let cutPoint = -1;
         for (let i = lines.length - 1; i >= 0; i--) {
             if (lines[i].includes('module.exports')) {
                 cutPoint = i;
                 break;
             }
         }
         if (cutPoint !== -1) {
             const head = lines.slice(0, cutPoint).join('\n');
             const exportLine = lines[cutPoint];
             
             // Rebuild tail
             // We need TWO closing braces for _registerFlowCards and class
             let newContent = head.replace(/}\s*this\.log\('\[FLOW\].*\n\s*}\s*}\s*}\s*catch\s*\(err\)\s*{\s*this\.log.*/, "\n    this.log('[FLOW] Fixed registration');\n  }\n}\n");
             
             // If manual replacement above failed, try this:
             if (newContent === head) {
                  // Fallback for very broken ones
                  newContent = head.replace(/}\s+this\.log\('\[FLOW\][^']+'\);\s*}\s*}\s*(.*)$/s, "\n    this.log('[FLOW] Fixed registration');\n  }\n}\n");
             }

             if (newContent !== head) {
                 fs.writeFileSync(file, newContent + '\n' + exportLine + '\n');
                 console.log(`[RESTRUCTURED] ${file}`);
             }
         }
    }
});
