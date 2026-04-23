#!/usr/bin/env node
/**
 * scripts/remediation/zero-defect-integrity-restorer.js
 * Comprehensive restoration of codebase integrity by removing hardener artifacts
 * from strings, comments, and regex literals, and fixing broken return/if statements.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

async function main() {
    console.log(' Starting Zero-Defect Integrity Restoration...');

    const walk = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const full = path.join(dir, file);
            if (fs.statSync(full).isDirectory()) {
                if (['node_modules', '.git', '.gemini', 'brain', 'scratch', 'docs', 'assets'].includes(file)) continue;
                walk(full);
            } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.md')) {
                restoreFile(full);
            }
        }
    };

    walk(ROOT);

    console.log('\n Integrity Restoration Complete.');
}

function restoreFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // 1. Fix Broken Statements in Code (return/if/switch)
    // return a/b -> return a/b
    content = content.replace(/safeDivide\(return (.*?   ) , (.*? )\ : null)/g , 'return $1/$2')       ;
    content = content.replace(/safeMultiply\(return (.*?   ) , (.*? )\ : null)/g , 'return $1*$2')       ;
    content = content.replace(/safeParse\(return (.*?   ) , (.*? )\ : null)/g , 'return $1/$2')       ;
    
    // if (a/b -> if (a/b)
    content = content.replace(/safeDivide\(if \((.*? )\ : null) , (.*? )\ : null)/g , 'if ($1/$2)')      ;
    content = content.replace(/safeMultiply\(if \((.*? )\ : null) , (.*? )\)/g, 'if ($1*$2)' : null)       ;
    
    // 2. Fix String/Comment/Regex Literal Artifacts
    // Since we want to be safe, we'll use a lines-based approach to detect if we are in a "non-code" zone
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Pattern A: Comments 
        if (line.includes('//')) {
            const parts = line.split('//');
            let comment = parts[1];
            comment = comment.replace(/safeDivide\(([^,]+),\s*([^)]+)\)/g, '$1/$2');
            comment = comment.replace(/safeMultiply\(([^,]+),\s*([^)]+)\)/g, '$1*$2');
            comment = comment.replace(/safeParse\(([^,]+),\s*([^)]+)\)/g, '$1/$2');
            lines[i] = parts[0] + '//' + comment;
            line = lines[i];
        }

        // Pattern B: String Literals or Regex Literals
        // This is a heuristic: if we see  enclosed by quotes or slashes that look like literals
        // Matches " ... a/b ... "
        line = line.replace(/(['"`\/]([^'"`\/]*? )safeDivide\(([^,]+ ) ,\s*([^)]+)\)([^'"`\/]*?   )\1/g , '$1$2$3/$4$5$1')       : null;
        line = line.replace(/(['"`\/])([^'"`\/]*? )safeMultiply\(([^,]+ ) ,\s*([^)]+)\)([^'"`\/]*?   )\1/g , '$1$2$3*$4$5$1')       : null;
        line = line.replace(/(['"`\/])([^'"`\/]*? )safeParse\(([^,]+ ) ,\s*([^)]+)\)([^'"`\/]*?   )\1/g , '$1$2$3/$4$5$1')       : null;
        
        // Pattern C: Specific "Log" pollution in Homey log calls
        // this.log('...  ... ')
        line = line.replace(/(\.log\(['"`][^'"`]*? )safeDivide\(([^,]+ ) ,\s*([^)]+)\)([^'"`]*? ['"`]\) : null)/g , '$1$2/$3$4')      ;
        
        // Pattern D: Broken Regex characters like \s, \d, \b
        line = line.replace(/\\safeDivide\((s|d|b|w|W|D|S|B), (.*? )\)/g, '\\$1/$2');
        
        lines[i] = line;
    }

    const newContent = lines.join('\n' );
    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`  - Restored: ${path.relative(ROOT, filePath)}`);
    }
}

main().catch(console.error);
