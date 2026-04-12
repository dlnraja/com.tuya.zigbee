#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function fixDir(dir) {
    const files = fs.readdirSync(dir);
    const flowFiles = files.filter(f => f === 'driver.flow.compose.json');
    const composeFiles = files.filter(f => f === 'driver.compose.json');

    if (flowFiles.length > 0 && composeFiles.length > 0) {
        const composePath = path.join(dir, 'driver.compose.json');
        const flowPath = path.join(dir, 'driver.flow.compose.json');
        
        try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
            
            let modified = false;

            // Fix Flow Collisions
            if (compose.flow && (compose.flow.triggers?.length > 0 || compose.flow.conditions?.length > 0 || compose.flow.actions?.length > 0)) {
                console.log(`[FLOW] Cleaning duplicate flow in ${composePath}`);
                compose.flow.triggers = [];
                compose.flow.conditions = [];
                compose.flow.actions = [];
                modified = true;
            }

            // Fix maintenanceActions Collisions (Duplicate IDs)
            if (compose.maintenanceActions) {
                const uniqueActions = [];
                const seenIds = new Set();
                compose.maintenanceActions.forEach(action => {
                    if (!seenIds.has(action.id)) {
                        uniqueActions.push(action);
                        seenIds.add(action.id);
                    } else {
                        console.log(`[MAINT] Removing duplicate action ${action.id} in ${composePath}`);
                        modified = true;
                    }
                });
                compose.maintenanceActions = uniqueActions;
            }

            // Fix pair steps Collisions (Duplicate IDs)
            if (compose.pair) {
                const uniqueSteps = [];
                const seenIds = new Set();
                compose.pair.forEach(step => {
                    if (!seenIds.has(step.id)) {
                        uniqueSteps.push(step);
                        seenIds.add(step.id);
                    } else {
                        console.log(`[PAIR] Removing duplicate step ${step.id} in ${composePath}`);
                        modified = true;
                    }
                });
                compose.pair = uniqueSteps;
            }

            if (modified) {
                fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                console.log(`✅ Fixed ${composePath}`);
            }

        } catch (e) {
            console.error(`❌ Error fixing ${dir}:`, e.message);
        }
    }

    // Recurse
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixDir(fullPath);
        }
    }
}

console.log('=== Nexus Mass Collision Fixer ===');
fixDir(DRIVERS_DIR);
console.log('=== Fix Complete ===');
