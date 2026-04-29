
const fs = require('fs');
const c = fs.readFileSync('drivers/presence_sensor_radar/device.js', 'utf8');
const lines = c.split('\n');
let totalDiff = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  totalDiff += (opens - closes);
  if (opens !== closes) {
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          console.log(`UNBALALNCED COMMENT line ${i+1}: ${line.trim()} | diff: ${opens-closes} | current total: ${totalDiff}`);
      }
  }
}
console.log(`Final total diff: ${totalDiff}`);
