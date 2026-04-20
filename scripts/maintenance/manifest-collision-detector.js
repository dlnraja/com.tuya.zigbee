#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const globalIds = new Map();
let conflictFound = false;

console.log('=== Hybrid Engine Manifest Collision Detector ===');

function checkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkDir(fullPath);
        } else if (file === 'driver.compose.json' || file === 'driver.flow.compose.json') {
            try {
                const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                const flow = content.flow || content;
                ['triggers', 'conditions', 'actions'].forEach(type => {
                    if (flow[type]) {
                        flow[type].forEach(item => {
                            if (globalIds.has(item.id)) {
                                console.error(` CONFLICT: Flow ID [${item.id}] duplicated in:`);
                                console.error(`   1. ${globalIds.get(item.id)}`);
                                console.error(`   2. ${fullPath}`);
                                conflictFound = true;
                            } else {
                                globalIds.set(item.id, fullPath);
                            }
                        });
                    }
                });
            } catch (e) {
                console.error(` Error parsing ${fullPath}:`, e.message);
            }
        }
    }
}

checkDir(DRIVERS_DIR);

if (conflictFound) {
    console.error('\n Build aborted: Flow ID collisions detected.');
    process.exit(1);
} else {
    console.log(' Manifest integrity verified. No Flow ID collisions found.');
    process.exit(0);
}
