const fs = require('fs');
const path = require('path');
const driversDir = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers';

const drivers = fs.readdirSync(driversDir);

drivers.forEach(driver => {
    const driverPath = path.join(driversDir, driver);
    if (!fs.statSync(driverPath).isDirectory()) return;

    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;

    try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        if (compose.images) {
            const assetsDir = path.join(driverPath, 'assets');
            const imagesDir = path.join(assetsDir, 'images');

            if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir);
                console.log(`Created ${imagesDir}`);
            }
        }
    } catch (e) {
        console.error(`Error in ${driver}: ${e.message}`);
    }
});
