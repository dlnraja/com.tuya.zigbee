#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const BRAIN_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\c64ea6fc-6dfd-41c6-8d02-8559d1a03449';

// Master Mapping (Category/Pattern to Image FileName)
const BRANDING_DIR = path.join(ROOT, 'assets', 'branding', 'nexus');

const MASTER_IMAGES = {
    // SWITCHES
    'switch_4gang': 'switch_4gang.png',
    'switch_4ch': 'switch_4gang.png',
    '4ch': 'switch_4gang.png',
    'switch_3gang': 'switch_3gang.png',
    'switch_3ch': 'switch_3gang.png',
    '3ch': 'switch_3gang.png',
    'switch_2gang': 'switch_2gang.png',
    'switch_2ch': 'switch_2gang.png',
    '2ch': 'switch_2gang.png',
    'switch_1gang': 'switch_1gang.png',
    'switch_1ch': 'switch_1gang.png',
    '1ch': 'switch_1gang.png',
    'button': 'switch_1gang.png', // Fallback for button
    'dimmer': 'switch_1gang.png', // Fallback for dimmer
    'mini_switch': 'switch_1gang.png',

    // PLUGS
    'plug': 'plug.png',
    'socket': 'plug.png',
    'outlet': 'plug.png',
    
    // LIGHTS
    'bulb': 'bulb.png',
    'light': 'bulb.png',
    'led': 'bulb.png',
    'strip': 'bulb.png',

    // SENSORS
    'radar': 'radar_sensor.png',
    'presence': 'radar_sensor.png',
    'motion': 'radar_sensor.png',
    'occupancy': 'radar_sensor.png',
    
    'leak': 'leak_sensor.png',
    'water_sensor': 'leak_sensor.png',
    'flood': 'leak_sensor.png',
    
    'smoke': 'smoke_detector.png',
    'gas': 'smoke_detector.png', // Fallback
    'co_sensor': 'smoke_detector.png',
    
    'climate': 'climate_sensor.png',
    'temp': 'climate_sensor.png',
    'humid': 'climate_sensor.png',
    'air_quality': 'climate_sensor.png',
    'co2': 'climate_sensor.png',

    // ACTUATORS
    'curtain': 'curtain_motor.png',
    'shutter': 'curtain_motor.png',
    'roller': 'curtain_motor.png',
    'blind': 'curtain_motor.png',
    'window': 'curtain_motor.png',
    'garage': 'curtain_motor.png',
    
    'valve': 'water_valve.png',
    'irrigation': 'water_valve.png',
    
    'heater': 'heater.png',
    'thermostat': 'heater.png',
    'radiator': 'heater.png',
    
    'lock': 'lock.png',
    'doorbell': 'siren.png', // Fallback for doorbell
    'siren': 'siren.png',
    'alarm': 'siren.png',
    
    'repeater': 'repeater.png',
    'bridge': 'repeater.png',
    'gateway': 'repeater.png',
    
    'knob': 'switch_1gang.png',
    'feeder': 'generic_box.png',
    'purifier': 'climate_sensor.png', // Fallback
    
    'generic': 'generic_box.png'
};

const LOG_FILE = path.join(ROOT, 'REPORTS', 'IMAGE_REBRANDING_LOG.md');

async function processImage(sourcePath, targetDir) {
    if (!fs.existsSync(sourcePath)) return false;
    
    fs.mkdirSync(targetDir, { recursive: true });
    
    try {
        // Create large.png (300x300)
        await sharp(sourcePath)
            .resize(300, 300, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(path.join(targetDir, 'large.png'));
            
        // Create small.png (75x75)
        await sharp(sourcePath)
            .resize(75, 75, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(path.join(targetDir, 'small.png'));
            
        // Create xlarge.png (500x500)
        await sharp(sourcePath)
            .resize(500, 500, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(path.join(targetDir, 'xlarge.png'));
    } catch (e) {
        console.error(`Error resizing ${sourcePath}: ${e.message}`);
        return false;
    }
        
    return true;
}

async function main() {
    console.log('  NEXUS IMAGE REBRANDING ENGINE');
    console.log('=================================');
    
    let stats = { updated: 0, skipped: 0, errors: 0 };
    let log = '#  Hybrid Engine Image Rebranding Log\n\n';
    log += `**Execution Date:** ${new Date().toISOString()}\n\n`;
    log += '| Driver | Category | Image Used | Status |\n';
    log += '|--------|----------|------------|--------|\n';

    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

    // Sort mappings by key length (descending) to ensure more specific matches (e.g. 'switch_4gang') are tested before less specific ones (e.g. 'switch')
    const sortedKeys = Object.keys(MASTER_IMAGES).sort((a, b) => b.length - a.length);

    for (const drv of drivers) {
        let matchedKey = null;
        
        // Find best matching category key
        for (const key of sortedKeys) {
            if (drv.toLowerCase().includes(key.toLowerCase())) {
                matchedKey = key;
                break;
            }
        }
        
        // FALLBACK: If no match and it's a generic/other class, use nexus box
        if (!matchedKey) {
            const composeFile = path.join(DRIVERS_DIR, drv, 'driver.compose.json');
            if (fs.existsSync(composeFile)) {
                try {
                    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
                    if (compose.class === 'other' || drv.includes('generic') || drv.includes('universal')) {
                        matchedKey = 'generic';
                    }
                } catch(e) {}
            }
        }
        
        // FINAL FALLBACK: Force generic for everything if still no match
        if (!matchedKey) {
             matchedKey = 'generic';
        }

        if (matchedKey) {
            const sourceImg = path.join(BRANDING_DIR, MASTER_IMAGES[matchedKey]);
            const targetDir = path.join(DRIVERS_DIR, drv, 'assets', 'images');
            
            try {
                const ok = await processImage(sourceImg, targetDir);
                if (ok) {
                    console.log(`   ${drv} -> ${matchedKey}`);
                    log += `| ${drv} | ${matchedKey} | ${MASTER_IMAGES[matchedKey]} |  Updated |\n`;
                    stats.updated++;
                } else {
                    console.warn(`    Source missing for ${matchedKey} (${drv}) - Expected: ${sourceImg}`);
                    log += `| ${drv} | ${matchedKey} | - |  Missing Source |\n`;
                    stats.errors++;
                }
            } catch (err) {
                console.error(`   Error processing ${drv}:`, err.message);
                log += `| ${drv} | ${matchedKey} | - |  Error: ${err.message} |\n`;
                stats.errors++;
            }
        } else {
            log += `| ${drv} | - | - |  Skipped (No match) |\n`;
            stats.skipped++;
        }
    }

    fs.mkdirSync(path.join(ROOT, 'REPORTS'), { recursive: true });
    fs.writeFileSync(LOG_FILE, log);
    
    console.log('\n Rebranding Complete.');
    console.log(` Updated: ${stats.updated} | Skipped: ${stats.skipped} | Errors: ${stats.errors}`);
    console.log(` Report saved to REPORTS/IMAGE_REBRANDING_LOG.md`);
}

main().catch(console.error);
