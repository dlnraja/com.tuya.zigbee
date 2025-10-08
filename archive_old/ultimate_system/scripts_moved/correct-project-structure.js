const fs = require('fs');

console.log('📁 CORRECT PROJECT STRUCTURE');
console.log('⚠️  Keeping Homey-required files at root');
console.log('🎯 app.js MUST stay at root for validation\n');

// Files that MUST stay at root for Homey validation
const HOMEY_ROOT_REQUIRED = [
    'app.json', 'app.js', 'package.json', 'package-lock.json',
    'README.md', '.gitignore', 'LICENSE', 'SECURITY.md',
    '.github', 'drivers', 'settings', 'assets', 'locales'
];

// Move app.js back to root if it was moved
if (fs.existsSync('docs/scripts/app.js')) {
    fs.renameSync('docs/scripts/app.js', 'app.js');
    console.log('✅ Moved app.js back to root');
} else if (fs.existsSync('scripts/app.js')) {
    fs.renameSync('scripts/app.js', 'app.js');
    console.log('✅ Moved app.js back to root');
}

// Create app.js if missing
if (!fs.existsSync('app.js')) {
    const appTemplate = `'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {

  async onInit() {
    this.log('Ultimate Tuya Zigbee Hub - Community Edition v2.0.0 initialized');
    
    // Initialize debug logging setting
    this.debugLogging = this.homey.settings.get('debug_logging') || false;
    
    // Listen for settings changes
    this.homey.settings.on('set', (key) => {
      if (key === 'debug_logging') {
        this.debugLogging = this.homey.settings.get('debug_logging');
        this.log('Debug logging', this.debugLogging ? 'enabled' : 'disabled');
      }
    });
  }

  log(...args) {
    if (this.debugLogging) {
      console.log('[Ultimate Tuya Zigbee Hub]', ...args);
    }
  }

}

module.exports = TuyaZigbeeApp;`;
    fs.writeFileSync('app.js', appTemplate);
    console.log('✅ Created app.js');
}

console.log('📁 Project structure corrected');
console.log('🚀 Ready for Homey validation!');
