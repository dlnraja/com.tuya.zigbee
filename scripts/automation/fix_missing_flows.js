const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');

function main() {
    console.log('--- Starting Flows Auto-Fix ---');

    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    let fixedDrivers = 0;

    for (const d of driverDirs) {
        const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
        const flowComposePath = path.join(DRIVERS_DIR, d, 'driver.flow.compose.json');

        if (!fs.existsSync(composePath)) continue;

        try {
            let flowComposeData = { triggers: [], conditions: [], actions: [] };
            if (fs.existsSync(flowComposePath)) {
                flowComposeData = JSON.parse(fs.readFileSync(flowComposePath, 'utf8'));
            }
            if (!flowComposeData.triggers) flowComposeData.triggers = [];

            const hasGangs = d.includes('gang');
            const match = d.match(/(\d+)gang/);
            const numGangs = match ? parseInt(match[1]) : 0;

            let modified = false;

            if (numGangs > 0) {
                for (let i = 1; i <= numGangs; i++) {
                    const expectedOnId = `${d}_physical_gang${i}_on`;
                    const expectedOffId = `${d}_physical_gang${i}_off`;

                    const hasOn = flowComposeData.triggers.some(t => t.id === expectedOnId);
                    const hasOff = flowComposeData.triggers.some(t => t.id === expectedOffId);

                    if (!hasOn) {
                        flowComposeData.triggers.push({
                            id: expectedOnId,
                            args: [],
                            title: {
                                en: `Turned on - physical (Gang ${i})`
                            }
                        });
                        modified = true;
                        console.log(`[FIXED] Added ${expectedOnId} to ${d}`);
                    }
                    if (!hasOff) {
                        flowComposeData.triggers.push({
                            id: expectedOffId,
                            args: [],
                            title: {
                                en: `Turned off - physical (Gang ${i})`
                            }
                        });
                        modified = true;
                        console.log(`[FIXED] Added ${expectedOffId} to ${d}`);
                    }
                }
            }

            if (modified) {
                fs.writeFileSync(flowComposePath, JSON.stringify(flowComposeData, null, 2) + '\n', 'utf8');
                fixedDrivers++;
            }

        } catch (e) {
            console.error(`Error processing ${d}: ${e.message}`);
        }
    }

    console.log('--- Summary ---');
    console.log(`Fixed Drivers: ${fixedDrivers}`);
}

main();
