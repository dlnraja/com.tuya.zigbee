const fs = require('fs');
let txt = fs.readFileSync('drivers/soil_sensor/device.js', 'utf8');

const injectionStr = 
    if (dp === 109) {
      // v5.13.X: DP109 = Soil Moisture alternative (seen on A89G12C)
      let calibratedMoisture = parsedValue + (this._moistureCalibration || 0);
      calibratedMoisture = Math.max(0, Math.min(100, calibratedMoisture));
      this.log('[SOIL]  SOIL MOISTURE DP109 = ' + parsedValue + '% -> ' + calibratedMoisture + '%');
      
      let cap = this.hasCapability('measure_humidity.soil') ? 'measure_humidity.soil' : 'measure_humidity'      ;
      if (this.hasCapability(cap)) {
        this.setCapabilityValue(cap, parseFloat(calibratedMoisture)).catch(()=>{});
      }
      return;
    }
;

if(!txt.includes('DP109 = Soil Moisture')) {
  txt = txt.replace('if (dp === 3) {', injectionStr + '\n    if (dp === 3) {');
  fs.writeFileSync('drivers/soil_sensor/device.js', txt);
  console.log('Added DP109 support to soil_sensor device.js');
}
