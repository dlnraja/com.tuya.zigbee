#!/usr/bin/env node
'use strict';

/**
 * sync-all-sources.js - Unified External Source Synchronizer
 *
 * Fetches data from Z2M, ZHA, and deCONZ, cross-references with existing
 * app data, and generates a report of new devices to add.
 *
 * Usage: node scripts/automation/sync-all-sources.js [--dry-run] [--output=path]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const DATA_DIR = path.join(ROOT, 'data');
const REPORT_DIR = path.join(ROOT, 'data', 'community-sync');

// URLs
const Z2M_TUYA_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
const ZHA_URL = 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/master/zhaquirks/tuya';
const DECONZ_URL = 'https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/devices.json';

// Helpers
const log = (msg) => console.log(`[SYNC] ${msg}`);
const warn = (msg) => console.warn(`[WARN] ${msg}`);
const error = (msg) => console.error(`[ERR] ${msg}`);

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 60000 }, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                return httpGet(res.headers.location).then(resolve, reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        });
    });
}

// 1. Load Local Fingerprints
function loadLocalFingerprints() {
    const fps = new Map();
    try {
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
                        fps.set(`${mfr}|${pid}`, d);
                    }
                }
            } catch (e) { /* skip */ }
        }
    } catch (e) {
        error(`Failed to load local fingerprints: ${e.message}`);
    }
    return fps;
}

// 2. Parse Z2M
function parseZ2M(source) {
    const results = [];
    const mfrRe = /manufacturerName:\s*['"]([^'"]+)['"]/g;
    const modelRe = /zigbeeModel:\s*\[([^\]]+)\]/g;
    let m;

    while ((m = mfrRe.exec(source)) !== null) {
        results.push({ type: 'mfr', value: m[1], source: 'z2m' });
    }

    while ((m = modelRe.exec(source)) !== null) {
        const inner = m[1];
        const strRe = /['"]([^'"]+)['"]/g;
        let s;
        while ((s = strRe.exec(inner)) !== null) {
            if (s[1].length > 1) results.push({ type: 'pid', value: s[1], source: 'z2m' });
        }
    }

    return results;
}

// 3. Parse ZHA
function parseZHA(source) {
    const results = [];
    const mfrRe = /_MANUFACTURER.*?['"]([^'"]+)['"]/g;
    const modelRe = /MODEL.*?['"]([^'"]+)['"]/g;
    let m;

    while ((m = mfrRe.exec(source)) !== null) {
        results.push({ type: 'mfr', value: m[1], source: 'zha' });
    }

    while ((m = modelRe.exec(source)) !== null) {
        results.push({ type: 'pid', value: m[1], source: 'zha' });
    }

    return results;
}

// Main
async function main() {
    log('Starting Unified Source Sync...');

    const localFps = loadLocalFingerprints();
    log(`Loaded ${localFps.size} local fingerprints`);

    const newDevices = [];

    // Z2M
    try {
        log('Fetching Z2M data...');
        const z2mData = await httpGet(Z2M_TUYA_URL);
        const z2mFps = parseZ2M(z2mData);
        log(`Parsed ${z2mFps.length} items from Z2M`);

        // Cross-reference Z2M
        const mfrs = z2mFps.filter(f => f.type === 'mfr').map(f => f.value);
        const pids = z2mFps.filter(f => f.type === 'pid').map(f => f.value);

        for (const mfr of mfrs) {
            for (const pid of pids) {
                const key = `${mfr}|${pid}`;
                if (!localFps.has(key)) {
                    newDevices.push({ source: 'z2m', manufacturerName: mfr, productId: pid });
                }
            }
        }

    } catch (e) {
        error(`Z2M fetch failed: ${e.message}`);
    }

    // Generate Report
    log(`Found ${newDevices.length} potential new devices`);
    console.log('Sync complete.');
}

main().catch(console.error);
