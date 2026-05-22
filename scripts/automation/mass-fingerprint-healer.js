const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');
const FINGERPRINTS_JSON = path.join(ROOT_DIR, 'data', 'fingerprints.json');

function main() {
    console.log('--- Starting Mass Fingerprint Auto-Heal ---');

    // 1. Load fingerprints.json
    if (!fs.existsSync(FINGERPRINTS_JSON)) {
        console.error('fingerprints.json not found!');
        return;
    }
    const fingerprintsData = JSON.parse(fs.readFileSync(FINGERPRINTS_JSON, 'utf8'));
    console.log(`Loaded ${Object.keys(fingerprintsData).length} fingerprints from data/fingerprints.json`);

    // 2. Load all driver.compose.json files
    const driverFiles = {};
    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    
    // collisionMap: "mfs_pid" -> driverName
    const collisionMap = new Map();

    for (const d of driverDirs) {
        const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
            try {
                const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                if (composeData.zigbee && composeData.zigbee.manufacturerName && composeData.zigbee.productId) {
                    driverFiles[d] = {
                        path: composePath,
                        data: composeData,
                        mfs: composeData.zigbee.manufacturerName.map(m => m.toLowerCase().trim()),
                        pids: composeData.zigbee.productId.map(p => p.trim())
                    };

                    // Populate collision map
                    for (const mfs of composeData.zigbee.manufacturerName) {
                        for (const pid of composeData.zigbee.productId) {
                            const key = `${mfs.toLowerCase().trim()}_${pid.trim()}`;
                            if (!collisionMap.has(key)) {
                                collisionMap.set(key, [d]);
                            } else {
                                collisionMap.get(key).push(d);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(`Error reading ${composePath}: ${e.message}`);
            }
        }
    }

    console.log(`Loaded ${Object.keys(driverFiles).length} Zigbee drivers.`);

    let fixedCount = 0;
    let collisionCount = 0;
    const modifiedDrivers = new Set();

    // 3. Process fingerprints.json
    for (const [mfs, fpData] of Object.entries(fingerprintsData)) {
        const targetDriver = fpData.driverId;
        const pids = fpData.modelIds || [];

        if (!targetDriver || pids.length === 0) continue;

        const driverInfo = driverFiles[targetDriver];
        if (!driverInfo) {
            console.warn(`[WARN] Target driver '${targetDriver}' not found for ${mfs}`);
            continue;
        }

        const normalizedMfs = mfs.toLowerCase().trim();
        let needsInjection = false;
        
        // Ensure mfs is in driver's zigbee.manufacturerName
        if (!driverInfo.mfs.includes(normalizedMfs)) {
            // Check for potential collisions before adding mfs to the driver
            let safeToAddMfs = true;
            for (const driverPid of driverInfo.pids) {
                const key = `${normalizedMfs}_${driverPid}`;
                const existingDrivers = collisionMap.get(key) || [];
                // If it already exists in ANOTHER driver, adding this mfs would create a collision
                if (existingDrivers.length > 0 && !existingDrivers.includes(targetDriver)) {
                    console.warn(`[COLLISION RISK] Cannot add ${mfs} to ${targetDriver}. It would collide with ${driverPid} in ${existingDrivers.join(',')}`);
                    safeToAddMfs = false;
                    collisionCount++;
                    break;
                }
            }

            if (safeToAddMfs) {
                console.log(`[HEAL] Injecting manufacturerName '${mfs}' into driver '${targetDriver}'`);
                driverInfo.data.zigbee.manufacturerName.push(mfs);
                driverInfo.mfs.push(normalizedMfs);
                needsInjection = true;
                
                // Update collision map for the newly added mfs
                for (const driverPid of driverInfo.pids) {
                    const key = `${normalizedMfs}_${driverPid}`;
                    if (!collisionMap.has(key)) {
                        collisionMap.set(key, [targetDriver]);
                    } else {
                        collisionMap.get(key).push(targetDriver);
                    }
                }
            }
        }

        // Ensure all pids are in driver's zigbee.productId
        for (const pid of pids) {
            if (!driverInfo.pids.includes(pid.trim())) {
                // Check for potential collisions before adding pid to the driver
                let safeToAddPid = true;
                for (const driverMfs of driverInfo.mfs) {
                    const key = `${driverMfs}_${pid.trim()}`;
                    const existingDrivers = collisionMap.get(key) || [];
                    if (existingDrivers.length > 0 && !existingDrivers.includes(targetDriver)) {
                         console.warn(`[COLLISION RISK] Cannot add productId ${pid} to ${targetDriver}. It would collide with ${driverMfs} in ${existingDrivers.join(',')}`);
                         safeToAddPid = false;
                         collisionCount++;
                         break;
                    }
                }

                if (safeToAddPid) {
                    console.log(`[HEAL] Injecting productId '${pid}' into driver '${targetDriver}'`);
                    driverInfo.data.zigbee.productId.push(pid);
                    driverInfo.pids.push(pid.trim());
                    needsInjection = true;
                    
                    // Update collision map
                    for (const driverMfs of driverInfo.mfs) {
                        const key = `${driverMfs}_${pid.trim()}`;
                        if (!collisionMap.has(key)) {
                            collisionMap.set(key, [targetDriver]);
                        } else {
                            collisionMap.get(key).push(targetDriver);
                        }
                    }
                }
            }
        }

        if (needsInjection) {
            modifiedDrivers.add(targetDriver);
            fixedCount++;
        }
    }

    // 4. Save modified drivers
    for (const driverName of modifiedDrivers) {
        const driverInfo = driverFiles[driverName];
        fs.writeFileSync(driverInfo.path, JSON.stringify(driverInfo.data, null, 2) + '\n', 'utf8');
        console.log(`[SAVED] Updated ${driverInfo.path}`);
    }

    console.log('--- Summary ---');
    console.log(`Fixed Fingerprints: ${fixedCount}`);
    console.log(`Collision Risks Avoided: ${collisionCount}`);
    console.log(`Modified Drivers: ${modifiedDrivers.size}`);
}

main();
