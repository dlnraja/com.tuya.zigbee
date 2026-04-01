const fs = require('fs');
const file = 'drivers/soil_sensor/device.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/temperatureMeasurement: \{/g, "temperatureMeasurement: {\n        requireBinding: false,\n        requireReporting: false,");
content = content.replace(/relativeHumidity: \{/g, "relativeHumidity: {\n        requireBinding: false,\n        requireReporting: false,");
content = content.replace(/powerConfiguration: \{/g, "powerConfiguration: {\n        requireBinding: false,\n        requireReporting: false,");

fs.writeFileSync(file, content);
console.log('Patched soil_sensor device.js');
