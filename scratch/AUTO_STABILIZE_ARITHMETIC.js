const fs = require('fs');
const path = require('path');

const ROOT = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair';
const AUDIT_REPORT_PATH = path.join(ROOT, 'docs/reports/ZERO_DEFECT_AUDIT.json');

if (!fs.existsSync(AUDIT_REPORT_PATH)) {
    console.error('Audit report not found. Run the audit first.');
    process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(AUDIT_REPORT_PATH, 'utf8'));
const naNWarn = audit.naNSafetyCheck || [];

const fileToLines = {};
naNWarn.forEach(warn => {
    const parts = warn.split(':');
    const file = parts[0];
    const line = parseInt(parts[1]);
    if (!fileToLines[file]) fileToLines[file] = new Set();
    fileToLines[file].add(line);
});

console.log(`Processing ${Object.keys(fileToLines).length} files...`);

for (const [relPath, lineNumbers] of Object.entries(fileToLines)) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`File not found: ${fullPath}`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    let changed = false;

    // Sort line numbers descending to avoid issues with content length changes if we were adding multiple lines, 
    // but here we are just replacing text within lines.
    const sortedLines = [...lineNumbers].sort((a, b) => b - a);

    for (const lineIdx of sortedLines) {
        const idx = lineIdx - 1;
        if (idx < 0 || idx >= lines.length) continue;

        let originalLine = lines[idx];
        let newLine = originalLine;

        // Pattern 1: Multiply a * b -> safeMultiply(a, b)
        // Pattern 2: Divide a / b -> safeDivide(a, b)
        
        // We use a regex that looks for word boundaries and handles simple variables/properties/brackets
        // This is a heuristic and might need refinement
        
        // Multiplication: [A] * [B]
        // Note: We avoid matching * in comments or strings by assuming the audit already filtered those, 
        // but we double check if safeMultiply is already there.
        if (!newLine.includes('safeMultiply') && !newLine.includes('safeDivide')) {
            // Handle multiplication
            newLine = newLine.replace(/([a-zA-Z0-9_$.[\]()]+)\s*\*\s*([a-zA-Z0-9_$.]+)(?!\s*\*)/g, 'safeMultiply($1, $2)');
            
            // Handle division
            newLine = newLine.replace(/([a-zA-Z0-9_$.[\]()]+)\s*\/\s*([a-zA-Z0-9_$.]+)/g, 'safeDivide($1, $2)');
        }

        if (newLine !== originalLine) {
            lines[idx] = newLine;
            changed = true;
        }
    }

    if (changed) {
        // Ensure tuyaUtils is required if we added safe wrappers
        let newContent = lines.join('\n');
        if (!newContent.includes('const {') && !newContent.includes('const { safeMultiply') && !newContent.includes('const { safeDivide')) {
             // Heuristic: Add it after 'use strict' or at the top
             if (newContent.includes("'use strict';")) {
                 newContent = newContent.replace("'use strict';", "'use strict';\nconst { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');");
             } else {
                 newContent = "const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');\n" + newContent;
             }
        } else if (!newContent.includes('safeDivide') && !newContent.includes('safeMultiply')) {
            // Already has some require, but maybe not the safe ones
            // This is complex to automate perfectly, so we just append it if missing
             if (!newContent.includes('tuyaUtils.js')) {
                  newContent = newContent.replace("'use strict';", "'use strict';\nconst { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');");
             }
        }
        
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${relPath}`);
    }
}
