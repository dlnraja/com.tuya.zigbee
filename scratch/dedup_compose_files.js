const fs = require('fs');
const path = require('path');

const driversDir = 'drivers';
const drivers = fs.readdirSync(driversDir).filter(f => fs.statSync(path.join(driversDir, f)).isDirectory());

drivers.forEach(driver => {
    const driverPath = path.join(driversDir, driver);
    const composePath = path.join(driverPath, 'driver.compose.json');
    const flowPath = path.join(driverPath, 'driver.flow.compose.json');

    if (fs.existsSync(composePath) && fs.existsSync(flowPath)) {
        try {
            let compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            let flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
            let changed = false;

            if (compose.flow) {
                ['triggers', 'conditions', 'actions'].forEach(section => {
                    if (Array.isArray(compose.flow[section]) && Array.isArray(flow[section])) {
                        const flowIds = new Set(flow[section].map(c => c.id));
                        const originalCount = compose.flow[section].length;
                        
                        compose.flow[section] = compose.flow[section].filter(card => {
                            if (flowIds.has(card.id)) {
                                console.log(`[REDUNDANT] Removing ${card.id} from ${composePath} (exists in flow.compose)`);
                                return false;
                            }
                            return true;
                        });
                        
                        if (compose.flow[section].length !== originalCount) changed = true;
                    }
                });
            }

            if (changed) {
                fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
            }
        } catch (e) {
            console.error(`Error processing ${driver}: ${e.message}`);
        }
    }
});
