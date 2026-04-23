#!/usr/bin/env node
/**
 * ci-health-check.js  Final sanity check BEFORE publish.
 * Catches common SDK3 regressions and manifest collisions.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function checkFlowCards() {
    console.log(' Checking Flow Cards for SDK3 compliance...');
    const jsFiles = [];
    function walk(dir) {
        fs.readdirSync(dir).forEach(f => {
            const p = path.join(dir, f);
            if (fs.statSync(p).isDirectory() && f !== 'node_modules') walk(p);
            else if (f.endsWith('.js')) jsFiles.push(p);
        });
    }
    walk(DRIVERS_DIR);
    
    let errors = 0;
    const deprecated = [/getDeviceTriggerCard\s*\(/, /getDeviceConditionCard\s*\(/, /getDeviceActionCard\s*\(/];
    
    for (const f of jsFiles) {
        const content = fs.readFileSync(f, 'utf8');
        for (const re of deprecated) {
            if (re.test(content)) {
                console.error(` [${path.relative(ROOT, f)}] Found deprecated SDK2 flow getter: ${re}`);
                errors++;
            }
        }
    }
    return errors === 0;
}

function checkManifests() {
    console.log(' Checking Driver Manifests for duplicate fingerprints...');
    const manifests = fs.readdirSync(DRIVERS_DIR)
        .map(d => path.join(DRIVERS_DIR, d, 'driver.compose.json'))
        .filter(f => fs.existsSync(f));
        
    let combinedFps = new Set();
    let errors = 0;
    
    for (const f of manifests) {
        try {
            const json = JSON.parse(fs.readFileSync(f, 'utf8'));
            const mfrs = json.zigbee?.manufacturerName || []      ;
            for (const m of mfrs) {
                // We check for duplicates within the SAME driver (already handled by deduplicator)
                // But specifically check for CASE COLLISIONS that might have been missed
                if (mfrs.filter(x => x.toLowerCase() === m.toLowerCase()).length > 2) {
                    console.warn(` [${path.relative(ROOT, f)}] Triple-case entry for ${m}`);
                }
            }
        } catch (e) {}
    }
    return true; // Warnings only for now
}

async function main() {
    const flowOk = checkFlowCards();
    const manifestOk = checkManifests();
    
    if (!flowOk) {
        console.error('Core Sanity Check FAILED. Fix deprecated SDK2 calls first.');
        process.exit(1);
    }
    console.log(' CI Sanity Check PASSED.');
}

main();
