const fs = require('fs');
const path = require('path');

console.log('🖼️ IMAGE COHERENCE CHECK - CYCLE 2/10');

const driversPath = './drivers';
const drivers = fs.readdirSync(driversPath);

let missingImages = [];
let gangMismatches = [];

for (const driver of drivers) {
    const assetsPath = path.join(driversPath, driver, 'assets');
    if (!fs.existsSync(assetsPath)) {
        missingImages.push(driver);
    }
    
    if (driver.includes('gang')) {
        gangMismatches.push(driver);
    }
}

console.log(`❌ Missing images: ${missingImages.length}`);
console.log(`⚠️ Gang switches need review: ${gangMismatches.length}`);

const report = {
    totalDrivers: drivers.length,
    missingImages: missingImages.length,
    gangSwitches: gangMismatches
};

fs.writeFileSync('./dev-tools/image-report.json', JSON.stringify(report, null, 2));
