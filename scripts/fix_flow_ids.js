const fs = require('fs');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Fix duplicate flow card IDs by adding driver prefix
const fixFlowCards = (cards) => {
  if (!cards) return;
  
  const seenIds = new Set();
  const genericIds = ['turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_dim'];
  
  for (const card of cards) {
    // Check if this is a generic ID that needs prefixing
    if (genericIds.includes(card.id)) {
      // Extract driver from filter
      const driverFilter = card.args?.find(arg => arg.filter)?.filter;
      if (driverFilter) {
        const match = driverFilter.match(/driver_id=([a-z0-9_]+)/);
        if (match) {
          const driverId = match[1];
          const newId = `${driverId}_${card.id}`;
          
          console.log(`Renaming: ${card.id} -> ${newId}`);
          card.id = newId;
        }
      }
    }
    
    // Check for actual duplicates
    if (seenIds.has(card.id)) {
      console.error(`ERROR: Duplicate ID found: ${card.id}`);
    }
    seenIds.add(card.id);
  }
};

// Fix all flow card types
if (appJson.flow) {
  console.log('Fixing triggers...');
  fixFlowCards(appJson.flow.triggers);
  
  console.log('Fixing conditions...');
  fixFlowCards(appJson.flow.conditions);
  
  console.log('Fixing actions...');
  fixFlowCards(appJson.flow.actions);
}

// Write back
fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
console.log('\nDone! app.json has been fixed.');
