const fs = require('fs');
const { execSync } = require('child_process');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Remove deprecated packages
pkg.dependencies = {
    "homey-zigbeedriver": "^1.5.0",
    "homey": "^3.0.0",
    "fs-extra": "^11.2.0",
    "sharp": "^0.33.0",
    "jimp": "^0.22.12",
    "zigbee-clusters": "^1.0.0"
};

pkg.devDependencies = {
    "homey": "^3.0.0"
};

pkg.overrides = {
    "rimraf": "^5.0.5",
    "glob": "^10.3.0",
    "eslint": "^8.57.0"
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));

execSync('npm install --legacy-peer-deps');
execSync('git add -A && git commit -m "📦 Updated to modern packages" && git push origin master');

console.log('✅ Packages updated');
