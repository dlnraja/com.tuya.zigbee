const fs = require('fs');

console.log('🎨 ADD DRIVER ASSETS');

const drivers = fs.readdirSync('drivers').slice(0, 10);

drivers.forEach(name => {
    const assetsPath = `drivers/${name}/assets`;
    
    // Create assets directory
    if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, {recursive: true});
    }
    
    // Create images directory
    const imagesPath = `${assetsPath}/images`;
    if (!fs.existsSync(imagesPath)) {
        fs.mkdirSync(imagesPath);
    }
    
    // Create icon.svg placeholder
    const iconPath = `${assetsPath}/icon.svg`;
    if (!fs.existsSync(iconPath)) {
        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#4CAF50" rx="10"/>
  <text x="50" y="55" text-anchor="middle" fill="white" font-size="12">TUYA</text>
</svg>`;
        fs.writeFileSync(iconPath, iconSvg);
    }
});

console.log(`✅ Added assets to ${drivers.length} drivers`);
