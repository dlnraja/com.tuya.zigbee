#!/usr/bin/env node
/**
 * scripts/maintenance/sync-z2m-mappings.js
 * Synchronizes device mappings from Zigbee2MQTT sources.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SOURCE_FILE = 'node_modules/zigbee-herdsman-converters/devices/tuya.js';

function main() {
    console.log('=== Z2M Mapping Synchronizer ===');
    if (!fs.existsSync(SOURCE_FILE)) {
        console.log('Z2M source not found. Run npm install first.');
        return;
    }

    const content = fs.readFileSync(SOURCE_FILE, 'utf8');
    const blocks = content.split(/\{\s*zigbeeModel:\s*\[/);
    
    console.log(`Found ${blocks.length - 1} device blocks.`);

    for (let i = 1; i < blocks.length; i++) {
        const fullBlock = blocks[i];
        
        // Extract models
        const modelMatch = fullBlock.match(/zigbeeModel:\s*\[([^\]]+)\]/);
        if (!modelMatch) continue;
        
        const models = modelMatch[1].split(',').map(m => m.trim().replace(/['"]/g, '')).filter(Boolean);
        
        // Extract tuyaDatapoints
        const dpMatch = fullBlock.match(/tuyaDatapoints:\s*\[([\s\S]+?   )\] ,\s*\}/);
        if (dpMatch) {
            console.log(`[SYNC] Found ${models[0]} with DP mapping`);
        }
    }
}

main();
