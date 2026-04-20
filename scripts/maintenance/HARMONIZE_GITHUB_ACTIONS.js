#!/usr/bin/env node
'use strict';

/**
 * HARMONIZE_GITHUB_ACTIONS.js - v1.0.0
 * 
 * Performs repository-wide branding synchronization for GitHub Actions and Scripts.
 * Replaces "Nexus" and "Hybrid" with "Unified" nomenclature.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const GITHUB_DIR = path.join(ROOT, '.github');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.yml') || file.endsWith('.js') || file.endsWith('.txt') || file.endsWith('.md')) {
            results.push(file);
        }
    });
    return results;
}

const allFiles = walk(GITHUB_DIR);
let fixedCount = 0;

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // 1. Branding: Nexus -> Unified
    content = content.replace(/Nexus/g, 'Unified');
    
    // 2. Branding Case Sensitive: NEXUS -> UNIFIED
    content = content.replace(/NEXUS/g, 'UNIFIED');
    
    // 3. Branding lower: nexus -> unified
    content = content.replace(/nexus/g, 'unified');

    // 4. Architecture: Hybrid -> Unified (careful but requested)
    // We only replace "Hybrid" when it's part of a name or description, 
    // but the user wants to remove "Hybrid" globally.
    // Optimization: "Hybrid Engine", "Hybrid Architecture", "Hybrid Driver"
    content = content.replace(/Hybrid/g, 'Unified');
    content = content.replace(/HYBRID/g, 'UNIFIED');
    content = content.replace(/hybrid/g, 'unified');

    if (content !== original) {
        fs.writeFileSync(file, content);
        fixedCount++;
        
        // 5. Rename files if they contain the old branding
        const fileName = path.basename(file);
        if (fileName.includes('nexus') || fileName.includes('hybrid')) {
            const newFileName = fileName.replace(/nexus/g, 'unified').replace(/hybrid/g, 'unified');
            const newPath = path.join(path.dirname(file), newFileName);
            if (!fs.existsSync(newPath)) {
                fs.renameSync(file, newPath);
                console.log(`  [RENAME] ${fileName} -> ${newFileName}`);
            }
        }
    }
});

console.log(`\n Harmonized ${fixedCount} GitHub files/scripts.`);

// Also harmonize the forum responder specifically in its logic
const responderPath = path.join(GITHUB_DIR, 'scripts', 'forum-responder.js');
if (fs.existsSync(responderPath)) {
    let content = fs.readFileSync(responderPath, 'utf8');
    // Ensure the version mention is correct (placeholder for later bot runs)
    content = content.replace(/Universal Tuya Zigbee v[0-9]+\.[0-9]+\.[0-9]+/g, 'Universal Tuya Unified Engine v7.4.x');
    fs.writeFileSync(responderPath, content);
}
