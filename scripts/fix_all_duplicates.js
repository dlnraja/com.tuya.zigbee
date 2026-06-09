const fs = require('fs');

let content = fs.readFileSync('app.json', 'utf8');
const appJson = JSON.parse(content);

if (!appJson.flow) {
  console.log('No flow section found');
  process.exit(0);
}

const processCards = (cards, type) => {
  if (!cards || !Array.isArray(cards)) return;
  
  console.log(`\nProcessing ${cards.length} ${type}...`);
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const originalId = card.id;
    
    // Find driver from args filter
    let driverId = null;
    if (card.args && Array.isArray(card.args)) {
      for (const arg of card.args) {
        if (arg.filter && typeof arg.filter === 'string') {
          const match = arg.filter.match(/driver_id=([a-z0-9_-]+)/);
          if (match) {
            driverId = match[1];
            break;
          }
        }
      }
    }
    
    // If we found a driver and the ID doesn't already start with it
    if (driverId && !card.id.startsWith(driverId + '_')) {
      card.id = `${driverId}_${card.id}`;
      console.log(`  ${originalId} -> ${card.id}`);
    }
  }
};

processCards(appJson.flow.triggers, 'triggers');
processCards(appJson.flow.conditions, 'conditions');
processCards(appJson.flow.actions, 'actions');

// Write back with proper formatting
fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
console.log('\n✅ Done!');
