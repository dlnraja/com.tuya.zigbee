const fs = require('fs');

console.log('🔍 QUICK DRIVER CHECK');

let created = 0;
fs.readdirSync('drivers').forEach(d => {
    const dir = `drivers/${d}`;
    
    // Check assets/images
    if (!fs.existsSync(`${dir}/assets/images`)) {
        fs.mkdirSync(`${dir}/assets/images`, { recursive: true });
        created++;
    }
    
    // Check device.js
    if (!fs.existsSync(`${dir}/device.js`)) {
        const template = `'use strict';
const { Device } = require('homey');
class MyDevice extends Device {
  async onInit() {
    this.log('Device initialized');
  }
}
module.exports = MyDevice;`;
        fs.writeFileSync(`${dir}/device.js`, template);
        created++;
    }
});

console.log(`✅ Created ${created} files`);
console.log('🚀 Ready for validation!');
