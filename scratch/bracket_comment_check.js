
const fs = require('fs');
const c = fs.readFileSync('drivers/presence_sensor_radar/device.js', 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/\{/g) || []).length;
  const closes = (line.match(/\}/g) || []).length;
  if (opens > 0 || closes > 0) {
    // Check if { is inside a comment or string
    // Simple check: // or * or ' or "
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
       console.log(`COMMENT line ${i+1}: ${line.trim()} (opens: ${opens}, closes: ${closes})`);
    } else if (line.includes('//') && line.indexOf('{') > line.indexOf('//')) {
       console.log(`TRAILING COMMENT line ${i+1}: ${line.trim()}`);
    }
  }
}
