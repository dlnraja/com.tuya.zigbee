const fs = require('fs');
let txt = fs.readFileSync('drivers/soil_sensor/device.js', 'utf8');

const injectionStr = "\n" +
"    if (dp === 109) {\n" +
"      // v5.13.X: DP109 = Soil Moisture alternative (seen on A89G12C)\n" +
"      let calibratedMoisture = parsedValue + (this._moistureCalibration || 0);\n" +
"      calibratedMoisture = Math.max(0, Math.min(100, calibratedMoisture));\n" +
"      this.log('[SOIL]  SOIL MOISTURE DP109 = ' + parsedValue + '% -> ' + calibratedMoisture + '%');\n" +
"      let cap = this.hasCapability('measure_humidity.soil') ? 'measure_humidity.soil' : 'measure_humidity';\n" +
"      if (this.hasCapability(cap)) {\n" +
"        this.setCapabilityValue(cap, parseFloat(calibratedMoisture)).catch(()=>{});\n" +
"      }\n" +
"      return;\n" +
"    }\n";

if(!txt.includes('DP109 = Soil Moisture')) {
  txt = txt.replace('if (dp === 3) {', injectionStr + '    if (dp === 3) {');
  fs.writeFileSync('drivers/soil_sensor/device.js', txt);
  console.log('Added DP109 support to soil_sensor device.js');
} else {
  console.log('DP109 already supported');
}
