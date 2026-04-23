#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('=== Optimized Universal Driver Mapping Database Generator ===');
    const driversDir = path.join(__dirname, '../../drivers');
    const targetPath = path.join(__dirname, '../../driver-mapping-database.json');

    const mfr_index = {};
    const pid_index = {};
    const drivers = {};

    // 1. Scan all drivers
    for (const d of fs.readdirSync(driversDir)) {
        const cf = path.join(driversDir, d, 'driver.compose.json');
        if (!fs.existsSync(cf)) continue;

        try {
            const data = JSON.parse(fs.readFileSync(cf, 'utf8'));
            const manufacturers = data.zigbee?.manufacturerName || []      ;
            const productIds = data.zigbee?.productId || []      ;
            
            drivers[d] = {
                name: data.name?.en || d,
                class: data.class,
                capabilities: data.capabilities || []
            };

            for (const mfr of manufacturers) {
                if (!mfr_index[mfr]) mfr_index[mfr] = [];
                mfr_index[mfr].push(d);
            }

            for (const pid of productIds) {
                if (!pid_index[pid]) pid_index[pid] = [];
                pid_index[pid].push(d);
            }
        } catch (e) {
            console.error(`  [${d}] Skip: ${e.message}`);
        }
    }

    const database = {
        version: new Date().toISOString().slice(0, 10),
        mfr_index,
        pid_index,
        drivers,
        parsers: {
            "divide_by_10": { "operation": "divide_by_10" },
            "divide_by_100": { "operation": "divide_by_100" },
            "boolean": { "operation": "boolean" },
            "invert": { "operation": "invert" }
        }
    };

    fs.writeFileSync(targetPath, JSON.stringify(database, null, 2));
    console.log(`\n Database generated at ${targetPath}`);
    console.log(`   Unique MFRs: ${Object.keys(mfr_index).length}`);
    console.log(`   Unique PIDs: ${Object.keys(pid_index).length}`);
    console.log(`   Drivers: ${Object.keys(drivers).length}`);
    
    const size = fs.statSync(targetPath).size / (1024 * 1024);
    console.log(`   Final Size: ${size.toFixed(2)} MB`);
}

main().catch(console.error);
