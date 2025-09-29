#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

async function validateAndFix() {
    console.log('🔧 Quick validation and fixes...');
    
    const driversPath = path.join(process.cwd(), 'drivers');
    const drivers = await fs.readdir(driversPath);
    
    for (const driver of drivers) {
        const composePath = path.join(driversPath, driver, 'driver.compose.json');
        
        if (await fs.pathExists(composePath)) {
            const compose = await fs.readJson(composePath);
            
            // Fix common issues
            if (compose.zigbee && compose.zigbee.endpoints) {
                for (const [ep, config] of Object.entries(compose.zigbee.endpoints)) {
                    if (config.clusters) {
                        // Convert string clusters to numbers
                        config.clusters = config.clusters.map(c => 
                            typeof c === 'string' ? parseInt(c) : c
                        );
                    }
                }
            }
            
            // Ensure energy.batteries for battery devices
            if (compose.capabilities && compose.capabilities.includes('alarm_battery')) {
                if (!compose.energy) compose.energy = {};
                if (!compose.energy.batteries) compose.energy.batteries = ['CR2032'];
            }
            
            await fs.writeJson(composePath, compose, { spaces: 2 });
        }
    }
    
    console.log('✅ Validation complete!');
}

validateAndFix().catch(console.error);
