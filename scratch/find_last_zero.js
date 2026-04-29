
const fs = require('fs');
const c = fs.readFileSync('drivers/presence_sensor_radar/device.js', 'utf8');
const lines = c.split('\n');
let depth = 0;
let lastZeroDepthLine = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  depth += (opens - closes);
  if (depth === 0) lastZeroDepthLine = i + 1;
}
console.log(`Last zero depth line: ${lastZeroDepthLine}`);
console.log(`Final depth: ${depth}`);
if (lastZeroDepthLine < lines.length) {
    console.log(`Unbalanced lines starting from ${lastZeroDepthLine + 1}:`);
    for (let i = lastZeroDepthLine; i < lines.length; i++) {
        console.log(`${i+1}: ${lines[i]}`);
    }
}
