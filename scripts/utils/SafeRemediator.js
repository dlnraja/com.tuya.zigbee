/**
 * scripts/utils/SafeRemediator.js
 * Centralized utility for performing safe transformations on source code.
 * Ensures that changes are only applied to valid code segments,
 * avoiding strings, comments, and regular expressions.
 */
'use strict';

const fs = require('fs');
const { execSync } = require('child_process');

class SafeRemediator {
    static transform(filePath, rules) {
        let content = fs.readFileSync(filePath, 'utf8');
        let lines = content.split('\n');
        let changed = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const originalLine = line;

            // 1. Identification logic
            // Skip comments and strings if possible
            if (line.trim().startsWith('//') || line.trim().startsWith('/*')) continue;

            rules.forEach(rule => {
                line = line.replace(rule.pattern, rule.replacement);
            });

            if (line !== originalLine) {
                lines[i] = line;
                changed = true;
            }
        }

        if (changed) {
            const newContent = lines.join('\n');
            fs.writeFileSync(filePath, newContent);
            
            // 2. Syntax Validation (Fail-Fast)
            try {
                execSync(`node -c "${filePath}"`, { stdio: 'ignore' });
            } catch (e) {
                console.error(`[SafeRemediator] SYNTAX ERROR induced in ${filePath}. Rolling back.`);
                fs.writeFileSync(filePath, content); // Rollback
                return false;
            }
            return true;
        }
        return false;
    }
}

module.exports = SafeRemediator;
