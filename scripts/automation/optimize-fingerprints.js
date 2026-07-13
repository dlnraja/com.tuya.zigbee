#!/usr/bin/env node
'use strict';

/**
 * optimize-fingerprints.js - Fingerprint Optimization & Deduplication
 *
 * Reads all driver.compose.json files, finds case-duplicate entries,
 * normalizes to canonical case, and removes true duplicates.
 *
 * Usage: node scripts/automation/optimize-fingerprints.js [--apply]
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const log = (msg) => console.log(`[OPT-FP] ${msg}`);

function loadDrivers() {
    const drivers = [];
    const dirs = fs.readdirSync(DRIVERS_DIR);

    for (const d of dirs) {
        const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
        if (!fs.existsSync(cf)) continue;
        try {
            const data = JSON.parse(fs.readFileSync(cf));
            drivers.push({ name: d, file: cf, data });
        } catch (e) { /* skip */ }
    }
    return drivers;
}

function optimize(driver) {
    let changed = false;
    const zigbee = driver.data.zigbee || {};

    // Optimize ManufacturerNames
    if (Array.isArray(zigbee.manufacturerName)) {
        const original = [...zigbee.manufacturerName];
        // 1. Remove null/undefined
        let clean = original.filter(Boolean);
        // 2. Case-insensitive dedup (keep original casing of first occurrence)
        const seen = new Set();
        clean = clean.filter(m => {
            const lower = m.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
        });

        if (clean.length < original.length) {
            log(`  ${driver.name}: Reduced mfrs from ${original.length} to ${clean.length}`);
            zigbee.manufacturerName = clean;
            changed = true;
        }
    }

    // Optimize ProductIds
    if (Array.isArray(zigbee.productId)) {
        const original = [...zigbee.productId];
        let clean = original.filter(Boolean);
        clean = [...new Set(clean)]; // PID are usually unique

        if (clean.length < original.length) {
            log(`  ${driver.name}: Reduced pids from ${original.length} to ${clean.length}`);
            zigbee.productId = clean;
            changed = true;
        }
    }

    if (changed) {
        driver.data.zigbee = zigbee;
    }

    return changed;
}

function main() {
    log('Loading drivers...');
    const drivers = loadDrivers();
    log(`Loaded ${drivers.length} drivers`);

    let modifiedCount = 0;
    let totalSavings = 0;

    for (const driver of drivers) {
        const originalMfrCount = (driver.data.zigbee?.manufacturerName || []).length;
        const originalPidCount = (driver.data.zigbee?.productId || []).length;

        if (optimize(driver)) {
            modifiedCount++;
            const newMfrCount = (driver.data.zigbee?.manufacturerName || []).length;
            const newPidCount = (driver.data.zigbee?.productId || []).length;
            totalSavings += (originalMfrCount - newMfrCount) + (originalPidCount - newPidCount);

            // Save if --apply is passed
            if (process.argv.includes('--apply')) {
                fs.writeFileSync(driver.file, JSON.stringify(driver.data, null, 2) + '\n');
                log(`  Saved ${driver.name}`);
            }
        }
    }

    console.log('\n--- Optimization Report ---');
    console.log(`Drivers scanned: ${drivers.length}`);
    console.log(`Drivers optimized: ${modifiedCount}`);
    console.log(`Entries removed: ${totalSavings}`);
}

main();
