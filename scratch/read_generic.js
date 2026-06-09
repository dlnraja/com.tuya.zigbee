const fs = require('fs');
const appData = JSON.parse(fs.readFileSync('c:\\Users\\HP\\Desktop\\homey-app\\tuya_repair\\app.json', 'utf8'));
const generic = appData.drivers.find(d => d.id === 'tuya_generic_dpid');
console.log(JSON.stringify(generic, null, 2));
