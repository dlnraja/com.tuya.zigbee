const fs = require('fs');
const path = require('path');

const driverPath = 'drivers/button_wireless_2/driver.compose.json';
const toRemove = [
  '_TYZB01_IUEPBMPV', '_TZ3000_1H2X4AKH', '_TZ3000_1OBWWNMQ', '_TZ3000_3OOAZ3NG',
  '_TZ3000_4UF3D0AX', '_TZ3000_88IQNHVD', '_TZ3000_CYMSNFVF', '_TZ3000_DKSBTRZS',
  '_TZ3000_DPO1YSAK', '_TZ3000_FUKAA7NC', '_TZ3000_GZNH2XLA', '_TZ3000_JAK16DLL',
  '_TZ3000_MRAOVVMM', '_TZ3000_PLYVNUF5', '_TZ3000_UPJRSXH1', '_TZ3000_VMPBYGS5',
  '_TZ3000_WZAUVBCS', '_TZ3000_AMDYMR7L', '_TZ3000_CPHMQ0Q7', '_TZ3000_G5XAWFCQ',
  '_TZ3000_KDI2O9M6', '_TZ3000_RDTIXBNU', '_TZ3000_TYPDPDPG', '_TZ3000_VZOPCETZ',
  '_TZ3000_W0QQDE0G', '_TZ3000_W8JWKCZZ', '_TZ3000_WAMQDR3F', '_TZ3000_YSDV91BK',
  '_TZ3210_7JNK7L3K'
];

if (fs.existsSync(driverPath)) {
  const compose = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
  if (compose.zigbee && compose.zigbee.manufacturerName) {
    const originalCount = compose.zigbee.manufacturerName.length;
    compose.zigbee.manufacturerName = compose.zigbee.manufacturerName.filter(m => !toRemove.includes(m));
    const newCount = compose.zigbee.manufacturerName.length;
    console.log(`Cleaned button_wireless_2: ${originalCount} -> ${newCount} manufacturer names.`);
    fs.writeFileSync(driverPath, JSON.stringify(compose, null, 2) + '\n');
  }
}
