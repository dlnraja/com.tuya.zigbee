const fs = require('fs');
const dirs = fs.readdirSync('drivers');
for (const d of dirs) {
  const p = \drivers/\/driver.compose.json\;
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const z = data.zigbee;
    if (z && z.manufacturerName && z.productId) {
      if (z.manufacturerName.includes('_TZ3000_otvn3lne') && z.productId.includes('TS0202')) {
        console.log(\Found exact match in \\);
      } else if (z.manufacturerName.includes('_TZ3000_otvn3lne')) {
        console.log(\Found MFR match in \\);
      } else if (z.productId.includes('TS0202')) {
        console.log(\Found PID match in \\);
      }
    }
  }
}
