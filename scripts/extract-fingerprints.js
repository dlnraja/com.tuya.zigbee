const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');
const outputDir = path.join(__dirname, '../data');
const outputFile = path.join(outputDir, 'fingerprints.json');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const allFingerprints = {};
const drivers = fs.readdirSync(driversDir);

drivers.forEach(driverId => {
    const composePath = path.join(driversDir, driverId, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
        try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            if (compose.zigbee) {
                const fps = [];
                const manufacturers = Array.isArray(compose.zigbee.manufacturerName) ? compose.zigbee.manufacturerName : [compose.zigbee.manufacturerName].filter(Boolean);
                const products = Array.isArray(compose.zigbee.productId) ? compose.zigbee.productId : [compose.zigbee.productId].filter(Boolean);
                
                // If the driver has specific fingerprints array
                if (compose.zigbee.fingerprints) {
                    compose.zigbee.fingerprints.forEach(fp => {
                        const mfr = fp.manufacturerName;
                        const pid = fp.productId;
                        if (mfr && pid) {
                            allFingerprints[`${mfr}|${pid}`] = { driver: driverId, profile: compose.class };
                        }
                    });
                } else {
                    // Cartesion product of mfr and pid
                    manufacturers.forEach(mfr => {
                        products.forEach(pid => {
                            allFingerprints[`${mfr}|${pid}`] = { driver: driverId, profile: compose.class };
                        });
                    });
                }
            }
        } catch (e) {
            console.error(`Error parsing ${driverId}: ${e.message}`);
        }
    }
});

fs.writeFileSync(outputFile, JSON.stringify(allFingerprints, null, 2));
console.log(`Extracted ${Object.keys(allFingerprints).length} fingerprints to ${outputFile}`);
