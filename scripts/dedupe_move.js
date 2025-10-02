const fs = require('fs');

console.log('🎯 DÉDUPLICATION ET RÉORGANISATION MANUFACTURERS');

const mfrMap = new Map();
const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());

// Scanner tous les manufacturers
drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.zigbee?.manufacturerName) {
      data.zigbee.manufacturerName.forEach(m => {
        if (!mfrMap.has(m)) mfrMap.set(m, []);
        mfrMap.get(m).push(driver);
      });
    }
  }
});

// Éliminer doublons
let deduped = 0;
mfrMap.forEach((driverList, mfr) => {
  if (driverList.length > 1) {
    const keep = driverList[0]; // Garder premier
    driverList.slice(1).forEach(driver => {
      const file = `drivers/${driver}/driver.compose.json`;
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const idx = data.zigbee.manufacturerName.indexOf(mfr);
      if (idx > -1) {
        data.zigbee.manufacturerName.splice(idx, 1);
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        deduped++;
      }
    });
  }
});

console.log(`✅ ${deduped} doublons éliminés sur ${mfrMap.size} manufacturers`);
