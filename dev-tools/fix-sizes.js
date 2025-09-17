const fs = require('fs');
const path = require('path');

console.log('📐 FIX IMAGE SIZES - CYCLE 2/10');

// Standard SVG template 75x75
const svgTemplate = (color = '#4CAF50', icon = '') => `
<svg width="75" height="75" xmlns="http://www.w3.org/2000/svg">
  <rect width="75" height="75" fill="${color}" rx="8"/>
  ${icon}
</svg>`.trim();

function fixDriverImages(driverName) {
    const assetsPath = `./drivers/${driverName}/assets`;
    if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, {recursive: true});
    }
    
    const svg = svgTemplate();
    fs.writeFileSync(`${assetsPath}/icon.svg`, svg);
    console.log(`✅ Fixed ${driverName}`);
}

// Fix problematic drivers
const problemDrivers = [
    'air_conditioner_controller',
    'zbbridge', 
    'wireless_switch_6gang_cr2032'
];

problemDrivers.forEach(fixDriverImages);
