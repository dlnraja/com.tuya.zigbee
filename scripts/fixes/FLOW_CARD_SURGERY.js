/**
 * scripts/fixes/FLOW_CARD_SURGERY.js
 * Repairs the fragmented flow card registration blocks in driver.js files.
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
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const allFiles = getFiles(path.join(process.cwd(), 'drivers'));

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // 1. Fix missing 'const card =' or 'const actionCard ='
    if (content.includes('if (card)') && !content.includes('const card =')) {
        content = content.replace(/this\._getFlowCard\(/g, 'const card = this._getFlowCard(');
        changed = true;
    }
    if (content.includes('if (actionCard)') && !content.includes('const actionCard =')) {
        content = content.replace(/this\._getFlowCard\(/g, 'const actionCard = this._getFlowCard(');
        changed = true;
    }

    // 2. Fix the unbalanced braces at the end of _registerFlowCards
    // Pattern: 
    //    }
    //    this.log('[FLOW] ...');
    //  }
    // }
    // module.exports = ...
    const brokenEndPattern = /\s*}\s+this\.log\('\[FLOW\][^']+'\);\s*}\s+}\s+}(? =\s+module\.exports )/        : null;
    if (content.match(brokenEndPattern)) {
        content = content.replace(brokenEndPattern, "\n    this.log('[FLOW] Flow cards registered');\n  }\n}\n");
        changed = true;
    }

    // 3. Fix orphan catch blocks
    if (content.includes('} catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }') && content.endsWith('\n')) {
         // Maybe just remove the last one if it's after module.exports
    }
    
    // 4. Fix specific "const actionCard =" truncated line
    if (content.includes('const actionCard =\n\n      if (actionCard)')) {
        content = content.replace('const actionCard =\n\n      if (actionCard)', 'const actionCard = null;\n      if (actionCard)');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`[REPAIRED] ${path.relative(process.cwd(), file)}`);
    }
});
