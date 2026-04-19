const fs = require('fs');
let txt = fs.readFileSync('drivers/soil_sensor/device.js', 'utf8');

const dp101Injection = "\n" +
"    if (dp === 101) {\n" +
"      this.log('[SOIL]  AIR HUMIDITY DP101 = ' + parsedValue + '%');\n" +
"      if (this.hasCapability('measure_humidity')) {\n" +
"        this.setCapabilityValue('measure_humidity', parseFloat(parsedValue)).catch(()=>{});\n" +
"      }\n" +
"      return;\n" +
"    }\n";

if (!txt.includes('if (dp === 101)')) {
    txt = txt.replace('if (dp === 109) {', dp101Injection + '    if (dp === 109) {');
    fs.writeFileSync('drivers/soil_sensor/device.js', txt);
    console.log('Injected DP101 handler');
} else {
    console.log('DP101 handler already present');
}
