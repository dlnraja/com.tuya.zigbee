const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function resolve() {
    console.log('=== AUTO-RESOLVING CONFLICTS ===');
    
    let status = '';
    try {
        status = execSync('git status --short').toString();
    } catch (e) {
        console.error('Failed to get git status.');
        return;
    }
    
    const lines = status.split('\n');
    let hasConflicts = false;
    
    for (const line of lines) {
        if (line.startsWith('UU ')) {
            hasConflicts = true;
            const file = line.substring(3).trim();
            console.log(`Resolving conflict in: ${file}`);
            
            if (file.endsWith('.png') || file.endsWith('.svg') || file.endsWith('.jpg')) {
                console.log(`  Accepting OURS for binary file: ${file}`);
                execSync(`git checkout --ours "${file}"`);
                execSync(`git add "${file}"`);
            } else if (file === 'package.json' || file === 'package-lock.json') {
                console.log(`  Accepting OURS for structural file: ${file}`);
                execSync(`git checkout --ours "${file}"`);
                execSync(`git add "${file}"`);
            } else if (file === 'locales/en.json' || file === 'app.json') {
                console.log(`  Accepting OURS for large JSON file: ${file}`);
                execSync(`git checkout --ours "${file}"`);
                execSync(`git add "${file}"`);
            } else {
                console.log(`  Accepting THEIRS for driver logic: ${file}`);
                execSync(`git checkout --theirs "${file}"`);
                execSync(`git add "${file}"`);
            }
        }
    }
    
    if (hasConflicts) {
        try {
            execSync('git commit -m "chore: auto-resolve merge conflicts"', { stdio: 'inherit' });
            console.log('✅ Conflicts resolved and committed.');
        } catch (e) {
            console.log('ℹ️ Nothing to commit (or commit failed).');
        }
    } else {
        console.log('No conflicts found.');
    }
}

resolve();
