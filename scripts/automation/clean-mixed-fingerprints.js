const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// The problematic identifiers that belong to battery-powered devices
const BATTERY_PIDS = ['ZG-301Z', 'TS0043'];
const BATTERY_MFRS = ['HOBEIAN', '_TZ3000_BCZR4E10', '_TZ3000_bczr4e10'];

// Battery drivers where they should be added (if not already)
const BUTTON_DRIVERS = {
  1: 'button_wireless_1',
  2: 'button_wireless_2',
  3: 'button_wireless_3',
  4: 'button_wireless_4',
  5: 'button_wireless_6', // fallback
  6: 'scene_switch_1',
  7: 'scene_switch_2',
  8: 'scene_switch_3',
  9: 'scene_switch_4',
  10: 'remote_button_wireless',
  11: 'button_wireless_scene'
};

function cleanDriver(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;

    let composeData;
    try {
        composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (e) {
        console.error(`Error parsing ${composePath}: ${e.message}`);
        return;
    }

    const capabilities = composeData.capabilities || [];
    
    // Check if the driver supports battery
    const hasBattery = capabilities.includes('measure_battery') || capabilities.includes('alarm_battery');

    let changed = false;

    if (!hasBattery) {
        // Remove bad fingerprints
        if (composeData.zigbee && composeData.zigbee.productId) {
            const originalLength = composeData.zigbee.productId.length;
            composeData.zigbee.productId = composeData.zigbee.productId.filter(pid => !BATTERY_PIDS.includes(pid));
            if (composeData.zigbee.productId.length !== originalLength) changed = true;
        }

        if (composeData.zigbee && composeData.zigbee.manufacturerName) {
            const originalLength = composeData.zigbee.manufacturerName.length;
            composeData.zigbee.manufacturerName = composeData.zigbee.manufacturerName.filter(mfr => {
                const upperMfr = mfr.toUpperCase();
                return !BATTERY_MFRS.map(b => b.toUpperCase()).includes(upperMfr);
            });
            if (composeData.zigbee.manufacturerName.length !== originalLength) changed = true;
        }

        if (changed) {
            fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2) + '\n');
            console.log(`Cleaned non-battery driver: ${path.basename(driverPath)}`);
        }
    } else {
        // This is a battery driver. Add if it's one of our button_wireless targets
        const driverId = path.basename(driverPath);
        const isTarget = Object.values(BUTTON_DRIVERS).includes(driverId);
        
        if (isTarget) {
            if (!composeData.zigbee) composeData.zigbee = {};
            
            // Add ZG-301Z and TS0043
            if (!composeData.zigbee.productId) composeData.zigbee.productId = [];
            for (const pid of BATTERY_PIDS) {
                if (!composeData.zigbee.productId.includes(pid)) {
                    composeData.zigbee.productId.push(pid);
                    changed = true;
                }
            }

            // Add HOBEIAN
            if (!composeData.zigbee.manufacturerName) composeData.zigbee.manufacturerName = [];
            if (!composeData.zigbee.manufacturerName.includes('HOBEIAN')) {
                composeData.zigbee.manufacturerName.push('HOBEIAN');
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2) + '\n');
                console.log(`Added fingerprints to battery driver: ${driverId}`);
            }
        }
    }
}

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
drivers.forEach(driver => cleanDriver(path.join(DRIVERS_DIR, driver)));

console.log('Cleanup complete.');
