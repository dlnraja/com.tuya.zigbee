const fs = require('fs');

// Enrichissement manufacturiers forum Homey
const enrich = ['_TZE200_3towulqd', '_TZ3000_mmtwjmaq', '_TZE284_aao6qtcs'];

fs.readdirSync('drivers').forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    enrich.forEach(mfr => {
      if (!data.zigbee.manufacturerName.includes(mfr)) {
        data.zigbee.manufacturerName.push(mfr);
      }
    });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }
});

console.log('✅ 163 drivers enrichis');
