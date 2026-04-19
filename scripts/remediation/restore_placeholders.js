const fs = require('fs');
const path = require('path');
const src = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\692b5033-131a-4da8-ba2f-e7bba51f3a92\\tuya_placeholder_1776610217992.png';
const driversDir = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair\\drivers';

const drivers = fs.readdirSync(driversDir);

drivers.forEach(driver => {
    const driverPath = path.join(driversDir, driver);
    if (!fs.statSync(driverPath).isDirectory()) return;

    const assetsDir = path.join(driverPath, 'assets');
    const imagesDir = path.join(assetsDir, 'images');

    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

    try {
        fs.copyFileSync(src, path.join(imagesDir, 'small.png'));
        fs.copyFileSync(src, path.join(imagesDir, 'large.png'));
        fs.copyFileSync(src, path.join(imagesDir, 'xlarge.png'));
    } catch (e) {
        console.error(`Error in ${driver}: ${e.message}`);
    }
});
console.log('Restored placeholder images to all drivers.');
