#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');

function main() {
    console.log('--- Starting Flows Integrity Audit ---');

    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    let missingFlows = 0;
    let formatErrors = 0;

    for (const d of driverDirs) {
        const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
        const flowComposePath = path.join(DRIVERS_DIR, d, 'driver.flow.compose.json');

        if (!fs.existsSync(composePath)) continue;

        try {
            const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            const capabilities = composeData.capabilities || [];

            let flowComposeData = null;
            if (fs.existsSync(flowComposePath)) {
                flowComposeData = JSON.parse(fs.readFileSync(flowComposePath, 'utf8'));
            }

            const triggers = (flowComposeData && flowComposeData.triggers) ? flowComposeData.triggers : [];
            const conditions = (flowComposeData && flowComposeData.conditions) ? flowComposeData.conditions : [];
            const actions = (flowComposeData && flowComposeData.actions) ? flowComposeData.actions : [];

            // Check titleFormatted rule
            for (const trigger of triggers) {
                if (trigger.titleFormatted && trigger.titleFormatted.en && trigger.titleFormatted.en.includes('[[device]]')) {
                    console.error(`[ERROR] Driver ${d}: Trigger '${trigger.id}' has banned '[[device]]' in titleFormatted`);
                    formatErrors++;
                }
            }

            // Check if driver has physical buttons/gangs
            const hasGangs = d.includes('gang');
            const match = d.match(/(\d+)gang/);
            const numGangs = match ? parseInt(match[1]) : 0;

            if (numGangs > 0) {
                // Ensure physical flow cards exist
                for (let i = 1; i <= numGangs; i++) {
                    const expectedOnId = `${d}_physical_gang${i}_on`;
                    const expectedOffId = `${d}_physical_gang${i}_off`;

                    const hasOn = triggers.some(t => t.id === expectedOnId);
                    const hasOff = triggers.some(t => t.id === expectedOffId);

                    if (!hasOn) {
                        console.warn(`[MISSING] Driver ${d}: Missing physical trigger ${expectedOnId}`);
                        missingFlows++;
                    }
                    if (!hasOff) {
                        console.warn(`[MISSING] Driver ${d}: Missing physical trigger ${expectedOffId}`);
                        missingFlows++;
                    }
                }
            } else if (capabilities.includes('button')) {
                 // Single button logic
                 const expectedButton = `${d}_button_pressed`; // Example pattern, varies by driver
            }

        } catch (e) {
            console.error(`Error processing ${d}: ${e.message}`);
        }
    }

    console.log('--- Summary ---');
    console.log(`Missing Flows: ${missingFlows}`);
    console.log(`Format Errors: ${formatErrors}`);
    
    if (missingFlows > 0 || formatErrors > 0) {
        process.exit(1);
    }
}

main();
