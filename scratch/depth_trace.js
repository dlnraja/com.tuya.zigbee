
const fs = require('fs');
const c = fs.readFileSync('drivers/presence_sensor_radar/device.js', 'utf8');
const lines = c.split('\n');
let depth = 0;
for (let i = 533; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  const oldDepth = depth;
  depth += (opens - closes);
  if (depth !== oldDepth) {
      console.log(`${i+1} | depth: ${depth} | ${line.trim()}`);
  }
}
