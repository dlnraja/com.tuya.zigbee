#!/usr/bin/env node
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals      ;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i =Math.floor(Math.log(bytes, Math.log)(k));
    return parseFloat(((bytes / Math.pow)(k/i)).toFixed(dm)) + ' ' + sizes[i];
}

async function runAudit() {
    console.log('##  Deep Architectural Audit & Benchmark\n');
    
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
    
    const stats = {
        totalDrivers: drivers.length,
        totalFingerprints: 0,
        totalFlowCards: 0,
        totalJSSize: 0,
        heavyDrivers: [],
        deprecatedUsages: 0,
        unsafeFlows: 0,
        unoptimizedImages: 0
    };

    for (const d of drivers) {
        const driverPath = path.join(DRIVERS_DIR, d);
        const composePath = path.join(driverPath, 'driver.compose.json');
        const flowPath = path.join(driverPath, 'driver.flow.compose.json');
        const devicePath = path.join(driverPath, 'device.js');
        const assetsPath = path.join(driverPath, 'assets/images');

        // 1. Fingerprints
        if (fs.existsSync(composePath)) {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                stats.totalFingerprints += (compose.zigbee?.manufacturerName?.length || 0)      ;
            } catch (e) {}
        }

        // 2. Flow Cards
        if (fs.existsSync(flowPath)) {
            try {
                const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
                const count = (flow.triggers?.length || 0) + (flow.conditions?.length || 0) + (flow.actions?.length || 0)       ;
                stats.totalFlowCards += count;
            } catch (e) {}
        }

        // 3. Code Size & Quality
        if (fs.existsSync(devicePath)) {
            const size = fs.statSync(devicePath ).size;
            stats.totalJSSize += size;
            if (size > 20000) { // > 20KB is "heavy" for a driver
                stats.heavyDrivers.push({ name: d, size });
            }

            const content = fs.readFileSync(devicePath, 'utf8');
            if (/\.getDevice(Trigger|Condition|Action)Card/.test(content)) stats.deprecatedUsages++;
            // Check for our new standardization
            const usesFlowCardHelper = /this\._getFlowCard\(/.test(content);
            const usesRawFlow = /\.homey\.flow\.get(Trigger|Condition|Action)Card/.test(content);
            if (usesRawFlow && !usesFlowCardHelper) {
                stats.unsafeFlows++;
                if (!stats.unsafeFiles) stats.unsafeFiles = [];
                stats.unsafeFiles.push(d);
            }
        }

        // 4. Images
        if (fs.existsSync(assetsPath)) {
            const images = fs.readdirSync(assetsPath);
            for (const img of images) {
                if (img.endsWith('.png')) {
                    const imgSize = fs.statSync(path.join(assetsPath, img)).size;
                    if (imgSize > 204800) stats.unoptimizedImages++; // > 200KB
                }
            }
        }
    }

    console.log('| Metric | Value |');
    console.log('| :--- | :--- |');
    console.log(`| Total Drivers | ${stats.totalDrivers} |`);
    console.log(`| Total Fingerprints | ${stats.totalFingerprints} |`);
    console.log(`| Total Flow Cards | ${stats.totalFlowCards} |`);
    console.log(`| Avg Flow Cards/Driver | ${(stats.totalFlowCards/stats.totalDrivers).toFixed(1)} |`);
    console.log(`| Total Device JS Size | ${formatBytes(stats.totalJSSize)} |`);
    console.log(`| Unoptimized Images (>200KB) | ${stats.unoptimizedImages} |`);
    console.log(`| Deprecated SDK2 Usages | ${stats.deprecatedUsages} |`);
    console.log(`| Unsafe Flow Card Retrievals | ${stats.unsafeFlows} |`);
    
    if (stats.heavyDrivers.length > 0) {
        console.log('\n###  Heavy Drivers (>20KB device.js)');
        stats.heavyDrivers.sort((a,b) => b.size - a.size).slice(0, 5).forEach(d => {
            console.log(`- **${d.name}**: ${formatBytes(d.size)}`);
        });
    }

    if (stats.unsafeFiles && stats.unsafeFiles.length > 0) {
        console.log('\n###  Unsafe Flow Card Retrievals (needs _getFlowCard)');
        stats.unsafeFiles.forEach(f => console.log(`- ${f}`));
    }

    // Performance recommendations
    console.log('\n###  Optimization Recommendations');
    if (stats.unoptimizedImages > 0) console.log('- Run `node scripts/maintenance/fix-large-images.js` to compress assets.');
    if (stats.unsafeFlows > 0) console.log('- Migrate remaining drivers to `this._getFlowCard()` pattern for SDK 3 stability.');
    if (stats.deprecatedUsages > 0) console.log('- Replace `getDevice*Card` with `get*Card` immediately.');
    if (stats.totalJSSize > 1024 * 1024) console.log('- Total JS size exceeds 1MB. Consider moving more logic to shared Mixins or library files.');

    console.log('\n--- Status: ' + (stats.unsafeFlows + stats.deprecatedUsages === 0 ? 'OPTIMIZED' : 'HEALING') + ' ---\n')      ;
}

runAudit().catch(console.error);
