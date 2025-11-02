#!/usr/bin/env node

/**
 * SMART CONFLICT RESOLUTION
 * Automatically resolve common merge conflicts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔧 SMART CONFLICT RESOLVER\n');
console.log('═'.repeat(70));

// Check for conflicts
function hasConflicts() {
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        return status.includes('UU ') || status.includes('AA ');
    } catch (error) {
        return false;
    }
}

// Get conflicted files
function getConflictedFiles() {
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        const lines = status.split('\n').filter(Boolean);
        
        return lines
            .filter(line => line.startsWith('UU ') || line.startsWith('AA '))
            .map(line => line.substring(3).trim());
    } catch (error) {
        return [];
    }
}

// Resolve JSON conflicts (app.json, driver.compose.json, etc.)
function resolveJsonConflict(filePath) {
    console.log(`\n🔍 Analyzing JSON conflict: ${filePath}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract conflict markers
        const conflicts = content.split(/<<<<<<< HEAD\n/);
        
        if (conflicts.length === 1) {
            console.log('   ✅ No conflict markers found');
            return true;
        }
        
        let resolved = conflicts[0]; // Base content before conflicts
        
        for (let i = 1; i < conflicts.length; i++) {
            const parts = conflicts[i].split(/=======\n/);
            if (parts.length !== 2) continue;
            
            const [oursPart, theirsFull] = parts;
            const theirsPart = theirsFull.split(/>>>>>>> /)[0];
            
            // Try to parse both sides
            let oursData, theirsData;
            
            try {
                oursData = JSON.parse(oursPart);
                theirsData = JSON.parse(theirsPart);
                
                // Merge strategy: prefer ours, but add missing keys from theirs
                const merged = mergeJsonObjects(oursData, theirsData);
                resolved += JSON.stringify(merged, null, 2);
                
                console.log('   ✅ Merged JSON objects');
            } catch (parseError) {
                // If can't parse, try line-based merge
                console.log('   ⚠️  Cannot parse JSON, trying line merge...');
                
                // For arrays (like manufacturerName), merge both
                if (oursPart.includes('"manufacturerName"') && theirsPart.includes('"manufacturerName"')) {
                    const merged = mergeManufacturerArrays(oursPart, theirsPart);
                    resolved += merged;
                    console.log('   ✅ Merged manufacturerName arrays');
                } else {
                    // Keep ours by default
                    resolved += oursPart;
                    console.log('   ⚠️  Kept our version');
                }
            }
            
            // Add remaining content after conflict
            const remaining = theirsFull.split(/>>>>>>> /)[1];
            if (remaining) {
                resolved += remaining;
            }
        }
        
        // Save resolved file
        fs.writeFileSync(filePath, resolved);
        
        // Mark as resolved
        execSync(`git add ${filePath}`, { stdio: 'ignore' });
        
        console.log(`   ✅ Conflict resolved: ${filePath}`);
        return true;
        
    } catch (error) {
        console.error(`   ❌ Error resolving conflict: ${error.message}`);
        return false;
    }
}

// Merge JSON objects intelligently
function mergeJsonObjects(ours, theirs) {
    const merged = { ...ours };
    
    for (const key in theirs) {
        if (!(key in merged)) {
            // Add missing keys from theirs
            merged[key] = theirs[key];
        } else if (Array.isArray(merged[key]) && Array.isArray(theirs[key])) {
            // Merge arrays (remove duplicates)
            merged[key] = [...new Set([...merged[key], ...theirs[key]])];
            
            // Sort if manufacturerName
            if (key === 'manufacturerName') {
                merged[key].sort();
            }
        } else if (typeof merged[key] === 'object' && typeof theirs[key] === 'object') {
            // Recursively merge objects
            merged[key] = mergeJsonObjects(merged[key], theirs[key]);
        }
        // For primitives, keep ours
    }
    
    return merged;
}

// Merge manufacturer ID arrays from text
function mergeManufacturerArrays(oursPart, theirsPart) {
    const oursIds = [...oursPart.matchAll(/"(_TZ[^"]+)"/g)].map(m => m[1]);
    const theirsIds = [...theirsPart.matchAll(/"(_TZ[^"]+)"/g)].map(m => m[1]);
    
    const merged = [...new Set([...oursIds, ...theirsIds])].sort();
    
    return `    "manufacturerName": [\n` +
           merged.map(id => `      "${id}"`).join(',\n') +
           `\n    ]`;
}

// Resolve markdown conflicts (prefer ours, note theirs)
function resolveMarkdownConflict(filePath) {
    console.log(`\n📝 Resolving markdown conflict: ${filePath}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Simple strategy: keep ours, add note about conflict
        const resolved = content.replace(
            /<<<<<<< HEAD\n([\s\S]*?)\n=======\n[\s\S]*?\n>>>>>>> .*/g,
            (match, ours) => {
                return ours + '\n\n> **Note**: Merge conflict auto-resolved, keeping current version.\n';
            }
        );
        
        fs.writeFileSync(filePath, resolved);
        execSync(`git add ${filePath}`, { stdio: 'ignore' });
        
        console.log(`   ✅ Conflict resolved: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return false;
    }
}

// Main execution
if (!hasConflicts()) {
    console.log('✅ No conflicts detected\n');
    process.exit(0);
}

const conflictedFiles = getConflictedFiles();

console.log(`\n⚠️  Found ${conflictedFiles.length} conflicted files:\n`);
conflictedFiles.forEach(file => console.log(`   - ${file}`));

let resolved = 0;
let failed = 0;

for (const file of conflictedFiles) {
    const ext = path.extname(file);
    
    if (ext === '.json') {
        if (resolveJsonConflict(file)) {
            resolved++;
        } else {
            failed++;
        }
    } else if (ext === '.md') {
        if (resolveMarkdownConflict(file)) {
            resolved++;
        } else {
            failed++;
        }
    } else {
        console.log(`\n⚠️  Skipping ${file} (unsupported file type)`);
        failed++;
    }
}

console.log('\n' + '═'.repeat(70));
console.log('\n📊 RESOLUTION SUMMARY\n');
console.log(`Resolved: ${resolved}`);
console.log(`Failed:   ${failed}`);
console.log(`Total:    ${conflictedFiles.length}`);

if (failed === 0) {
    console.log('\n✅ ALL CONFLICTS RESOLVED!\n');
    process.exit(0);
} else {
    console.log('\n⚠️  Some conflicts require manual resolution\n');
    process.exit(1);
}
