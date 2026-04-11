const fs = require('fs');
const file = 'drivers/soil_sensor/driver.compose.json';
let content = fs.readFileSync(file, 'utf8');
const data = JSON.parse(content);

console.log("Endpoints block:", JSON.stringify(data.zigbee.endpoints, null, 2));
