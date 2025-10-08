const fs = require('fs');
const path = require('path');

console.log('📋 ORGANIZING FILES - CYCLE 2/10');

// Create cycle2 results folder
const cycleDir = './dev-tools/cycle2-results';
if (!fs.existsSync(cycleDir)) {
    fs.mkdirSync(cycleDir, { recursive: true });
}

// Move all analysis files to organized structure
const files = [
    './dev-tools/scan-result.txt',
    './dev-tools/image-report.json', 
    './dev-tools/external-data.json'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        const basename = path.basename(file);
        fs.copyFileSync(file, `${cycleDir}/${basename}`);
        console.log(`✅ Moved: ${basename}`);
    }
});

console.log('📁 Files organized in cycle2-results/');
