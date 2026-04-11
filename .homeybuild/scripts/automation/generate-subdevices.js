// scripts/automation/generate-subdevices.js
/**
 * Auto-Ganger v7.0.22 - Dynamic SDK 3 Sub-Capability Generator
 * 
 * Automatically injects native dot-notation capabilities (onoff.1, onoff.2, etc.)
 * into driver.compose.json files for multi-gang devices.
 * 
 * This ensures Homey SDK 3 correctly groups buttons and provides independent Flow cards.
 */
const fs = require('fs');
const path = require('path');

// 1. Configuration Dictionary: Define which drivers need multiple gangs
const multiGangDefinitions = {
    "wifi_generic": { base: "onoff", count: 4 }, // Generic fallback handles up to 4 gangs
    "zigbee_gate_sw": { base: "onoff", count: 4 },
    "zigbee_dimmer": { base: "onoff", count: 2 },
    // Add specific high-volume drivers here
};

console.log('🚀 [Auto-Ganger] Starting dynamic SDK 3 sub-capability generation...');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

Object.entries(multiGangDefinitions).forEach(([driverName, config]) => {
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    
    if (fs.existsSync(composePath)) {
        try {
            const manifest = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            
            // 2. Generate Native Dot-Notation (SDK 3)
            const newCapabilities = [config.base]; // Always include parent (Gang 1)
            for (let i = 1; i < config.count; i++) {
                newCapabilities.push(`${config.base}.${i}`); // ex: onoff.1, onoff.2
            }

            // 3. Injection and Deduplication
            const currentCapabilities = manifest.capabilities || [];
            
            // Clean illegal/legacy capabilities (e.g., onoff_2, gang2_onoff, sw2)
            const cleanedCapabilities = currentCapabilities.filter(cap => 
                !cap.includes('_') && 
                !cap.startsWith('gang') &&
                !/^sw\d+$/.test(cap)
            );
            
            // Merge with new clean capabilities
            const merged = [...new Set([...cleanedCapabilities, ...newCapabilities])];

            // 4. Verification: Only write if changed to preserve mtime
            if (JSON.stringify(manifest.capabilities) !== JSON.stringify(merged)) {
                manifest.capabilities = merged;
                fs.writeFileSync(composePath, JSON.stringify(manifest, null, 2) + '\n');
                console.log(`✅ [Auto-Ganger] ${driverName} updated to ${config.count} gangs: [${merged.join(', ')}]`);
            } else {
                console.log(`ℹ️ [Auto-Ganger] ${driverName} already up-to-date.`);
            }
        } catch (e) {
            console.error(`❌ [Auto-Ganger] Failed to process ${driverName}:`, e.message);
        }
    } else {
        console.warn(`⚠️ [Auto-Ganger] Driver folder not found: ${driverName}`);
    }
});
