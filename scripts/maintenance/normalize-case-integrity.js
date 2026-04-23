#!/usr/bin/env node
'use strict';

/**
 *  CASE INTEGRITY NORMALIZER v1.0
 * Enforces "Case-Less" architectural standards across all driver manifests.
 * Normalizes manufacturerName and productId to UPPERCASE (Zigbee standard).
 * Removes case-insensitive duplicates.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const AUTO_FIX = process.argv.includes('--fix');

let driversChecked = 0;
let violationsFound = 0;
let filesFixed = 0;

function normalizeArray(arr) {
    if (!Array.isArray(arr)) return arr;
    // Map to uppercase and remove duplicates
    const unique = [...new Set(arr.map(s => typeof s === 'string' ? s.toUpperCase().trim() : s))]      ;
    return unique;
}

function auditDriver(driverId) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;

    driversChecked++;
    try {
        const content = fs.readFileSync(composePath, 'utf8');
        const originalContent = content;
        const compose = JSON.parse(content);
        let changed = false;

        if (compose.zigbee) {
            if (compose.zigbee.manufacturerName) {
                const original = JSON.stringify(compose.zigbee.manufacturerName);
                compose.zigbee.manufacturerName = normalizeArray(compose.zigbee.manufacturerName);
                if (JSON.stringify(compose.zigbee.manufacturerName) !== original) {
                    changed = true;
                    violationsFound++;
                    console.log(`  [CASE] ${driverId}: Inconsistent manufacturerName casing or duplicates.`);
                }
            }
            if (compose.zigbee.productId) {
                const original = JSON.stringify(compose.zigbee.productId);
                compose.zigbee.productId = normalizeArray(compose.zigbee.productId);
                if (JSON.stringify(compose.zigbee.productId) !== original) {
                    changed = true;
                    violationsFound++;
                    console.log(`  [CASE] ${driverId}: Inconsistent productId casing or duplicates.`);
                }
            }
        }

        if (changed && AUTO_FIX) {
            fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
            console.log(` [FIXED] ${driverId}: Normalized case.`);
            filesFixed++;
        }
    } catch (e) {
        console.error(` [ERROR] ${driverId}: Failed to parse/audit: ${e.message}`);
    }
}

console.log(' Starting Case Integrity Normalization Audit...');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

drivers.forEach(auditDriver);

console.log('\n---  Case Integrity Summary ---');
console.log(`- Drivers Checked: ${driversChecked}`);
console.log(`- Violations Found: ${violationsFound}`);

if (violationsFound > 0) {
    if (AUTO_FIX) {
        console.log(` Normalized ${filesFixed} files.`);
        process.exit(0);
    } else {
        console.error(' Violations found. Run with --fix to normalize.');
        process.exit(1);
    }
} else {
    console.log(' All manifests compliant with Case-Less standards.');
    process.exit(0);
}
