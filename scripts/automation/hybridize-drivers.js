const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function getGangCount(driverId) {
    const match = driverId.match(/_(\d+)gang/);
    if (match) return parseInt(match[1], 10);
    if (driverId === 'switch_wireless') return 1;
    // For general switch drivers, assume 1 gang unless specified
    return 1;
}

function processDriver(driverName) {
    const isTarget = driverName.startsWith('switch_') || 
                     driverName.startsWith('wall_switch_') || 
                     driverName.startsWith('dimmer_') ||
                     driverName.startsWith('tuya_switch');
                     
    if (!isTarget) return;

    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;

    let data;
    try {
        data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (e) {
        console.error(`Error parsing ${composePath}: ${e.message}`);
        return;
    }

    let changed = false;

    // 1. Inject measure_battery
    if (!data.capabilities) data.capabilities = [];
    if (!data.capabilities.includes('measure_battery')) {
        data.capabilities.push('measure_battery');
        changed = true;
    }
    
    // Ensure alarm_battery is NOT present (Rule 4: NEVER include both)
    if (data.capabilities.includes('alarm_battery')) {
        data.capabilities = data.capabilities.filter(c => c !== 'alarm_battery');
        changed = true;
    }

    // 2. Inject button.X capabilities for scene switch support
    const gangCount = getGangCount(driverName);
    for (let i = 1; i <= gangCount; i++) {
        const btnCap = `button.${i}`;
        if (!data.capabilities.includes(btnCap)) {
            data.capabilities.push(btnCap);
            changed = true;
        }

        // Hide the button from the UI (maintenanceAction)
        if (!data.capabilitiesOptions) data.capabilitiesOptions = {};
        if (!data.capabilitiesOptions[btnCap]) {
            data.capabilitiesOptions[btnCap] = {
                title: {
                    en: `Button ${i}`,
                    fr: `Bouton ${i}`
                },
                maintenanceAction: true,
                getable: false,
                setable: false
            };
            changed = true;
        }
    }

    // Add battery title to capabilitiesOptions if needed
    if (!data.capabilitiesOptions['measure_battery']) {
        data.capabilitiesOptions['measure_battery'] = {
            title: {
                en: "Battery",
                fr: "Batterie",
                nl: "Batterij",
                de: "Batterie"
            }
        };
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(composePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`[Hybridized] ${driverName} -> measure_battery + ${gangCount} buttons`);
    }
}

const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
dirs.forEach(processDriver);
console.log('Hybridization complete.');
