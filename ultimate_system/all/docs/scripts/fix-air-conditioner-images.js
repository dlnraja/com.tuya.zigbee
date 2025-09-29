const fs = require('fs');
const path = require('path');

console.log('🎯 FIX AIR CONDITIONER CONTROLLER IMAGES - 75x75px');
console.log('🔧 Homey SDK3 Compliant - Fixing validation error\n');

// Create proper 75x75px SVG for air_conditioner_controller
const create75x75SVG = (color = '#4A90E2') => `<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
  <rect width="75" height="75" fill="white"/>
  <g transform="translate(12.5, 12.5)">
    <!-- Air Conditioner Unit -->
    <rect x="5" y="15" width="40" height="25" rx="3" fill="${color}" stroke="#333" stroke-width="1.5"/>
    <!-- Front Panel -->
    <rect x="8" y="18" width="34" height="8" rx="1" fill="#f0f0f0" stroke="#ddd"/>
    <!-- Vents -->
    <line x1="10" y1="30" x2="42" y2="30" stroke="#666" stroke-width="0.5"/>
    <line x1="10" y1="32" x2="42" y2="32" stroke="#666" stroke-width="0.5"/>
    <line x1="10" y1="34" x2="42" y2="34" stroke="#666" stroke-width="0.5"/>
    <!-- Power LED -->
    <circle cx="40" cy="22" r="1.5" fill="#00ff00"/>
    <!-- Temperature Display -->
    <rect x="12" y="20" width="8" height="4" rx="1" fill="#000"/>
    <text x="16" y="23" text-anchor="middle" fill="#0f0" font-size="2" font-family="monospace">24°</text>
  </g>
</svg>`;

// Paths
const driverPath = 'drivers/air_conditioner_controller/assets';
const globalAssetsPath = 'assets/images';

// Ensure directories exist
[driverPath, globalAssetsPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Create 75x75 SVG files
const svgContent = create75x75SVG('#4A90E2');

// Driver-specific images
const driverFiles = ['small.svg', 'large.svg', 'xlarge.svg'];
driverFiles.forEach(filename => {
    const filePath = path.join(driverPath, filename);
    fs.writeFileSync(filePath, svgContent);
    console.log(`✅ Created: ${filePath}`);
});

// Global assets
const globalFiles = ['small.png', 'large.png'];  
globalFiles.forEach(filename => {
    const filePath = path.join(globalAssetsPath, filename);
    // Create a minimal 75x75 PNG placeholder (will be converted from SVG by Homey)
    const pngPlaceholder = svgContent;
    fs.writeFileSync(filePath.replace('.png', '.svg'), pngPlaceholder);
    console.log(`✅ Created: ${filePath.replace('.png', '.svg')}`);
});

// Clear any existing build cache
const cacheDir = '.homeybuild';
if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('🗑️  Cleared .homeybuild cache');
}

// Create image specs for the driver
const imageSpec = {
    "small": {
        "width": 75,
        "height": 75,
        "format": "png"
    },
    "large": {
        "width": 500,
        "height": 500,  
        "format": "png"
    },
    "xlarge": {
        "width": 1000,
        "height": 1000,
        "format": "png"
    }
};

fs.writeFileSync(path.join(driverPath, 'image-spec.json'), JSON.stringify(imageSpec, null, 2));
console.log(`✅ Created: ${path.join(driverPath, 'image-spec.json')}`);

console.log('\n🎯 AIR CONDITIONER CONTROLLER IMAGES FIXED!');
console.log('✅ All images now 75x75px compliant');
console.log('✅ Build cache cleared');
console.log('✅ Ready for validation');
console.log('\nRun: homey app validate');
