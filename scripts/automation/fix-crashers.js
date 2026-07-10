const fs = require('fs');
const path = require('path');
const rootDir = path.join(process.cwd(), 'drivers');
const dirs = fs.readdirSync(rootDir);

let fixedCount = 0;

dirs.forEach(dir => {
    const deviceJs = path.join(rootDir, dir, 'device.js');
    if (!fs.existsSync(deviceJs)) return;
    let content = fs.readFileSync(deviceJs, 'utf8');
    let changed = false;

    if (content.includes('BatteryMixin')) {
        const lines = content.split('\n');
        // Filter out any require statement that imports BatteryMixin
        const newLines = lines.filter(l => !l.includes('require') || !l.includes('BatteryMixin'));
        content = newLines.join('\n');
        
        // Remove the BatteryMixin() wrapper
        content = content.replace(/BatteryMixin\(([A-Za-z0-9_]+)\)/g, '$1');
        changed = true;
    }

    if (content.includes('extends TuyaZigbeeDevice') && (content.includes('sendTuyaCommand') || content.includes('_tuyaEF00Manager'))) {
        content = content.replace(/extends\s+TuyaZigbeeDevice/g, 'extends BaseUnifiedDevice');
        // If BaseUnifiedDevice is not required, replace TuyaZigbeeDevice require
        if (!content.includes('BaseUnifiedDevice = require')) {
             content = content.replace(/const\s+TuyaZigbeeDevice\s*=\s*require\([^)]+\);/g, "const BaseUnifiedDevice = require('../../lib/devices/BaseUnifiedDevice');");
        }
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(deviceJs, content);
        fixedCount++;
    }
});
console.log('Fixed ' + fixedCount + ' files cleanly.');
