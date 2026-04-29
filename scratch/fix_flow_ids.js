const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(fullPath));
        } else {
            if (file === 'driver.flow.compose.json' || file === 'driver.compose.json') {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const driversDir = 'drivers';
const drivers = fs.readdirSync(driversDir).filter(f => fs.statSync(path.join(driversDir, f)).isDirectory());

drivers.forEach(driver => {
    const driverPath = path.join(driversDir, driver);
    const composePath = path.join(driverPath, 'driver.compose.json');
    const flowPath = path.join(driverPath, 'driver.flow.compose.json');

    let compose = null;
    let flow = null;

    if (fs.existsSync(composePath)) {
        try { compose = JSON.parse(fs.readFileSync(composePath, 'utf8')); } catch (e) { }
    }
    if (fs.existsSync(flowPath)) {
        try { flow = JSON.parse(fs.readFileSync(flowPath, 'utf8')); } catch (e) { }
    }

    if (flow) {
        let changed = false;
        ['triggers', 'conditions', 'actions'].forEach(section => {
            if (Array.isArray(flow[section])) {
                flow[section].forEach(card => {
                    if (card.id && !card.id.startsWith(driver)) {
                        console.log(`[FLOW-FIX] Prefixing ${card.id} in ${driver}`);
                        card.id = `${driver}_${card.id}`;
                        changed = true;
                    }
                });
            }
        });
        if (changed) {
            fs.writeFileSync(flowPath, JSON.stringify(flow, null, 2), 'utf8');
        }
    }

    if (compose && compose.flow) {
        let changed = false;
        ['triggers', 'conditions', 'actions'].forEach(section => {
            if (Array.isArray(compose.flow[section])) {
                compose.flow[section].forEach(card => {
                    if (card.id && !card.id.startsWith(driver)) {
                        console.log(`[COMPOSE-FIX] Prefixing ${card.id} in ${driver}`);
                        card.id = `${driver}_${card.id}`;
                        changed = true;
                    }
                });
            }
        });

        //  DEDUPLICATION: If a card in compose.flow is already in flow, remove it from compose.flow
        if (flow) {
            ['triggers', 'conditions', 'actions'].forEach(section => {
                if (Array.isArray(compose.flow[section]) && Array.isArray(flow[section])) {
                    const flowIds = new Set(flow[section].map(c => c.id));
                    const originalCount = compose.flow[section].length;
                    compose.flow[section] = compose.flow[section].filter(c => !flowIds.has(c.id));
                    if (compose.flow[section].length !== originalCount) {
                        console.log(`[DEDUP] Removed ${originalCount - compose.flow[section].length} cards from ${driver}/driver.compose.json`);
                        changed = true;
                    }
                }
            });
        }

        if (changed) {
            fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
        }
    }
});
