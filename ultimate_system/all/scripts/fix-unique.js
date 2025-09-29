const fs = require('fs');
const path = require('path');

const UNIQUE_DB = {
  motion: {mfg: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb'], prod: ['TS0202']},
  switch: {mfg: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar'], prod: ['TS0001']},
  plug: {mfg: ['_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw'], prod: ['TS011F']},
  curtain: {mfg: ['_TZE200_fctwhugx'], prod: ['TS130F']},
  co2: {mfg: ['_TZE200_cwbvmsar'], prod: ['TS0601']},
  contact: {mfg: ['_TZ3000_26fmupbb'], prod: ['TS0203']}
};

const driversDir = path.join(__dirname, '../drivers');
fs.readdirSync(driversDir).forEach(driver => {
  const driverPath = path.join(driversDir, driver, 'driver.compose.json');
  if (fs.existsSync(driverPath)) {
    const data = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    const cat = Object.keys(UNIQUE_DB).find(k => driver.includes(k)) || 'switch';
    data.zigbee.manufacturerName = UNIQUE_DB[cat].mfg;
    data.zigbee.productId = UNIQUE_DB[cat].prod;
    fs.writeFileSync(driverPath, JSON.stringify(data, null, 2));
  }
});
console.log('✅ Unique IDs assigned');
