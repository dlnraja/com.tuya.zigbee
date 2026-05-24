const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/community-sync/issue-123-enriched.json');
const driversPath = path.join(__dirname, '../drivers');

const enrichedData = JSON.parse(fs.readFileSync(dataPath, 'utf8')).enrichedData;

let addedCount = 0;

enrichedData.forEach(entry => {
  const driver = entry.driver;
  const mfr = entry.mfr;
  const pid = entry.productId;
  
  if (!driver || !mfr || !pid) return;
  
  const composePath = path.join(driversPath, driver, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    console.log(`Driver ${driver} not found for ${mfr}`);
    return;
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  
  if (!compose.zigbee) {
    compose.zigbee = { manufacturerName: [], productId: [] };
  }
  
  let mfrs = Array.isArray(compose.zigbee.manufacturerName) ? compose.zigbee.manufacturerName : [compose.zigbee.manufacturerName].filter(Boolean);
  let pids = Array.isArray(compose.zigbee.productId) ? compose.zigbee.productId : [compose.zigbee.productId].filter(Boolean);
  
  let modified = false;
  if (!mfrs.includes(mfr)) {
    mfrs.push(mfr);
    modified = true;
  }
  if (!pids.includes(pid)) {
    pids.push(pid);
    modified = true;
  }
  
  if (modified) {
    compose.zigbee.manufacturerName = mfrs;
    compose.zigbee.productId = pids;
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
    addedCount++;
    console.log(`Added ${mfr} / ${pid} to ${driver}`);
  }
});

console.log(`Total drivers updated: ${addedCount}`);
