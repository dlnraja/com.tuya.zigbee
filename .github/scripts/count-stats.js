const fs = require('fs');
const path = require('path');
const driversDir = path.join(__dirname, '..', '..', 'drivers');
let drivers = 0, fps = 0, flows = 0;
for (const dr of fs.readdirSync(driversDir)) {
  const dc = path.join(driversDir, dr, 'driver.compose.json');
  if (fs.existsSync(dc)) {
    drivers++;
    try {
      const j = JSON.parse(fs.readFileSync(dc, 'utf8'));
      if (j.zigbee && typeof j.zigbee === 'object') {
        if (Array.isArray(j.zigbee)) {
          for (const z of j.zigbee) {
            if (Array.isArray(z.manufacturerName)) fps += z.manufacturerName.length;
          }
        } else if (j.zigbee.manufacturerName) {
          fps += Array.isArray(j.zigbee.manufacturerName) ? j.zigbee.manufacturerName.length : 1;
        }
      }
    } catch (e) {}
  }
  const fc = path.join(driversDir, dr, 'driver.flow.compose.json');
  if (fs.existsSync(fc)) {
    try {
      const j = JSON.parse(fs.readFileSync(fc, 'utf8'));
      flows += (j.triggers || []).length + (j.conditions || []).length + (j.actions || []).length;
    } catch (e) {}
  }
}
console.log(JSON.stringify({ drivers, fps, flows }));
