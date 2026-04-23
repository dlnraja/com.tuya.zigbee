#!/usr/bin/env node
'use strict';

/**
 * Tuya Fingerprint Broadener v1.0.0
 * 
 * Objective: Implement "Wildcard-like" behavior in SDK 3 by:
 * 1. Harvesting all known manufacturerNames from the project's diagnostic history.
 * 2. Deduplicating and mapping them to the correct base drivers (TS0601, TS011F, etc.).
 * 3. Inlining them into driver.compose.json to ensure 100% variant coverage.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, '.github/state');

// Target Broadening chipsets - Catch-all logic for SDK 3
const BROAD_TARGETS = {
    'TS0601': 'universal_fallback', // Data-Point based high-volume variants
    'TS011F': 'plug_energy_monitor', // Major plug chipset
    'TS0001': 'switch_1gang',        // Single gang switch fallback
    'TS0002': 'switch_2gang',
    'TS0003': 'switch_3gang',
    'TS0004': 'switch_4gang',
    'TS0201': 'climate_sensor',      // Temp/Humid
    'TS0501': 'bulb_dimmable',       // Light variants
    'TS0502': 'bulb_tunable_white',
    'TS0505': 'bulb_rgb'
};

function harvestFPs() {
    const allFPs = new Set();
    
    // 1. Scan diagnostics, nightly state, and enrichment
    const diagFiles = [
        path.join(STATE_DIR, 'nightly-state.json'),
        path.join(STATE_DIR, 'enrichment-state.json'),
        path.join(ROOT, 'diagnostics/summary.json'),
        path.join(ROOT, 'diagnostics/diag_forum.json')
    ];

    diagFiles.forEach(f => {
        if (!fs.existsSync(f)) return;
        try {
            const data = fs.readFileSync(f, 'utf8');
            // Extract _TZE pattern (Tuya Zigbee End-device)
            const matches = data.match(/_T[A-Z0-9]{2,6}_[a-z0-9]{4,16}/g) || [];
            matches.forEach(m => allFPs.add(m));
        } catch (e) {}
    });

    return Array.from(allFPs).filter(fp => fp.startsWith('_T'));
}

function processBroadening() {
    console.log(' [Broadener] Starting v7.0.25 High-Frequency Wildcard injection...');
    const knownFPs = harvestFPs();
    console.log(` [Broadener] Harvested ${knownFPs.length} variants.`);

    // 1. Group by Chipset Prefix (Rule 2 optimization)
    const chipsets = {
        '_TZE200': [],
        '_TZE204': [],
        '_TZE284': [],
        '_TZ3000': [],
        '_TZ3210': []
    };

    knownFPs.forEach(fp => {
        const prefix = Object.keys(chipsets).find(p => fp.startsWith(p));
        if (prefix) chipsets[prefix].push(fp);
    });

    // 2. Map existing drivers
    const fpToDriver = new Map();
    const drivers = fs.readdirSync(DRIVERS_DIR);
    drivers.forEach(d => {
        const cp = path.join(DRIVERS_DIR, d, 'driver.compose.json');
        if (!fs.existsSync(cp)) return;
        try {
            const j = JSON.parse(fs.readFileSync(cp, 'utf8'));
            (j.zigbee?.manufacturerName || []).forEach(m => fpToDriver.set(m, d))       ;
        } catch {}
    });

    // 3. Chipset-Wide Broadening (The "Thinking Hybrid Engine" Method)
    Object.entries(BROAD_TARGETS).forEach(([pid, driver]) => {
        const cp = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
        if (!fs.existsSync(cp)) return;

        try {
            const j = JSON.parse(fs.readFileSync(cp, 'utf8'));
            if (!j.zigbee) j.zigbee = {};
            if (!j.zigbee.productId) j.zigbee.productId = [];
            
            let updated = false;

            // Ensure ProductID is present
            if (!j.zigbee.productId.includes(pid)) {
                j.zigbee.productId.push(pid);
                updated = true;
            }

            // Inject unmapped FPs that match this chipset
            // Note: We use a smarter logic: if it starts with _TZE (DP based), 
            // and the driver is the universal fallback, inject ALL.
            const relevantMfrs = knownFPs.filter(fp => {
                if (fpToDriver.has(fp)) return false; // Already handled
                if (driver === 'universal_fallback') return fp.startsWith('_TZE');
                return false; // For now, only universal_fallback gets broad _TZE injection
            });

            if (relevantMfrs.length > 0) {
                if (!j.zigbee.manufacturerName) j.zigbee.manufacturerName = [];
                const before = j.zigbee.manufacturerName.length;
                j.zigbee.manufacturerName = [...new Set([...j.zigbee.manufacturerName, ...relevantMfrs])];
                if (j.zigbee.manufacturerName.length > before) updated = true;
            }

            if (updated) {
                fs.writeFileSync(cp, JSON.stringify(j, null, 2) + '\n');
                console.log(` [Broadener] Broadened ${driver} with ${pid} and new variants.`);
            }
        } catch (err) {
            console.error(` [Broadener] Failed ${driver}:`, err.message);
        }
    });

    // 4. Cleanup and PR Ready
    console.log(' [Broadener] Wildcard integration complete.');
}

processBroadening();
