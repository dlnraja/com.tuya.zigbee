const fs = require('fs');
const {execSync} = require('child_process');

console.log('🚀 QUICK PROJECT ORGANIZATION');

// Create directories
['scripts', 'docs', 'refs'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
});

// Create enhanced README for Homey App
const homeyReadme = `# Universal Tuya Zigbee Device App

## For Homey Users
Support for 150+ generic Tuya Zigbee devices. Connect unlabeled smart switches, sensors, and controllers to your Homey.

### Supported Categories
- Smart Lighting (switches, dimmers, RGB)
- Sensors (motion, door/window, temperature)  
- Energy Monitoring (smart plugs, meters)
- Climate Control (thermostats, valves)
- Security (smoke detectors, alarms)

### Installation
1. Install from Homey App Store
2. Add devices via Homey Settings > Zigbee
3. Select device category that matches your hardware

Built with ❤️ by the community based on Johan Bendz's work.`;

fs.writeFileSync('README.md', homeyReadme);

// Commit changes
execSync('git add -A && git commit -m "📁 ORGANIZE: Project structure" && git push origin master');
console.log('✅ Project organized and committed');
