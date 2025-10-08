const fs = require('fs');

console.log('🔧 FIX HOMEY SDK3 STRUCTURE');

// Restore essential files from archive to root
const essentialFiles = [
    '.homeychangelog.json',
    'README.txt'
];

essentialFiles.forEach(file => {
    const archivePath = `archive/${file}`;
    if (fs.existsSync(archivePath)) {
        fs.renameSync(archivePath, file);
        console.log(`✅ Restored: ${file}`);
    }
});

// Ensure app.js exists at root
if (!fs.existsSync('app.js')) {
    const appJs = `'use strict';
const Homey = require('homey');
class UniversalTuyaApp extends Homey.App {
  async onInit() {
    this.log('Universal Tuya Zigbee initialized');
  }
}
module.exports = UniversalTuyaApp;`;
    fs.writeFileSync('app.js', appJs);
    console.log('✅ Created: app.js');
}

console.log('✅ Homey SDK3 structure restored');
