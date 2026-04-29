const fs = require('fs');
const path = 'lib/devices/TuyaUnifiedDevice.js';
let content = fs.readFileSync(path, 'utf8');

const target = ".replace(/\\safeDivide(0, g), '');";
const replacement = ".replace(/\\0/g, '');";

if (content.includes(target)) {
    console.log('Found target');
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content);
    console.log('Fixed TuyaUnifiedDevice.js');
} else {
    console.log('Target NOT found. Content around line 919:');
    const lines = content.split('\n');
    console.log(lines.slice(910, 930).join('\n'));
}
