const fs = require('fs');

console.log('🏷️ CYCLE 4/10: ENRICHISSEMENT MANUFACTURER IDS');

// Manufacturer IDs complets avec suffixes
const manufacturerIds = [
  "_TZE284_uqfph8ah", "_TZE284_bjawzodf", "_TZE284_",
  "_TZE200_", "_TZE200_bjawzodf", "_TZE200_s8gkrkxk",
  "_TZ3000_", "_TZ3000_kmh5qpmb", "_TZ3000_odygigth",
  "_TZ3400_", "_TYZB01_", "_TYST11_"
];

let enriched = 0;
let totalIds = 0;

fs.readdirSync('drivers').forEach(driver => {
  const f = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(f)) {
    let c = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!c.zigbee) c.zigbee = {};
    if (!c.zigbee.manufacturerName) c.zigbee.manufacturerName = [];
    
    let added = 0;
    manufacturerIds.forEach(id => {
      if (!c.zigbee.manufacturerName.includes(id)) {
        c.zigbee.manufacturerName.push(id);
        added++;
        totalIds++;
      }
    });
    
    if (added > 0) {
      fs.writeFileSync(f, JSON.stringify(c, null, 2));
      enriched++;
    }
  }
});

console.log(`✅ CYCLE 4 TERMINÉ - ${enriched} drivers enrichis, ${totalIds} IDs ajoutés`);
