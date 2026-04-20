const fs = require('fs');
let txt = fs.readFileSync('drivers/soil_sensor/device.js', 'utf8');

txt = txt.replace(
    "111: { capability: 'alarm_water', transform: (v) => v === 1 },", 
    "111: { capability: 'alarm_water', transform: (v) => v === 1 },\n        112: { capability: 'measure_conductivity', divisor: 1 }, // soil fertility uS/cm"
);

fs.writeFileSync('drivers/soil_sensor/device.js', txt);
