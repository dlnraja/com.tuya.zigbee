
const fs = require('fs');
const c = fs.readFileSync('drivers/presence_sensor_radar/device.js', 'utf8');
const lines = c.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  depth += (opens - closes);
  if (depth > 2636) { // ridiculous depth check? No.
  }
}
console.log(`Final depth: ${depth}`);
