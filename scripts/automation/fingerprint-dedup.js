#!/usr/bin/env node
'use strict';

/**
 * fingerprint-dedup.js - Global Fingerprint Deduplication
 *
 * Scans all drivers and fingerprints.json to find and merge duplicates
 * across the entire application.
 *
 * Usage: node scripts/automation/fingerprint-dedup.js [--apply]
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const FP_DB_PATH = path.join(ROOT, 'data', 'fingerprints.json');

const log = (msg) => console.log(`[DEDUP] ${msg}`);

function loadFingerprintDB() {
    if (!fs.existsSync(FP_DB_PATH)) return {};
    return JSON.parse(fs.readFileSync(FP_DB_PATH));
}

function loadDriverFingerprints() {
    const allFps = [];
    const dirs = fs.readdirSync(DRIVERS_DIR);

    for (const d of dirs) {
        const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
        if (!fs.existsSync(cf)) continue;
        try {
            const data = JSON.parse(fs.readFileSync(cf));
            const mfrs = data.zigbee?.manufacturerName || [];
            const pids = data.zigbee?.productId || [];

            for (const mfr of mfrs) {
                for (const pid of pids) {
                    allFps.push({
                        driver: d,
                        manufacturerName: mfr,
                        productId: pid,
                        key: `${mfr.toLowerCase()}|${pid.toUpperCase()}`
                    });
                }
            }
        } catch (e) { /* skip */ }
    }
    return allFps;
}

function deduplicate(fps) {
    const seen = new Map(); // key -> first occurrence
    const duplicates = [];

    for (const fp of fps) {
        if (seen.has(fp.key)) {
            duplicates.push(fp);
        } else {
            seen.set(fp.key, fp);
        }
    }

    return { unique: Array.from(seen.values()), duplicates };
}

function main() {
    log('Starting Global Fingerprint Deduplication...');

    // 1. Check driver.compose.json duplicates
    const driverFps = loadDriverFingerprints();
    log(`Loaded ${driverFps.length} fingerprint pairs from drivers`);

    const { unique, duplicates } = deduplicate(driverFps);

    if (duplicates.length > 0) {
        log(`Found ${duplicates.length} duplicate pairs across drivers:`);

        // Group by driver to show savings per driver
        const byDriver = {};
        duplicates.forEach(d => {
            if (!byDriver[d.driver]) byDriver[d.driver] = [];
            byDriver[d.driver].push(d);
        });

        for (const [driver, dups] of Object.entries(byDriver)) {
            log(`  ${driver}: ${dups.length} duplicates`);
        }
    } else {
        log('No duplicates found in driver.compose.json files.');
    }

    // 2. Check fingerprints.json
    const db = loadFingerprintDB();
    const dbKeys = Object.keys(db);
    log(`Loaded ${dbKeys.length} entries from fingerprints.json`);

    // Note: fingerprints.json usually keys by manufacturerName, so duplicates are less likely
    // unless the file is malformed.

    console.log('\n--- Deduplication Summary ---');
    console.log(`Driver FP pairs: ${driverFps.length}`);
    console.log(`Duplicates: ${duplicates.length}`);
    console.log(`Net unique: ${unique.length}`);
}

main();
